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

    // Sử dụng WebSocket vì Rocket.Chat websocket url không tương thích với SockJS
    connectRocketChat(store, authToken, roomId, localParticipantName) {
        const ws = new WebSocket(ROCKET_CHAT_CONFIG.wsUrl);

        ws.onopen = () => {
            logger.log('[Rocket.Chat] Connected');

            ws.send(JSON.stringify({
                msg: 'connect',
                version: '1',
                support: [ '1' ]
            }));

            ws.send(JSON.stringify({
                msg: 'method',
                method: 'login',
                id: 'login-1',
                params: [ { resume: authToken } ]
            }));

            ws.send(JSON.stringify({
                msg: 'sub',
                id: 'sub-1',
                name: 'stream-room-messages',
                params: [ roomId, false ]
            }));
        };
        ws.onmessage = event => {
            Helpers.handleRocketChatMessage(event.data, store, localParticipantName, ws);
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
