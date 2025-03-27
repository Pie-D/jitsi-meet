/* eslint-disable */
import Logger from '@jitsi/logger';

import {env} from './ENV';
import {PREPEND_MESSAGES} from './react/features/chat/actionTypes';
import {addMessage} from "./react/features/chat/actions.any";
import {getLocalParticipant} from "./react/features/base/participants/functions";

const logger = Logger.getLogger(__filename);

/**
 * Config for Rocket.Chat API
 */
const ROCKET_CHAT_CONFIG = {
    apiUrl: env.ROCKET_CHAT_API_URL,
    token: env.ROCKET_CHAT_TOKEN,
    userId: env.ROCKET_CHAT_USER_ID,
    wsUrl: env.ROCKET_CHAT_WS_URL
};

/**
 * Information of Conference
 */
const CONFERENCE_INFO = {
    store: null,
    roomId: null,
    localParticipantId: null,
    localParticipantName: null,
    meetingId: null,
}

/**
 * Fetch lịch sử tin nhắn từ Rocket.Chat
 *
 * @param {number} offset
 * @returns {Promise<Array>}
 */
async function fetchRocketChatHistory(offset = 0) {
    const shownMessages = CONFERENCE_INFO.store.getState()['features/chat'].shownMessages;

    return await fetch(
        `${ROCKET_CHAT_CONFIG.apiUrl}/groups.history?roomId=${encodeURIComponent(CONFERENCE_INFO.roomId)}&count=30&offset=${offset}`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': ROCKET_CHAT_CONFIG.token,
                'X-User-Id': ROCKET_CHAT_CONFIG.userId
            }
        }
    ).then(response => {
        if (!response.ok) {
            logger.error(`Failed to fetch Rocket.Chat history: ${response.statusText}`);
        }

        return response.json();
    }).then(data => {
        return (data.messages || [])
            .reverse()
            .filter(msg => {
                return !shownMessages.has(msg._id);
            })
            .map(msg => {
                return {
                    displayName: msg.alias || msg.u?.name || msg.u?.username || 'Anonymous User',
                    participantId: msg.u?.username === 'admin' ? 'system'
                        : msg.alias || msg.u?.username || msg.customFields?.participantId,
                    messageId: msg._id,
                    message: msg.msg || 'No message content',
                    messageType: msg.u?.username === 'admin' ? 'system'
                        : (msg.alias
                            ? msg.alias === CONFERENCE_INFO.localParticipantName
                            : msg.u?.username === CONFERENCE_INFO.localParticipantName)
                            ? 'local'
                            : 'remote',
                    privateMessage: false,
                    lobbyChat: false,
                    reactions: new Map(),
                    timestamp: new Date(msg.ts).getTime(),
                    isReaction: false
                };
            });
    }).catch(error => {
        logger.error('Error fetching Rocket.Chat history:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        throw error;
    });
}

/**
 * Sync tin nhắn từ Rocket.Chat
 */
export async function syncRocketChatMessages(offset = 0) {
    try {
        const messages = await fetchRocketChatHistory(offset);
        const {dispatch} = CONFERENCE_INFO.store;

        if (messages.length === 0) {
            logger.warn('No messages found in Rocket.Chat history');

            return;
        }

        dispatch({
            type: PREPEND_MESSAGES,
            messages: messages
        });

        logger.log(`Rocket.Chat messages synced successfully (offset: ${offset})`);
    } catch (error) {
        logger.error('Error syncing Rocket.Chat messages:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
    }
}

/**
 * Thiết lập và quản lý kết nối WebSocket để nhận tin nhắn theo thời gian thực từ Rocket.Chat
 *
 */
function setupRocketChatWebSocket() {
    const {dispatch} = CONFERENCE_INFO.store;
    const ws = new WebSocket(ROCKET_CHAT_CONFIG.wsUrl);

    ws.onopen = () => {
        logger.log('WebSocket connected to Rocket.Chat');

        ws.send(JSON.stringify({
            msg: 'connect',
            version: '1',
            support: ['1']
        }));

        ws.send(JSON.stringify({
            msg: 'method',
            method: 'login',
            id: 'login-1',
            params: [{resume: ROCKET_CHAT_CONFIG.token}]
        }));

        ws.send(JSON.stringify({
            msg: 'sub',
            id: '89494',
            name: 'stream-room-messages',
            params: [CONFERENCE_INFO.roomName, false]
        }));
    };

    ws.onmessage = event => {
        const data = JSON.parse(event.data);

        if (data.msg === 'changed' && data.collection === 'stream-room-messages') {
            const messageData = data.fields.args[0];
            const senderUsername = messageData.u?.username || '';
            const senderAlias = messageData.alias || '';

            if (!messageData.customFields?.fromJitsi
                && senderUsername !== CONFERENCE_INFO.localParticipantName
                && senderAlias !== CONFERENCE_INFO.localParticipantName) {
                const newMessage = {
                    displayName: messageData.alias || messageData.u?.name || messageData.u?.username || 'RocketChatUser',
                    participantId: messageData.u?.username === 'admin' ? 'system'
                        : messageData.alias || messageData.u?.username || messageData.customFields?.participantId,
                    messageId: messageData._id,
                    message: messageData.msg || 'No message content',
                    messageType: messageData.u?.username === 'admin' ? 'system'
                        : messageData.customFields?.participantId === CONFERENCE_INFO.localParticipantId ? 'local' : 'remote',
                    privateMessage: false,
                    lobbyChat: false,
                    reactions: new Map(),
                    timestamp: new Date(messageData.ts.$date).getTime(),
                    isReaction: false
                };

                dispatch(addMessage({
                    displayName: newMessage.displayName,
                    participantId: newMessage.participantId,
                    messageId: newMessage.messageId,
                    messageType: newMessage.messageType,
                    message: newMessage.message,
                    privateMessage: newMessage.privateMessage,
                    lobbyChat: newMessage.lobbyChat,
                    reactions: newMessage.reactions,
                    timestamp: newMessage.timestamp,
                    hasRead: false,
                    isReaction: newMessage.isReaction
                }));
                logger.log(`Received and dispatched new message from Rocket.Chat: ${newMessage.message}`);
            }
        } else if (data.msg === 'ping') {
            ws.send(JSON.stringify({msg: 'pong'}));
        } else if (data.msg === 'result' && data.id === 'login-1') {
            logger.log('WebSocket login successful');
        }
    };

    ws.onerror = error => {
        logger.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        logger.log('WebSocket disconnected from Rocket.Chat');
        setTimeout(() => setupRocketChatWebSocket(), 10000);
    };
}

export function setRoomIdOnChange(roomId) {
    CONFERENCE_INFO.roomId = roomId;
    logger.info(`Updated roomId : ${roomId}`);
}


/**
 * Thiết lập các thông tin cần thiết và đồng bộ tin nhắn, kết nối websocket khi cuộc họp bắt đầu
 *
 */
export function startConference(store, rocketChatRoomId, meetingId) {
    CONFERENCE_INFO.store = store;
    CONFERENCE_INFO.meetingId = meetingId;
    CONFERENCE_INFO.roomId = rocketChatRoomId;

    const localParticipant = getLocalParticipant(store.getState());
    const localParticipantId = localParticipant?.id || '';
    const localParticipantName = localParticipant?.name || 'Anonymous User';
    CONFERENCE_INFO.localParticipantId = localParticipantId;
    CONFERENCE_INFO.localParticipantName = localParticipantName;

    syncRocketChatMessages().then(() => {
        setupRocketChatWebSocket();
    });
}
