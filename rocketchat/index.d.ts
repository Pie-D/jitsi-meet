/* eslint-disable require-jsdoc */

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

export interface IRocketChatStore {
    dispatch: (action: any) => void;
    getState: () => any;
}

export interface IRocketChatInstance {
    destroy(): void;
    loadchat(offset?: number, limit?: number, deliverMessage?: (message: IRocketChatMessage) => void): Promise<void>;
    sendMessage(message: string): Promise<string | undefined>;
}

export function initRocketChat(
    store: IRocketChatStore,
    token: string,
    meetingId: string,
    localParticipant: IRocketChatParticipant
): Promise<IRocketChatInstance | false>;

export function stopRocketChat(): void;

export function syncRocketChatMessages(
    offset?: number,
    limit?: number,
    deliverMessage?: (message: IRocketChatMessage) => void
): Promise<void>;

export function sendMessageToRocketChat(message: string): Promise<string | undefined>;
