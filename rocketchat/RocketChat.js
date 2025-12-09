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
            displayName: localParticipant.name,
            position: null
        };
        this.cmeetToken = null;

        document.addEventListener('rocketChatRoomIdUpdated', event => {
            const newRoomId = event.detail.roomId;

            this.updateRoomId(newRoomId);
        });
    }

    async loginToRocketChat(token) {
        try {
            if (token) {
                const decodedToken = Utils.decodeToken(token);
                const cmeetToken = decodedToken?.context?.token;

                if (cmeetToken) {
                    this.cmeetToken = cmeetToken;
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
                    this.userContext.username = decodedToken?.context?.user?.name;

                    try {
                        await this.getMeetingPosition();
                    } catch (error) {
                        logger.error('Failed to fetch meeting position', error);
                    }

                    logger.log('Rocket.Chat login successful as user');

                    return true;
                }
            }

            this.rocketChatUserId = this.config.botUserId;
            this.rocketChatAuthToken = this.config.botToken;
            this.rocketChatType = ROCKET_CHAT_USER_TYPES.BOT;
            this.userContext.position = 'Thư ký';

            logger.log('Rocket.Chat login successful as bot');

            return true;
        } catch (error) {
            logger.error('Rocket.Chat login failed', error);

            this.rocketChatUserId = this.config.botUserId;
            this.rocketChatAuthToken = this.config.botToken;
            this.rocketChatType = ROCKET_CHAT_USER_TYPES.BOT;
            this.userContext.position = 'Thư ký';

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

            const data = res;

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

    connectCMeetRoomWatcher() {
        this.wsManager.connectCMeet(this.cmeetMeetingId);
    }

    setRocketChatRoomId(roomId) {
        this.rocketChatRoomId = roomId;
    }

    updateRoomId(newRoomId) {
        if (!newRoomId || newRoomId === this.rocketChatRoomId) {
            return;
        }

        logger.log(`[Rocket.Chat] Updating roomId from ${this.rocketChatRoomId} → ${newRoomId}`);

        this.rocketChatRoomId = newRoomId;

        // Reconnect WS RocketChat với roomId mới
        this.wsManager.reconnectRocketChatWithNewRoom(
            this.store,
            this.rocketChatAuthToken,
            newRoomId,
            this.userContext?.username
        );
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

            if (!this.rocketChatRoomId) {
                logger.error('Cannot send message: Rocket.Chat room ID is not set');

                return;
            }

            // Kiểm tra và lấy position nếu chưa có
            if (!this.userContext?.position) {
                try {
                    await this.getMeetingPosition();
                } catch (error) {
                    logger.error('Failed to fetch meeting position before sending message', error);
                }
            }

            const position = this.userContext?.position || 'Không có chức danh';

            // Kiểm tra WebSocket đã kết nối chưa
            const ws = this.wsManager.wsRocketChat;

            if (!ws || ws.readyState !== WebSocket.OPEN) {
                logger.error('Cannot send message: WebSocket is not connected');

                return;
            }

            // Tạo params cho sendMessage method
            const params = {
                rid: this.rocketChatRoomId,
                msg: message,
                position
            };

            // Thêm customFields nếu cần
            params.customFields = {
                participantId: this.localParticipant.id,
                fromJitsi: true
            };

            // Nếu là bot và có username, thêm alias
            if (this.rocketChatType === ROCKET_CHAT_USER_TYPES.BOT && this.userContext?.username) {
                params.alias = this.userContext.username;
                params.position = 'Thư ký';
            }

            // Gửi message qua WebSocket
            const wsMessage = {
                msg: 'method',
                method: 'sendMessage',
                id: '423',
                params: [ params ]
            };

            ws.send(JSON.stringify(wsMessage));
        } catch (error) {
            logger.error('Failed to send message to Rocket.Chat:', error);
        }
    }

    async getMeetingPosition() {
        const url = `${this.config.endpoints.getMeetingPosition}/${this.cmeetMeetingId}`;
        const res = await Utils.makeRequest('GET', url, null, {
            'Authorization': `Bearer ${this.cmeetToken}`
        });

        if (res?.data) {
            this.userContext.position = res.data.position ? res.data.position : res.data;
            logger.log('Fetched meeting position:', this.userContext.position);
        } else {
            logger.error('Failed to get meeting position', res);
        }
    }

    destroy() {
        this.wsManager.destroy();
        logger.log('Rocket.Chat module destroyed');
    }
}
