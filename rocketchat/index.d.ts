/**
 * TypeScript definitions for Rocket.Chat integration module
 */

export interface RocketChatConfig {
    apiUrl: string;
    wsUrl: string;
    cmeetApiUrl: string;
    cmeetWsUrl: string;
    botUserId: string;
    botToken: string;
    endpoints: {
        login: string;
        postMessage: string;
        roomMembers: string;
        roomHistory: string;
        getRoomId: string;
    };
}

export interface RocketChatMessage {
    _id: string;
    msg: string;
    ts: string | { $date: string };
    u: {
        username: string;
        name?: string;
    };
    alias?: string;
    reactions?: Record<string, { usernames: string[] }>;
    customFields?: {
        participantId?: string;
        fromJitsi?: boolean;
    };
    t?: string; // system message type
}

export interface FormattedMessage {
    displayName: string;
    error: boolean;
    participantId: string;
    isReaction: boolean;
    messageId: string;
    messageType: 'system' | 'local' | 'remote';
    message: string;
    reactions: Map<string, Set<string>>;
    privateMessage: boolean;
    lobbyChat: boolean;
    recipient?: string;
    timestamp: number;
    hasRead: boolean;
}

export enum RocketChatType {
    USER = 'u',
    BOT = 'b'
}

export declare class RocketChat {
    constructor();
    
    // Initialization
    initialize(store: any, cmeetMeetingId: string, rocketChatRoomId?: string): Promise<boolean>;
    setUserContext(xmppToken: string | null, displayName: string, participantId: string): void;
    setContext(store: any, localParticipantName: string, localParticipantId: string, meetingId: string): void;
    
    // Messaging
    sendMessage(message: string, isPrivate?: boolean, recipientId?: string): Promise<boolean>;
    syncMessages(roomId: string, offset?: number): Promise<boolean>;
    handleIncomingMessage(messageData: RocketChatMessage): void;
    
    // Utility
    clearShownMessages(): void;
    destroy(): void;
    
    // Properties
    isInitialized: boolean;
    rocketChatRoomId: string | null;
    cmeetMeetingId: string | null;
    store: any;
}

// Singleton instance
export declare const rocketChat: RocketChat;

// Legacy compatibility functions
export declare function syncRocketChatMessages(offset?: number): Promise<void>;
export declare function setRoomIdOnChange(roomId: string): void;
export declare function startConference(store: any, cmeetMeetingId: string, rocketChatRoomId?: string): Promise<boolean>;
export declare function sendMessageToRocketChat(message: string, isPrivate?: boolean, recipientId?: string): Promise<boolean>;

// Default export
export default rocketChat;