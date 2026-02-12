import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { addMessage, deleteMessage, editMessage } from '../react/features/chat/actions.any';

import { ROCKET_CHAT_CONFIG } from './config';
import { RocketChatEventEmitter } from './events';
import { Utils } from './utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat:Socket');

export class SocketManager {
    constructor() {
        if (SocketManager.instance) {
            return SocketManager.instance;
        }

        this.wsRocketChat = null;
        this.wsCMeet = null;

        SocketManager.instance = this;
    }

    /**
     * Connects to Rocket.Chat WebSocket.
     * @param {Object} store - The Redux store.
     * @param {string} authToken - The authentication token.
     * @param {string} roomId - The Rocket.Chat room ID.
     * @param {string} localParticipantName - The local participant's name.
     */
    connectRocketChat(store, authToken, roomId, localParticipantName) {
        if (this.wsRocketChat) {
            this.wsRocketChat.close();
        }

        const ws = new WebSocket(ROCKET_CHAT_CONFIG.wsUrl);

        ws.onopen = () => {
            logger.log('[Rocket.Chat] Connected');

            ws.send(JSON.stringify({
                msg: 'connect',
                version: '1',
                support: ['1']
            }));

            ws.send(JSON.stringify({
                msg: 'method',
                method: 'login',
                id: 'login-1',
                params: [{ resume: authToken }]
            }));

            ws.send(JSON.stringify({
                msg: 'sub',
                id: 'sub-1',
                name: 'stream-room-messages',
                params: [roomId, false]
            }));

            // Subscribe to deleteMessage notifications
            ws.send(JSON.stringify({
                msg: 'sub',
                id: 'sub-2',
                name: 'stream-notify-room',
                params: [`${roomId}/deleteMessage`, false]
            }));
        };

        ws.onmessage = event => {
            this._handleRocketChatMessage(event.data, store, localParticipantName, ws);
        };

        ws.onerror = error => {
            logger.error('[Rocket.Chat] WebSocket error:', error);
        };

        ws.onclose = () => {
            logger.warn('[Rocket.Chat] Disconnected, retrying...');
            setTimeout(() => {
                this.connectRocketChat(store, authToken, roomId, localParticipantName);
            }, ROCKET_CHAT_CONFIG.wsConfig.reconnectDelay);
        };

        this.wsRocketChat = ws;

        return ws;
    }

    /**
     * Reconnects to Rocket.Chat with a new room ID.
     * @param {Object} store - The Redux store.
     * @param {string} authToken - The authentication token.
     * @param {string} newRoomId - The new room ID.
     * @param {string} username - The username.
     */
    reconnectRocketChatWithNewRoom(store, authToken, newRoomId, username) {
        if (this.wsRocketChat) {
            logger.log('[Rocket.Chat] Closing existing WS because roomId changed...');
            this.wsRocketChat.close();
        }

        this.connectRocketChat(store, authToken, newRoomId, username);
    }

    /**
     * Connects to C-Meet WebSocket (SockJS).
     * @param {string} meetingId - The meeting ID.
     */
    connectCMeet(meetingId) {
        const topic = `/topic/timesheet-rocketchat/${meetingId}`;
        const client = new Client({
            webSocketFactory: () => new SockJS(ROCKET_CHAT_CONFIG.cmeetWsUrl),
            reconnectDelay: ROCKET_CHAT_CONFIG.wsConfig.reconnectDelay,
            onConnect: () => {
                logger.log('[C-Meet] Connected to topic:', topic);

                client.subscribe(topic, msg => {
                    try {
                        const message = msg.body;

                        logger.debug('[C-Meet] Received:', message);

                        if (message === 'TIMESHEET_END') {
                            RocketChatEventEmitter.emit('timeSheetEnd', {
                                isChatDisabled: true
                            });
                        } else {
                            const data = JSON.parse(message);

                            if (data.rocketChatRoomId) {
                                logger.log('[C-Meet] RocketChat roomId updated:', data.rocketChatRoomId);
                                RocketChatEventEmitter.emit('timeSheetEnd', {
                                    isChatDisabled: false
                                });

                                RocketChatEventEmitter.emit('rocketChatRoomIdUpdated', {
                                    roomId: data.rocketChatRoomId
                                });
                            }
                        }
                    } catch (error) {
                        logger.error('[C-Meet] Error handling message:', error);
                    }
                });
            },
            onWebSocketError: err => logger.error('[C-Meet] WebSocket error:', err),
            onWebSocketClose: () => {
                logger.warn('[C-Meet] Disconnected, will retry...');
            }
        });

        this.wsCMeet = client;
        client.activate();
    }

