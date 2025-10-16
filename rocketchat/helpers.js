/* eslint-disable no-empty-function */
import Logger from '@jitsi/logger';

import { getLocalParticipant } from '../react/features/base/participants/functions';
import { addMessage } from '../react/features/chat/actions.any';

import { ErrorHandler } from './errors.js';
import { WS_COLLECTIONS, WS_MESSAGE_TYPES } from './types/types.js';

const logger = Logger.getLogger(__filename);

/**
 * Helper functions for Rocket.Chat integration
 */
export const Helpers = {
    /**
     * Setup WebSocket connection with reconnection logic
     */
    setupWebSocket(url, options = {}) {
        const {
            onOpen = () => {},
            onMessage = () => {},
            onClose = () => {},
            onError = () => {},
            maxReconnectAttempts = 5,
            reconnectDelay = 10000
        } = options;

        let reconnectAttempts = 0;
        let ws = null;

        const connect = () => {
            try {
                ws = new WebSocket(url);

                ws.onopen = () => {
                    logger.info('WebSocket connected');
                    reconnectAttempts = 0;
                    onOpen();
                };

                ws.onmessage = event => {
                    try {
                        onMessage(event.data);
                    } catch (error) {
                        ErrorHandler.handleWebSocketError(error, 'WebSocket onmessage');
                        onError(error);
                    }
                };

                ws.onclose = () => {
                    logger.warn('WebSocket disconnected');
                    onClose();

                    // Handle reconnection
                    if (reconnectAttempts < maxReconnectAttempts) {
                        reconnectAttempts++;
                        logger.info(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
                        setTimeout(() => {
                            connect();
                        }, reconnectDelay);
                    } else {
                        logger.error('Max reconnection attempts reached');
                    }
                };

                ws.onerror = error => {
                    ErrorHandler.handleWebSocketError(error, 'WebSocket onerror');
                    onError(error);
                };
            } catch (error) {
                ErrorHandler.handleWebSocketError(error, 'WebSocket creation');
                onError(error);
            }
        };

        const send = message => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));

                return true;
            }
            logger.warn('WebSocket not connected, cannot send message');

            return false;
        };

        const close = () => {
            if (ws) {
                ws.close();
                ws = null;
            }
        };

        // Start initial connection
        connect();

        return {
            send,
            close,
            reconnect: connect,
            isConnected: () => ws && ws.readyState === WebSocket.OPEN
        };
    },

    /**
     * Setup STOMP WebSocket connection for C-Meet
     */
    setupStompWebSocket(url, options = {}) {
        const {
            onConnect = () => {},
            onError = () => {}
        } = options;

        // Import STOMP dynamically to avoid browser compatibility issues
        let Stomp = null;
        let SockJS = null;

        const init = () => ErrorHandler.wrapAsync(async () => {
            const [ StompModule, SockJSModule ] = await Promise.all([
                import('stompjs'),
                import('sockjs-client')
            ]);

            Stomp = StompModule.default;
            SockJS = SockJSModule.default;

            const socket = new SockJS(`${url}/ws`);
            const stompClient = Stomp.over(socket);

            stompClient.connect({}, () => {
                logger.info('STOMP WebSocket connected');
                onConnect(stompClient);
            }, error => {
                ErrorHandler.handleWebSocketError(error, 'STOMP connection');
                onError(error);
            });

            return stompClient;
        }, 'STOMP setup');

        return { init };
    },

    /**
     * Authenticate WebSocket connection
     */
    authenticateWebSocket(sendFunction, authToken, roomId) {
        if (!sendFunction || !authToken) {
            logger.warn('Cannot authenticate: WebSocket not connected or no auth token');

            return false;
        }

        try {
            // Send connect message
            sendFunction({
                msg: WS_MESSAGE_TYPES.CONNECT,
                version: '1',
                support: [ '1' ]
            });

            // Send login message
            sendFunction({
                msg: WS_MESSAGE_TYPES.METHOD,
                method: 'login',
                id: 'login-1',
                params: [ { resume: authToken } ]
            });

            // Subscribe to room messages
            sendFunction({
                msg: WS_MESSAGE_TYPES.SUB,
                id: 'sub-1',
                name: WS_COLLECTIONS.STREAM_ROOM_MESSAGES,
                params: [ roomId, false ]
            });

            logger.info('WebSocket authentication sent');

            return true;
        } catch (error) {
            logger.error('Failed to authenticate WebSocket:', error);

            return false;
        }
    },

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data, handlers = {}) {
        try {
            const message = JSON.parse(data);

            logger.debug('WebSocket message received:', message);

            const {
                onPing = () => {},
                onLoginResult = () => {},
                onRoomMessage = () => {},
                onUnknown = () => {}
            } = handlers;

            // Handle ping/pong
            if (message.msg === WS_MESSAGE_TYPES.PING) {
                onPing();

                return;
            }

            // Handle login result
            if (message.msg === WS_MESSAGE_TYPES.RESULT && message.id === 'login-1') {
                logger.info('WebSocket login successful');
                onLoginResult(message);

                return;
            }

            // Handle room messages
            if (message.msg === WS_MESSAGE_TYPES.CHANGED
                && message.collection === WS_COLLECTIONS.STREAM_ROOM_MESSAGES) {
                onRoomMessage(message);

                return;
            }

            logger.debug('Unhandled WebSocket message type:', message.msg);
            onUnknown(message);
        } catch (error) {
            ErrorHandler.handleWebSocketError(error, 'WebSocket message parsing');
        }
    },

    /**
     * Extract user context from Redux store
     */
    extractUserContext(store) {
        if (!store) {
            return null;
        }

        try {
            const state = store.getState();
            const localParticipant = getLocalParticipant(state);

            if (localParticipant) {
                return {
                    name: localParticipant.name,
                    id: localParticipant.id,
                    meetingId: state['features/base/conference'].conference?.roomName
                };
            }

            return null;
        } catch (error) {
            ErrorHandler.handle(error, 'extractUserContext');

            return null;
        }
    },

    /**
     * Add message to Redux store with duplicate prevention
     */
    addMessageToStore(store, message, shownMessages) {
        if (!store || !message.messageId || shownMessages.has(message.messageId)) {
            return false;
        }

        try {
            store.dispatch(addMessage(message));
            shownMessages.add(message.messageId);
            logger.debug('Message added to store:', message.messageId);

            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'addMessageToStore');

            return false;
        }
    },

    /**
     * Create message filter for duplicate prevention
     */
    createMessageFilter() {
        const shownMessages = new Set();

        return {
            add: messageId => shownMessages.add(messageId),
            has: messageId => shownMessages.has(messageId),
            clear: () => shownMessages.clear(),
            size: () => shownMessages.size
        };
    }
};
