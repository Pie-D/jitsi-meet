/**
 * Type definitions and constants for Rocket.Chat integration
 */

export const RocketChatType = {
    USER: 'u',
    BOT: 'b'
};

// Default configuration structure
export const DEFAULT_CONFIG = {
    apiUrl: '',
    wsUrl: '',
    cmeetApiUrl: '',
    cmeetWsUrl: '',
    botUserId: '',
    botToken: '',
    endpoints: {
        login: '/login',
        postMessage: '/chat.postMessage',
        roomMembers: '/groups.members',
        roomHistory: '/groups.history',
        getRoomId: '/api/meeting-time-sheet/rocket-chat'
    }
};

// Message types
export const MESSAGE_TYPES = {
    SYSTEM: 'system',
    LOCAL: 'local',
    REMOTE: 'remote'
};

// WebSocket message types
export const WS_MESSAGE_TYPES = {
    CONNECT: 'connect',
    PING: 'ping',
    PONG: 'pong',
    METHOD: 'method',
    SUB: 'sub',
    RESULT: 'result',
    CHANGED: 'changed'
};

// WebSocket collections
export const WS_COLLECTIONS = {
    STREAM_ROOM_MESSAGES: 'stream-room-messages'
};

// Default message structure
export const DEFAULT_MESSAGE = {
    displayName: 'Anonymous User',
    error: false,
    participantId: 'system',
    isReaction: false,
    messageId: '',
    messageType: MESSAGE_TYPES.REMOTE,
    message: '',
    reactions: new Map(),
    privateMessage: false,
    lobbyChat: false,
    recipient: undefined,
    timestamp: Date.now(),
    hasRead: true
};

// Validation schemas (for runtime type checking)
export const VALIDATION_SCHEMAS = {
    rocketChatMessage: {
        required: [ '_id', 'msg', 'ts' ],
        optional: [ 'u', 'alias', 'reactions', 'customFields', 't' ]
    },

    formattedMessage: {
        required: [ 'displayName', 'participantId', 'messageId', 'messageType', 'message', 'timestamp' ],
        optional: [ 'error', 'isReaction', 'reactions', 'privateMessage', 'lobbyChat', 'recipient', 'hasRead' ]
    }
};
