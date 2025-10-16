/* eslint-disable require-jsdoc */
import Logger from '@jitsi/logger';

import { env } from '../ENV';

import { ConnectionError, ErrorHandler } from './errors.js';
import { Helpers } from './helpers.js';
import { DEFAULT_CONFIG, MESSAGE_TYPES } from './types/types.js';
import { Utils } from './utils.js';

const logger = Logger.getLogger(__filename);

export class RocketChat {
    /**
     * Constructor
     */
    constructor() {
        this.config = this.initializeConfig();
        this.isInitialized = false;

        // Core state
        this.rocketChatRoomId = null;
        this.cmeetMeetingId = null;
        this.store = null;

        // Authentication
        this.userId = null;
        this.authToken = null;

        // WebSocket connections
        this.rocketChatWs = null;
        this.cmeetStomp = null;
        this.isConnected = false;

        // Message handling
        this.messageFilter = Helpers.createMessageFilter();
        this.userContext = null;

        logger.info('Rocket.Chat module initialized');
    }

    /**
     * Initialize configuration
     */
    initializeConfig() {
        return {
            ...DEFAULT_CONFIG,
            apiUrl: env.ROCKET_CHAT_API_URL,
            wsUrl: env.ROCKET_CHAT_WS_URL,
            cmeetApiUrl: env.CMEET_URL,
            cmeetWsUrl: env.CMEET_WS_URL,
            botUserId: env.ROCKET_CHAT_USER_ID,
            botToken: env.ROCKET_CHAT_TOKEN
        };
    }

    /**
     * Initialize Rocket.Chat integration
     */
    initialize(store, cmeetMeetingId, rocketChatRoomId = null) {
        return ErrorHandler.wrapAsync(async () => {
            logger.info('Initializing Rocket.Chat integration...');

            this.store = store;
            this.cmeetMeetingId = cmeetMeetingId;

            // Extract user context
            this.userContext = Helpers.extractUserContext(store);

            // Get Rocket.Chat room ID from C-Meet if not provided
            if (rocketChatRoomId) {
                this.rocketChatRoomId = rocketChatRoomId;
            } else {
                const roomIdResult = await Utils.getRocketChatRoomId(this.config, cmeetMeetingId);

                if (!roomIdResult.success || !roomIdResult.data) {
                    logger.error('Failed to get Rocket.Chat room ID from C-Meet');

                    return false;
                }

                this.rocketChatRoomId = roomIdResult.data;
            }

            logger.info(`Using Rocket.Chat room ID: ${this.rocketChatRoomId}`);

            // Get access token
            const authResult = await this.getAccessToken();

            if (!authResult.success) {
                logger.error('Failed to get access token');

                return false;
            }

            // Check if user is in Rocket.Chat room
            const isUserInRoom = await Utils.checkUserInRocketChatRoom({
                config: this.config,
                userContext: this.userContext,
                rocketChatRoomId: this.rocketChatRoomId,
                authToken: this.authToken,
                userId: this.userId
            });

            if (!isUserInRoom.success || !isUserInRoom.data) {
                logger.warn('User not in Rocket.Chat room, switching to bot credentials');

                // Switch to bot credentials
                this.userId = this.config.botUserId;
                this.authToken = this.config.botToken;
            }

            // Setup WebSocket connections
            try {
                await this.setupConnections();
            } catch (connectionError) {
                logger.warn('Failed to setup WebSocket connections:', connectionError);
            }

            this.isInitialized = true;

            return true;
        }, 'initialize');
    }

    /**
     * Get access token from Rocket.Chat
     */
    async getAccessToken() {
        try {
            const result = await Utils.authenticate(this.config);

            if (result.success) {
                this.userId = result.userId;
                this.authToken = result.authToken;

                return { success: true };
            }

            return { success: false,
                error: result.error };
        } catch (error) {
            return ErrorHandler.handle(error, 'getAccessToken');
        }
    }

    /**
     * Setup WebSocket connections
     */
    setupConnections() {
        return ErrorHandler.wrapAsync(async () => {
            await this.setupRocketChatWebSocket();
            await this.setupCmeetWebSocket();
        }, 'setupConnections');
    }

