export const ROCKET_CHAT_REACTIONS = {
    LIKE: {
        message: ':thumbsup:',
        jitsi_message: ':thumbs_up:',
        emoji: '👍'
    },
    LOVE: {
        message: ':hearts:',
        jitsi_message: ':heart:',
        emoji: '💖'
    },
    LAUGH: {
        message: ':laughing:',
        jitsi_message: ':grinning_face:',
        emoji: '😆'
    },
    SAD: {
        message: ':disappointed_relieved:',
        jitsi_message: ':disappointed:',
        emoji: '😢'
    },
    ANGRY: {
        message: ':angry:',
        jitsi_message: ':angry:',
        emoji: '😠'
    },
    FIRE: {
        message: ':fire:',
        jitsi_message: ':fire:',
        emoji: '🔥'
    }
};

// Mapping từ Jitsi reaction codes sang Rocket.Chat codes
export const JITSI_TO_ROCKET_CHAT_REACTIONS = {
    [ROCKET_CHAT_REACTIONS.LIKE.emoji]: ROCKET_CHAT_REACTIONS.LIKE.message,
    [ROCKET_CHAT_REACTIONS.LOVE.emoji]: ROCKET_CHAT_REACTIONS.LOVE.message,
    [ROCKET_CHAT_REACTIONS.LAUGH.emoji]: ROCKET_CHAT_REACTIONS.LAUGH.message,
    [ROCKET_CHAT_REACTIONS.SAD.emoji]: ROCKET_CHAT_REACTIONS.SAD.message,
    [ROCKET_CHAT_REACTIONS.ANGRY.emoji]: ROCKET_CHAT_REACTIONS.ANGRY.message,
    [ROCKET_CHAT_REACTIONS.FIRE.emoji]: ROCKET_CHAT_REACTIONS.FIRE.message
};

// Inverse mapping: Rocket.Chat codes to Jitsi codes
export const ROCKET_CHAT_TO_JITSI_REACTIONS = {
    [ROCKET_CHAT_REACTIONS.LIKE.message]: ROCKET_CHAT_REACTIONS.LIKE.emoji,
    [ROCKET_CHAT_REACTIONS.LOVE.message]: ROCKET_CHAT_REACTIONS.LOVE.emoji,
    [ROCKET_CHAT_REACTIONS.LAUGH.message]: ROCKET_CHAT_REACTIONS.LAUGH.emoji,
    [ROCKET_CHAT_REACTIONS.SAD.message]: ROCKET_CHAT_REACTIONS.SAD.emoji,
    [ROCKET_CHAT_REACTIONS.ANGRY.message]: ROCKET_CHAT_REACTIONS.ANGRY.emoji,
    [ROCKET_CHAT_REACTIONS.FIRE.message]: ROCKET_CHAT_REACTIONS.FIRE.emoji
};
