/* eslint-disable require-jsdoc */
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
    try {
        if (!meetingId) {
            logger.error('Meeting ID is required');
            return false;
        }

        const rocketChat = new RocketChat(store, meetingId, localParticipant);
        const rocketChatRoomId = await rocketChat.getRocketChatRoomId();

        if (!rocketChatRoomId) {
            logger.error('Not found RocketChat room ID');
            return false;
        }

        rocketChat.setRocketChatRoomId(rocketChatRoomId);

        await rocketChat.loginToRocketChat(token);
        await rocketChat.checkUserInRocketChatRoom();
        rocketChat.connectWebSocket();

        instance = rocketChat;

        return rocketChat;
    } catch (error) {
        logger.error('Failed to init RocketChat', error);
        return false;
    }
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