    /**
     * Handles incoming Rocket.Chat messages.
     * @param {string} rawData - The raw message data.
     * @param {Object} store - The Redux store.
     * @param {string} localParticipantName - The local participant's name.
     * @param {WebSocket} client - The WebSocket client.
     */
    _handleRocketChatMessage(rawData, store, localParticipantName, client) {
        let msg;

        try {
            msg = JSON.parse(rawData);
        } catch (error) {
            logger.error('[Rocket.Chat] Invalid JSON message:', error);

            return;
        }

        switch (msg.msg) {
            case 'ping':
                client.send(JSON.stringify({ msg: 'pong' }));

                break;
            case 'result':
                if (msg.id === 'login-1') {
                    logger.log('WebSocket login successfully!');
                }

                break;
            case 'changed':
                if (msg.collection === 'stream-room-messages') {
                    const message = msg.fields.args[0];

                    // Xử lý tin nhắn bị xóa
                    if (message.t === 'rm') {
                        logger.log('[RocketChat] Deleting message:', message._id);
                        store.dispatch(deleteMessage(message._id));

                        return;
                    }

                    // ignore other system messages
                    if (message.t) {
                        return;
                    }

                    // Xử lý tin nhắn đến (bao gồm cả tin nhắn của chính mình để xác nhận)
                    const newMessage = Utils.formatMessage(message, localParticipantName);

                    const existingMessage = store.getState()['features/chat'].messages.find(m => {
                        if (m.messageId === newMessage.messageId) {
                            return true;
                        }
                        if (m.message === newMessage.message && m.participantId === newMessage.participantId) {
                            const timeDiff = Math.abs(m.timestamp - newMessage.timestamp);

                            if (timeDiff < 5000) {
                                return true;
                            }
                        }

                        return false;
                    });

                    if (existingMessage) {
                        const areReactionsEqual = (map1, map2) => {
                            if (map1.size !== map2.size) {
                                return false;
                            }
                            for (const [key, set1] of map1) {
                                const set2 = map2.get(key);

                                if (!set2 || set1.size !== set2.size) {
                                    return false;
                                }
                                for (const val of set1) {
                                    if (!set2.has(val)) {
                                        return false;
                                    }
                                }
                            }

                            return true;
                        };

                        if (!areReactionsEqual(newMessage.reactions, existingMessage.reactions)) {
                            logger.log('[RocketChat] Updating reactions for message:', newMessage.messageId);
                            store.dispatch(editMessage({
                                ...existingMessage,
                                reactions: newMessage.reactions,
                                isReaction: true,
                                hasRead: true
                            }));
                            console.log('[Phuc]: From RocketChat', existingMessage);
                        } else {
                            logger.debug('[RocketChat] Message exists with same reactions, skipping');
                        }

                        return;
                    }

                    // Dispatch new message
                    store.dispatch(addMessage({
                        ...newMessage,
                        hasRead: false
                    }));
                }

                // Nhận thông báo tin nhắn đã xóa từ stream-notify-room
                if (msg.collection === 'stream-notify-room') {
                    const eventName = msg.fields?.eventName;

                    if (eventName && eventName.endsWith('/deleteMessage')) {
                        const args = msg.fields.args;

                        if (args && args[0] && args[0]._id) {
                            const deletedMessageId = args[0]._id;

                            logger.log('[RocketChat] Received deleteMessage notification:', deletedMessageId);
                            store.dispatch(deleteMessage(deletedMessageId));
                        }
                    }
                }

                break;
            default:
                logger.debug('[Rocket.Chat] Unhandled message:', msg);

                break;
        }
    }

    /**
     * Destroys the connections.
     */
    destroy() {
        if (this.wsRocketChat && typeof this.wsRocketChat.close === 'function') {
            this.wsRocketChat.close();
        }
        if (this.wsCMeet && typeof this.wsCMeet.deactivate === 'function') {
            this.wsCMeet.deactivate().catch(e => logger.error('[C-Meet WS] deactivate failed', e));
        }
        this.wsRocketChat = null;
        this.wsCMeet = null;
    }
}
