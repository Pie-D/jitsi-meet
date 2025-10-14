/* eslint-disable max-len */
/* eslint-disable require-jsdoc */

import { ROCKET_CHAT_CONFIG } from './config.js';
import { WebSocketConnectionManager } from './connection';
import { Helpers } from './helpers.js';
import { ROCKET_CHAT_USER_TYPES } from './types.js';
import { Utils } from './utils.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat');

export class RocketChat {
    constructor(store, meetingId) {
        this.store = store;
        this.config = ROCKET_CHAT_CONFIG;
        this.wsManager = new WebSocketConnectionManager();
        this.messageFilter = Helpers.createMessageFilter();
        this.rocketChatUserId = null;
        this.rocketChatAuthToken = null;
        this.rocketChatType = null;
        this.rocketChatRoomId = null;
        this.cmeetMeetingId = meetingId;
        this.isChatDisabled = false;
    }

    async loginToRocketChat(xmpp) {
        try {
            this.xmpp = xmpp;
            const token = this.xmpp.token;

            if (token) {
                this.tokenCmeet = Utils.decodeToken(token)?.context?.token;
                logger.log('C-Meet Token:', this.tokenCmeet);

                const url = this.config.endpoints.login;
                const data = await Utils.makeRequest('POST', url, {
                    serviceName: 'keycloak',
                    accessToken: token,
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
                    username: this.tokenCmeet?.context?.user?.name
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

            if (!res.ok) {
                logger.error('Failed to get Rocket.Chat room ID', res);

                return null;
            }

            const data = await res.json();

            return data?.data || null;
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
            let username = this.xmpp.participantId;

            if (this.xmpp.displayName && this.xmpp.displayName !== 'Unknown') {
                username = this.xmpp.displayName;
            } else if (this.userContext?.username) {
                username = this.userContext.username;
            }

            const url = `${this.config.endpoints.roomMembers}?roomId=${this.rocketChatRoomId}`;
            const res = await Utils.makeRequest('GET', url, null, {
                'X-User-Id': this.rocketChatUserId,
                'X-Auth-Token': this.rocketChatAuthToken
            });

            if (!res.ok) {
                logger.error('Failed to check user in Rocket Chat room: ', res);

                return false;
            }

            const data = await res.json();

            if (data && data.members && Array.isArray(data.members)) {
                for (const member of data.members) {
                    if (member.username === username) {
                        return true;
                    }
                }
            } else {
                logger.warn('Invalid response from Rocket Chat room members: ', data);
            }

            logger.log('User not found in Rocket Chat room');

            return false;
        };

        if (await isUserInRocketChatRoom()) {
            this.rocketChatAuthToken = this.config.botToken;
            this.rocketChatUserId = this.config.botUserId;
            this.rocketChatType = ROCKET_CHAT_USER_TYPES.BOT;
        }
    }

    connectWebSocket() {
        this.wsManager.connectRocketChat(this.store, this.rocketChatAuthToken, this.rocketChatRoomId, this.userContext?.localParticipantName);
        this.wsManager.connectCMeet(this.cmeetMeetingId);
    }

    setRocketChatRoomId(roomId) {
        this.rocketChatRoomId = roomId;
    }

    async loadchat(offset = 0, limit = 30) {
        const url = `${this.config.endpoints.roomHistory}?roomId=${this.rocketChatRoomId}&offset=${offset}&limit=${limit}`;
        const res = await Utils.makeRequest('GET', url, null, {
            'X-User-Id': this.userContext?.userId || this.config.botUserId,
            'X-Auth-Token': this.userContext?.token || this.config.botToken
        });

        if (res?.messages?.length) {
            res.messages.reverse().forEach(msg => {
                if (Utils.isValidRocketChatMessage(msg)) {
                    Helpers.addMessageToStore(this.store, Utils.formatMessage(msg, this.userContext.name), this.messageFilter);
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
                    participantId: this.userContext?.participantId,
                    fromJitsi: true
                }
            };

            if (this.userType === ROCKET_CHAT_USER_TYPES.BOT && this.userContext?.displayName) {
                baseBody.alias = this.userContext.displayName;
            }

            const url = `${this.config.endpoints.postMessage}`;

            await Utils.makeRequest('POST', url, baseBody, {
                'Content-Type': 'application/json',
                'X-User-Id': this.userContext?.userId || this.config.botUserId,
                'X-Auth-Token': this.userContext?.token || this.config.botToken
            });

            logger.log(`Sent message to Rocket.Chat: ${message}`);
        } catch (error) {
            logger.error('Failed to send message to Rocket.Chat:', error);
        }
    }

    destroy() {
        this.messageFilter.clear();
        this.wsManager.destroy();
        logger.log('Rocket.Chat module destroyed');
    }
}
