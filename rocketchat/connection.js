import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { ROCKET_CHAT_CONFIG } from './config';
import { Helpers } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat:WS');

/* eslint-disable require-jsdoc */
export class WebSocketConnectionManager {
    constructor() {
        if (WebSocketConnectionManager.instance) {
            return WebSocketConnectionManager.instance;
        }

        this.wsRocketChat = null;
        this.wsCMeet = null;

        WebSocketConnectionManager.instance = this;
    }

    connectRocketChat(store, authToken, roomId, localParticipantName) {
        const client = new Client({
            webSocketFactory: () => new SockJS(ROCKET_CHAT_CONFIG.wsUrl),
            reconnectDelay: ROCKET_CHAT_CONFIG.wsConfig.reconnectDelay,
            onConnect: () => {
                logger.log('[Rocket.Chat] Connected');

                client.publish({ destination: '',
                    body: JSON.stringify({
                        msg: 'connect',
                        version: '1',
                        support: [ '1' ]
                    }) });

                client.publish({ destination: '',
                    body: JSON.stringify({
                        msg: 'method',
                        method: 'login',
                        id: 'login-1',
                        params: [ { resume: authToken } ]
                    }) });

                client.publish({ destination: '',
                    body: JSON.stringify({
                        msg: 'sub',
                        id: 'sub-1',
                        name: 'stream-room-messages',
                        params: [ roomId, false ]
                    }) });
            },
            onStompError: frame => {
                logger.error('[Rocket.Chat] STOMP error:', frame.headers.message);
            },
            onWebSocketError: error => {
                logger.error('[Rocket.Chat] WebSocket error:', error);
            },
            onWebSocketClose: () => {
                logger.warn('[Rocket.Chat] Disconnected, retrying...');
            }
        });

        client.onUnhandledMessage(message => {
            Helpers.handleRocketChatMessage(message.data, store, localParticipantName, client);
        });

        this.wsRocketChat = client;
        client.activate();
    }

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
                            document.dispatchEvent(new CustomEvent('timeSheetEnd', {
                                detail: { isChatDisabled: true }
                            }));
                        } else {
                            const data = JSON.parse(message);

                            if (data.rocketChatRoomId) {
                                document.dispatchEvent(new CustomEvent('timeSheetEnd', {
                                    detail: { isChatDisabled: false }
                                }));
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

    destroy() {
        this.wsRocketChat?.deactivate();
        this.wsCMeet?.deactivate();
    }
}
