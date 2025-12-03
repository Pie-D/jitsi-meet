/* eslint-disable require-jsdoc */
// @ts-ignore
import { RocketChat } from './RocketChat';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat:Index');

let instance: RocketChat | null = null;

export interface IRocketChatMessage {
    messageId: string;
    message: string;
    displayName: string;
    participantId: string;
    timestamp: number;
    hasRead?: boolean;
    messageType?: string;
    privateMessage?: boolean;
    lobbyChat?: boolean;
    recipient?: string;
    isReaction?: boolean;
    isFromVisitor?: boolean;
    isFromGuest?: boolean;
    reactions?: any;
    error?: any;
    sentToVisitor?: boolean;
}

export interface IRocketChatParticipant {
    id: string;
    name: string;
}

export async function initRocketChat(
    store: any,
    token: string,
    meetingId: string,
    localParticipant: any
): Promise<RocketChat | false> {
    if (!meetingId) {
        logger.warn('Meeting ID is required');
        return false;
    }

    const rocketChat = new RocketChat(store, meetingId, localParticipant);
    instance = rocketChat;

    let rocketChatRoomId: string | null = null;

    // Lấy room id của RocketChat từ C-Meet
    try {
        rocketChatRoomId = await rocketChat.getRocketChatRoomId();

        if (rocketChatRoomId) {
            rocketChat.setRocketChatRoomId(rocketChatRoomId);
        } else {
            logger.warn('Not found RocketChat room ID');
            // Nếu không có room id thì connect vào websocket của C-Meet để đợi room id mới
            rocketChat.connectCMeetRoomWatcher();
        }
    } catch (error) {
        logger.error('Failed to get RocketChat room ID', error);
        rocketChat.connectCMeetRoomWatcher();
    }

    // Nếu có room id thì login vào RocketChat
    try {
        await rocketChat.loginToRocketChat(token);
    } catch (error) {
        logger.error('Failed to login to RocketChat', error);
    }

    // Connect WebSocket
    try {
        rocketChat.connectWebSocket();
    } catch (error) {
        logger.error('Failed to connect WebSocket', error);
    }

    // Check user in RocketChat room
    if (rocketChatRoomId) {
        try {
            await rocketChat.checkUserInRocketChatRoom();
        } catch (err) {
            logger.error('Failed to check user in RocketChat room', err);
        }
    }

    return rocketChat;
}

export function stopRocketChat(): void {
    if (instance) {
        instance.destroy();
        instance = null;
    }
}

export async function syncRocketChatMessages(
    offset = 0,
    limit = 30,
    deliverMessage?: (message: any) => void
): Promise<void> {
    if (instance) {
        await instance.loadchat(offset, limit, deliverMessage);
    }
}

export async function sendMessageToRocketChat(message: string): Promise<string | undefined> {
    if (instance) {
        return await instance.sendMessage(message);
    }
}