    /**
     * Setup Rocket.Chat WebSocket connection
     */
    setupRocketChatWebSocket() {
        try {
            const wsUrl = `${this.config.wsUrl}/websocket`;

            this.rocketChatWs = Helpers.setupWebSocket(wsUrl, {
                onOpen: () => {
                    this.isConnected = true;
                    this.authenticateWebSocket();
                },
                onMessage: data => {
                    this.handleRocketChatMessage(data);
                },
                onClose: () => {
                    this.isConnected = false;
                },
                onError: error => {
                    ErrorHandler.handleWebSocketError(error, 'Rocket.Chat WebSocket');
                }
            });

            logger.info('Rocket.Chat WebSocket setup completed');
        } catch (error) {
            ErrorHandler.handleConnectionError(error, 'Rocket.Chat WebSocket setup');
            throw new ConnectionError(
                `Rocket.Chat WebSocket setup failed: ${error.message}`,
                error
            );
        }
    }

    /**
     * Setup C-Meet WebSocket connection
     */
    setupCmeetWebSocket() {
        return ErrorHandler.wrapAsync(async () => {
            const stompSetup = Helpers.setupStompWebSocket(this.config.cmeetWsUrl, {
                onConnect: stompClient => {
                    this.cmeetStomp = stompClient;

                    // Subscribe to chat messages
                    stompClient.subscribe('/topic/chat', message => {
                        try {
                            const chatMessage = JSON.parse(message.body);

                            this.handleCmeetMessage(chatMessage);
                        } catch (error) {
                            ErrorHandler.handleWebSocketError(error, 'C-Meet message parsing');
                        }
                    });
                },
                onError: error => {
                    ErrorHandler.handleWebSocketError(error, 'C-Meet WebSocket connection');
                }
            });

            this.cmeetStomp = await stompSetup.init();
            logger.info('C-Meet WebSocket setup completed');
        }, 'setupCmeetWebSocket');
    }

    /**
     * Authenticate WebSocket connection
     */
    authenticateWebSocket() {
        if (!this.rocketChatWs || !this.authToken) {
            logger.warn('Cannot authenticate: WebSocket or auth token not available');

            return false;
        }

        return Helpers.authenticateWebSocket(
            this.rocketChatWs.send.bind(this.rocketChatWs),
            this.authToken,
            this.rocketChatRoomId
        );
    }

    /**
     * Handle Rocket.Chat WebSocket messages
     */
    handleRocketChatMessage(data) {
        Helpers.handleWebSocketMessage(data, {
            onPing: () => {
                this.rocketChatWs.send({ msg: 'pong' });
            },
            onRoomMessage: message => {
                this.handleRoomMessage(message);
            }
        });
    }

    /**
     * Handle room message from Rocket.Chat
     */
    handleRoomMessage(message) {
        try {
            if (message.fields && message.fields.eventName && message.fields.args) {
                const args = message.fields.args;
                const msg = args[0];

                if (msg && Utils.isValidRocketChatMessage(msg)) {
                    const formattedMessage = Utils.formatMessage(
                        msg,
                        this.userContext?.name
                    );

                    this.updateNewMessage(formattedMessage);
                }
            }
        } catch (error) {
            ErrorHandler.handleWebSocketError(error, 'handleRoomMessage');
        }
    }

    /**
     * Handle C-Meet message
     */
    handleCmeetMessage(chatMessage) {
        try {
            if (chatMessage && chatMessage.messageId) {
                const formattedMessage = {
                    displayName: chatMessage.displayName || 'Anonymous User',
                    participantId: chatMessage.participantId || 'unknown',
                    messageId: `cmeet_${chatMessage.messageId}`,
                    messageType: MESSAGE_TYPES.REMOTE,
                    message: chatMessage.message || '',
                    timestamp: chatMessage.timestamp || Date.now(),
                    error: false,
                    isReaction: false,
                    reactions: new Map(),
                    privateMessage: false,
                    lobbyChat: false,
                    recipient: undefined,
                    hasRead: true
                };

                this.updateNewMessage(formattedMessage);
            }
        } catch (error) {
            ErrorHandler.handleWebSocketError(error, 'handleCmeetMessage');
        }
    }

