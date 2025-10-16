import Logger from '@jitsi/logger';

import { APIError, AuthenticationError, ErrorHandler } from './errors.js';
import { DEFAULT_MESSAGE, MESSAGE_TYPES, TypeUtils } from './types/types.js';

const logger = Logger.getLogger(__filename);

/**
 * Utility functions for Rocket.Chat integration
 */
export const Utils = {
    /**
     * Make HTTP request with error handling
     */
    makeRequest(method, url, data = null, headers = {}) {
        return ErrorHandler.wrapAsync(async () => {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new APIError(`HTTP ${response.status}: ${response.statusText}`, {
                    status: response.status,
                    statusText: response.statusText,
                    url
                });
            }

            const result = await response.json();

            return result;
        }, 'makeRequest');
    },

    /**
     * Authenticate with Rocket.Chat API
     */
    authenticate(config) {
        return ErrorHandler.wrapAsync(async () => {
            logger.info('Authenticating with Rocket.Chat...');

            const response = await this.makeRequest('POST', `${config.apiUrl}${config.endpoints.login}`, {
                user: config.botUserId,
                password: config.botToken
            });

            if (response && response.data && response.data.authToken) {
                logger.info('Rocket.Chat authentication successful');

                return {
                    success: true,
                    userId: response.data.userId,
                    authToken: response.data.authToken
                };
            }

            throw new AuthenticationError('Invalid authentication response', response);
        }, 'authenticate');
    },

    /**
     * Get rocket chat room id from C-meet
     */
    getRocketChatRoomId(config, cmeetMeetingId) {
        return ErrorHandler.wrapAsync(async () => {
            const response = await fetch(`${config.cmeetApiUrl}/api/meeting-time-sheet/rocket-chat/${cmeetMeetingId}`, {
                method: 'GET'
            });

            if (!response.ok) {
                logger.error('Failed to get room id from cmeet:', response);

                return null;
            }

            const data = await response.json();

            logger.info('Rocket Chat room id:', data.data);

            return data?.data ?? null;
        }, 'getRocketChatRoomId');
    },

    /**
     * Check if the user is already in the Rocket Chat room
     */
    checkUserInRocketChatRoom(options) {
        return ErrorHandler.wrapAsync(async () => {
            const {
                config,
                userContext,
                rocketChatRoomId,
                authToken,
                userId,
                rocketChatType = 'u'
            } = options;

            if (rocketChatType === 'b') {
                logger.info('Using bot credentials, skipping user check');

                return true;
            }

            let username = null;

            // Try to get username from displayName first
            if (userContext?.name && userContext.name !== 'Unknown') {
                username = userContext.name;
                logger.info('Using displayName as username:', username);
            } else {
                // Fallback to participantId
                username = userContext?.id || 'unknown';
                logger.info('Using participantId as username:', username);
            }

            logger.info('User identification info:', {
                displayName: userContext?.name,
                participantId: userContext?.id,
                selectedUsername: username
            });

            const response = await fetch(`${config.apiUrl}/api/v1/groups.members?roomId=${rocketChatRoomId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Token': authToken,
                    'X-User-Id': userId
                }
            });

            if (!response.ok) {
                logger.error('Failed to check user in Rocket Chat room:', response);

                return false;
            }

            const data = await response.json();

            if (data && data.members && Array.isArray(data.members)) {
                logger.info('Room members received:', data.members.length);

                for (const member of data.members) {
                    logger.info('Comparing:', {
                        memberUsername: member.username,
                        ourUsername: username
                    });
                    if (member.username === username) {
                        logger.info('User found in Rocket Chat room');

                        return true;
                    }
                }
            } else {
                logger.warn('Invalid member data from Rocket Chat:', data);
            }

            logger.info('User not in Rocket Chat room');

            return false;
        }, 'checkUserInRocketChatRoom');
    },

    /**
     * Format Rocket.Chat message for Jitsi
     */
    formatMessage(msg, localParticipantName) {
        try {
            const isSystemMessage = msg.t === 'uj' || msg.t === 'ujt' || msg.t === 'au';
            const isLocalMessage = msg.u && msg.u.username === localParticipantName;
            const displayName = msg.alias || (msg.u && msg.u.name) || (msg.u && msg.u.username) || 'Anonymous User';
            const participantId = msg.customFields.participantId || (msg.u && msg.u.username) || 'unknown';

            // Convert reactions to Map<reaction, Set<usernames>>
            const reactions = new Map();

            if (msg.reactions) {
                Object.entries(msg.reactions).forEach(([ reaction, data ]) => {
                    reactions.set(reaction, new Set(data.usernames || []));
                });
            }

            return {
                displayName,
                error: false,
                participantId,
                isReaction: false,
                messageId: msg._id,
                messageType: isSystemMessage
                    ? MESSAGE_TYPES.SYSTEM : isLocalMessage ? MESSAGE_TYPES.LOCAL : MESSAGE_TYPES.REMOTE,
                message: msg.msg || 'No message content',
                reactions,
                privateMessage: false,
                lobbyChat: false,
                recipient: undefined,
                timestamp: typeof msg.ts === 'string'
                    ? new Date(msg.ts).getTime()
                    : msg.ts && msg.ts.$date ? new Date(msg.ts.$date).getTime() : Date.now(),
                hasRead: true
            };
        } catch (error) {
            logger.error('Failed to format message:', error);

            return {
                ...DEFAULT_MESSAGE,
                messageId: `error_${Date.now()}`,
                message: 'Failed to format message',
                error: true
            };
        }
    },

    /**
     * Validate Rocket.Chat message
     */
    isValidRocketChatMessage(msg) {
        return TypeUtils.isValidRocketChatMessage(msg);
    },

    /**
     * Validate formatted message
     */
    isValidFormattedMessage(msg) {
        return TypeUtils.isValidFormattedMessage(msg);
    },

    /**
     * Generate unique message ID
     */
    generateMessageId(prefix = 'msg') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36)
.substr(2, 9)}`;
    },

    /**
     * Parse timestamp from Rocket.Chat format
     */
    parseTimestamp(ts) {
        if (typeof ts === 'string') {
            return new Date(ts).getTime();
        }
        if (ts && ts.$date) {
            return new Date(ts.$date).getTime();
        }

        return Date.now();
    },

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        let timeout;

        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Retry function with exponential backoff
     */
    async retry(fn, maxAttempts = 3, delay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt === maxAttempts) {
                    throw error;
                }

                const waitTime = delay * Math.pow(2, attempt - 1);

                logger.warn(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`, error.message);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        throw lastError;
    }
};
