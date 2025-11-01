/* eslint-disable max-len */
/* eslint-disable require-jsdoc */

import { ROCKET_CHAT_CONFIG } from './config.js';
import { WebSocketConnectionManager } from './connection';
import { ROCKET_CHAT_USER_TYPES } from './types.js';
import { Utils } from './utils.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat');

export class RocketChat {
    constructor(store, meetingId, localParticipant) {
        this.store = store;
        this.config = ROCKET_CHAT_CONFIG;
        this.wsManager = new WebSocketConnectionManager();
        this.rocketChatUserId = null;
        this.rocketChatAuthToken = null;
        this.rocketChatType = null;
        this.rocketChatRoomId = null;
        this.cmeetMeetingId = meetingId;
        this.localParticipant = localParticipant;
        this.isChatDisabled = false;
        this.userContext = {
            username: localParticipant.name,
            userId: localParticipant.id,
            displayName: localParticipant.name
        };
    }

    async loginToRocketChat(token) {
        try {
            const decodedToken = Utils.decodeToken(token);
            const cmeetToken = decodedToken?.context?.token;

            if (cmeetToken) {
                const url = this.config.endpoints.login;
                const data = await Utils.makeRequest('POST', url, {
                    serviceName: 'keycloak',
                    accessToken: cmeetToken,
                    expiresIn: 24 * 60 * 60
                });

                if (!data || !data.data || !data.data.userId || !data.data.authToken) {
                    logger.warn('Invalid response from Rocket.Chat login', data);

                    return false;
                }

                this.rocketChatUserId = data.data.userId;
                this.rocketChatAuthToken = data.data.authToken;
                this.rocketChatType = ROCKET_CHAT_USER_TYPES.USER;
                this.userContext = {
                    username: decodedToken?.context?.user?.name
                };

                logger.log('Rocket.Chat login successful as user');

                return true;
            }

            this.rocketChatUserId = this.config.botUserId;
            this.rocketChatAuthToken = this.config.botToken;
            this.rocketChatType = ROCKET_CHAT_USER_TYPES.BOT;

            logger.log('Rocket.Chat login successful as bot');

            return true;
        } catch (error) {
            logger.error('Rocket.Chat login failed', error);

            this.rocketChatUserId = this.config.botUserId;
            this.rocketChatAuthToken = this.config.botToken;
            this.rocketChatType = ROCKET_CHAT_USER_TYPES.BOT;

            return false;
        }
    }

    async getRocketChatRoomId() {
        try {
            if (!this.cmeetMeetingId) {
                return null;
            }

            const url = `${this.config.endpoints.getRoomId}/${this.cmeetMeetingId}`;
            const res = await Utils.makeRequest('GET', url);

            return res?.data || null;
        } catch (error) {
            logger.error('Failed to get Rocket.Chat room ID', error);

            return null;
        }
    }

    async checkUserInRocketChatRoom() {
        if (!this.rocketChatRoomId) {
            return false;
        }

        if (this.rocketChatType === ROCKET_CHAT_USER_TYPES.BOT) {
            return false;
        }

        const isUserInRocketChatRoom = async () => {
            const url = `${this.config.endpoints.roomMembers}?roomId=${this.rocketChatRoomId}`;
            const res = await Utils.makeRequest('GET', url, null, {
                'X-User-Id': this.rocketChatUserId,
                'X-Auth-Token': this.rocketChatAuthToken
            });

            if (!res.success) {
                logger.error('Failed to check user in Rocket Chat room: ', res);

                return false;
            }

            const data = await res.json();

            if (data && data.members && Array.isArray(data.members)) {
                logger.log('Current username:', this.userContext.username);
                for (const member of data.members) {
                    logger.log('Member:', member);
                    if (member.username === this.userContext.username) {
                        return true;
                    }
                }
            } else {
                logger.warn('Invalid response from Rocket Chat room members: ', data);
            }

            logger.log('User not found in Rocket Chat room');

            return false;
        };

        if (!await isUserInRocketChatRoom()) {
            this.rocketChatAuthToken = this.config.botToken;
            this.rocketChatUserId = this.config.botUserId;
            this.rocketChatType = ROCKET_CHAT_USER_TYPES.BOT;
        }
    }

    connectWebSocket() {
        this.wsManager.connectRocketChat(this.store, this.rocketChatAuthToken, this.rocketChatRoomId, this.userContext?.username);
        this.wsManager.connectCMeet(this.cmeetMeetingId);
    }

    setRocketChatRoomId(roomId) {
        this.rocketChatRoomId = roomId;
    }

    async loadchat(offset = 0, limit = 30, deliverMessage) {
        const url = `${this.config.endpoints.roomHistory}?roomId=${this.rocketChatRoomId}&offset=${offset}&limit=${limit}`;
        const res = await Utils.makeRequest('GET', url, null, {
            'X-User-Id': this.rocketChatUserId,
            'X-Auth-Token': this.rocketChatAuthToken
        });

        if (res?.messages?.length) {
            res.messages.reverse().forEach(message => {
                if (message.msg) {
                    deliverMessage(Utils.formatMessage(message, this.userContext?.username));
                }
            });

            logger.log(`Loaded ${res.messages.length} messages from Rocket.Chat`);
        }
    }

    async sendMessage(message) {
        try {
            if (!message?.trim()) {
                return;
            }

            const baseBody = {
                roomId: `#${this.rocketChatRoomId}`,
                text: message,
                customFields: {
                    participantId: this.localParticipant.id,
                    fromJitsi: true
                }
            };

            if (this.rocketChatType === ROCKET_CHAT_USER_TYPES.BOT && this.userContext?.username) {
                baseBody.alias = this.userContext.username;
            }

            const url = `${this.config.endpoints.postMessage}`;

            const res = await Utils.makeRequest('POST', url, baseBody, {
                'X-User-Id': this.rocketChatUserId,
                'X-Auth-Token': this.rocketChatAuthToken
            });

            logger.log(`Sent message to Rocket.Chat: ${res.message._id}`);

            return res.message._id;
        } catch (error) {
            logger.error('Failed to send message to Rocket.Chat:', error);
        }
    }

    destroy() {
        this.wsManager.destroy();
        logger.log('Rocket.Chat module destroyed');
    }
}
