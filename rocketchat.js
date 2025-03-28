/* eslint-disable */
import Logger from '@jitsi/logger';
import {env} from './ENV';
import {PREPEND_MESSAGES} from './react/features/chat/actionTypes';
import {addMessage} from './react/features/chat/actions.any';
import {getLocalParticipant} from './react/features/base/participants/functions';

const logger = Logger.getLogger(__filename);

// Cấu hình Rocket.Chat API
const ROCKET_CHAT_CONFIG = {
    apiUrl: env.ROCKET_CHAT_API_URL,
    token: env.ROCKET_CHAT_TOKEN,
    userId: env.ROCKET_CHAT_USER_ID,
    wsUrl: env.ROCKET_CHAT_WS_URL
};

// Thông tin cuộc họp
const CONFERENCE_INFO = {
    store: null,
    roomId: null,
    localParticipantId: null,
    localParticipantName: null,
    meetingId: null
};

/**
 * Gửi yêu cầu HTTP GET với headers đã định nghĩa
 */
async function fetchWithAuth(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Token': ROCKET_CHAT_CONFIG.token,
                'X-User-Id': ROCKET_CHAT_CONFIG.userId
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        logger.error('Fetch error:', error);
        throw error;
    }
}

/**
 * Lấy lịch sử tin nhắn từ Rocket.Chat
 */
async function fetchRocketChatHistory(offset = 0) {
    const {store, roomId} = CONFERENCE_INFO;
    const shownMessages = store.getState()['features/chat'].shownMessages;
    const url = `${ROCKET_CHAT_CONFIG.apiUrl}/groups.history?roomId=${encodeURIComponent(roomId)}&count=30&offset=${offset}`;

    try {
        const data = await fetchWithAuth(url);
        return (data.messages || [])
            .reverse()
            .filter(msg => !shownMessages.has(msg._id) && !msg.t)
            .map(formatMessage);
    } catch (error) {
        logger.error('Error fetching Rocket.Chat history:', error);
        return [];
    }
}

/**
 * Định dạng tin nhắn nhận được từ Rocket.Chat
 */
function formatMessage(msg) {
    const sender = msg.u || {};
    const isSystemMessage = sender.username === 'admin';
    const isLocalMessage = sender.username === CONFERENCE_INFO.localParticipantName;

    return {
        displayName: msg.alias || sender.name || sender.username || 'Anonymous User',
        participantId: isSystemMessage ? 'system' : msg.alias || sender.username || msg.customFields?.participantId,
        messageId: msg._id,
        message: msg.msg || 'No message content',
        messageType: isSystemMessage ? 'system' : isLocalMessage ? 'local' : 'remote',
        privateMessage: false,
        lobbyChat: false,
        reactions: new Map(),
        timestamp: new Date(msg.ts).getTime(),
        isReaction: false
    };
}

/**
 * Đồng bộ tin nhắn từ Rocket.Chat vào Redux store
 */
export async function syncRocketChatMessages(offset = 0) {
    try {
        const messages = await fetchRocketChatHistory(offset);
        if (messages.length === 0) {
            logger.warn('No messages found in Rocket.Chat history');
            return;
        }

        CONFERENCE_INFO.store.dispatch({type: PREPEND_MESSAGES, messages});
        logger.info(`Rocket.Chat messages synced (offset: ${offset})`);
    } catch (error) {
        logger.error('Error syncing Rocket.Chat messages:', error);
    }
}

/**
 * Thiết lập kết nối WebSocket đến Rocket.Chat
 */
function setupRocketChatWebSocket() {
    const {store, localParticipantName, roomId} = CONFERENCE_INFO;
    const ws = new WebSocket(ROCKET_CHAT_CONFIG.wsUrl);

    ws.onopen = () => {
        logger.info('WebSocket connected to Rocket.Chat');

        ws.send(JSON.stringify({msg: 'connect', version: '1', support: ['1']}));
        ws.send(JSON.stringify({
            msg: 'method',
            method: 'login',
            id: 'login-1',
            params: [{resume: ROCKET_CHAT_CONFIG.token}]
        }));
        ws.send(JSON.stringify({msg: 'sub', id: 'sub-1', name: 'stream-room-messages', params: [roomId, false]}));
    };

    ws.onmessage = event => {
        handleWebSocketMessage(event.data, store, localParticipantName, ws);
    };

    ws.onerror = error => logger.error('WebSocket error:', error);

    ws.onclose = () => {
        logger.info('WebSocket disconnected from Rocket.Chat, reconnecting...');
        setTimeout(setupRocketChatWebSocket, 10000);
    };
}

/**
 * Xử lý tin nhắn nhận được từ WebSocket
 */
function handleWebSocketMessage(data, store, localParticipantName, ws) {
    const parsedData = JSON.parse(data);

    if (parsedData.msg === 'ping') {
        ws.send(JSON.stringify({msg: 'pong'}));
        return;
    }

    if (parsedData.msg === 'result' && parsedData.id === 'login-1') {
        logger.info('WebSocket login successful');
        return;
    }

    if (parsedData.msg === 'changed' && parsedData.collection === 'stream-room-messages') {
        const messageData = parsedData.fields.args[0];

        if (!messageData.customFields?.fromJitsi &&
            messageData.u?.username !== localParticipantName &&
            messageData.alias !== localParticipantName &&
            !messageData.t
        ) {
            const newMessage = formatMessage(messageData);
            store.dispatch(addMessage({...newMessage, hasRead: false}));
            logger.info(`New message received from Rocket.Chat: ${newMessage.message}`);
        }
    }
}

/**
 * Cập nhật roomId
 */
export function setRoomIdOnChange(roomId) {
    CONFERENCE_INFO.roomId = roomId;
    logger.info(`Updated roomId: ${roomId}`);

    setupRocketChatWebSocket();
}

/**
 * Bắt đầu cuộc họp và đồng bộ tin nhắn, thiết lập WebSocket
 */
export function startConference(store, rocketChatRoomId, meetingId) {
    CONFERENCE_INFO.store = store;
    CONFERENCE_INFO.meetingId = meetingId;
    CONFERENCE_INFO.roomId = rocketChatRoomId;

    const localParticipant = getLocalParticipant(store.getState()) || {};
    CONFERENCE_INFO.localParticipantId = localParticipant.id || '';
    CONFERENCE_INFO.localParticipantName = localParticipant.name || 'Anonymous User';

    syncRocketChatMessages().then(setupRocketChatWebSocket);
}

