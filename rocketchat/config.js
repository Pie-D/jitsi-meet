import { env } from '../ENV';

export const ROCKET_CHAT_CONFIG = Object.freeze({
    apiUrl: env.ROCKET_CHAT_API_URL,
    wsUrl: env.ROCKET_CHAT_WS_URL,
    botUserId: env.ROCKET_CHAT_USER_ID,
    botToken: env.ROCKET_CHAT_TOKEN,
    cmeetApiUrl: env.CMEET_URL,
    cmeetWsUrl: env.CMEET_WS_URL,
    endpoints: {
        login: `${env.ROCKET_CHAT_API_URL}/login`,
        postMessage: `${env.ROCKET_CHAT_API_URL}/chat.postMessage`,
        roomMembers: `${env.ROCKET_CHAT_API_URL}/groups.members`,
        roomHistory: `${env.ROCKET_CHAT_API_URL}/groups.history`,
        getRoomId: `${env.CMEET_URL}/api/meeting-time-sheet/rocket-chat`
    },
    wsConfig: {
        maxReconnectAttempts: 5,
        reconnectDelay: 10000,
        pingInterval: 30000
    },
    messageConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 30,
        maxMessageLength: 1000
    }
});