    /**
     * Update new message from WebSocket
     */
    updateNewMessage(message) {
        if (!this.store) {
            return;
        }

        const success = Helpers.addMessageToStore(
            this.store,
            message,
            this.messageFilter
        );

        if (success) {
            logger.debug('New message updated from WebSocket:', message.messageId);
        }
    }

    /**
     * Send message to Rocket.Chat
     */
    sendMessage(messageText) {
        if (!this.isInitialized || !this.rocketChatRoomId) {
            logger.warn('Rocket.Chat not initialized or room ID not set');

            return false;
        }

        return ErrorHandler.wrapAsync(async () => {
            const response = await Utils.makeRequest(
                'POST',
                `${this.config.apiUrl}${this.config.endpoints.postMessage}`,
                {
                    channel: this.rocketChatRoomId,
                    text: messageText,
                    alias: this.userContext?.name || 'Jitsi User',
                    customFields: {
                        participantId: this.userContext?.id,
                        fromJitsi: true
                    }
                },
                {
                    'X-User-Id': this.userId,
                    'X-Auth-Token': this.authToken
                }
            );

            if (response && response.success) {
                logger.info('Message sent to Rocket.Chat successfully');

                return true;
            }

            logger.error('Failed to send message to Rocket.Chat:', response);

            return false;
        }, 'sendMessage');
    }

    /**
     * Load chat from Rocket.Chat history
     */
    loadChat(offset = 0, limit = 30) {
        if (!this.isInitialized || !this.rocketChatRoomId) {
            logger.warn('Rocket.Chat not initialized or room ID not set');

            return;
        }

        return ErrorHandler.wrapAsync(async () => {
            const response = await Utils.makeRequest(
                'GET',
                `${this.config.apiUrl}${this.config.endpoints.roomHistory}
                    ?roomId=${this.rocketChatRoomId}&count=${limit}&offset=${offset}`,
                null,
                {
                    'X-User-Id': this.userId,
                    'X-Auth-Token': this.authToken
                }
            );

            if (response && response.messages) {
                const messages = response.messages
                    .filter(msg => Utils.isValidRocketChatMessage(msg))
                    .map(msg => Utils.formatMessage(msg, this.userContext?.name))
                    .reverse(); // Show oldest first

                messages.forEach(message => {
                    Helpers.addMessageToStore(this.store, message, this.messageFilter);
                });

                logger.info(`Loaded ${messages.length} messages from Rocket.Chat history`);
            }
        }, 'loadChat');
    }

    /**
     * Set room context
     */
    setContext(rocketChatRoomId, cmeetMeetingId) {
        this.rocketChatRoomId = rocketChatRoomId;
        this.cmeetMeetingId = cmeetMeetingId;
    }

    /**
     * Cleanup and destroy connections
     */
    destroy() {
        try {
            if (this.rocketChatWs) {
                this.rocketChatWs.close();
                this.rocketChatWs = null;
            }

            if (this.cmeetStomp) {
                this.cmeetStomp.disconnect();
                this.cmeetStomp = null;
            }

            this.isInitialized = false;
            this.isConnected = false;
            this.messageFilter.clear();

            logger.info('Rocket.Chat integration destroyed');
        } catch (error) {
            ErrorHandler.handle(error, 'destroy');
        }
    }
}

// Create singleton instance
const rocketChatInstance = new RocketChat();

export async function syncRocketChatMessages(offset = 0, limit = 30) {
    try {
        return await rocketChatInstance.loadChat(offset, limit);
    } catch (error) {
        logger.warn('Failed to sync Rocket.Chat messages:', error);

        return false;
    }
}

export function setRoomIdOnChange(rocketChatRoomId) {
    rocketChatInstance.setContext(rocketChatRoomId, rocketChatInstance.cmeetMeetingId);
}

export async function startConference(store, cmeetMeetingId, rocketChatRoomId = null) {
    try {
        return await rocketChatInstance.initialize(store, cmeetMeetingId, rocketChatRoomId);
    } catch (error) {
        logger.warn('Failed to start Rocket.Chat conference:', error);

        return false;
    }
}

export async function sendMessageToRocketChat(messageText) {
    try {
        return await rocketChatInstance.sendMessage(messageText);
    } catch (error) {
        logger.warn('Failed to send message to Rocket.Chat:', error);

        return false;
    }
}

export default rocketChatInstance;
