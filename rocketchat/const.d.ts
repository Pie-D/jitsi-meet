export interface RocketChatReaction {
    message: string;
    jitsi_message: string;
    emoji: string;
}

export interface RocketChatReactions {
    LIKE: RocketChatReaction;
    LOVE: RocketChatReaction;
    LAUGH: RocketChatReaction;
    SAD: RocketChatReaction;
    ANGRY: RocketChatReaction;
    FIRE: RocketChatReaction;
}

export const ROCKET_CHAT_REACTIONS: RocketChatReactions;
export const JITSI_TO_ROCKET_CHAT_REACTIONS: { [key: string]: string };
export const ROCKET_CHAT_TO_JITSI_REACTIONS: { [key: string]: string };
