/* eslint-disable require-jsdoc */
import { RocketChat } from './RocketChat';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat:Index');


let instance = null;

export async function initRocketChat(store, xmpp, meetingId) {
    try {
        if (!meetingId) {
            logger.error('Meeting ID is required');

            return false;
        }

        const rocketChat = new RocketChat(store, meetingId);
        const rocketChatRoomId = await rocketChat.getRocketChatRoomId();

        if (!rocketChatRoomId) {
            logger.error('Not found RocketChat room ID');

            return false;
        }

        await rocketChat.loginToRocketChat(xmpp);
        await rocketChat.checkUserInRocketChatRoom();
        rocketChat.connectWebSocket();

        instance = rocketChat;

        return rocketChat;
    } catch (error) {
        logger.error('Failed to init RocketChat', error);

        return false;
    }
}

export function stopRocketChat() {
    if (instance) {
        instance.destroy();
        instance = null;
    }
}

export async function syncRocketChatMessages(offset = 0, limit = 30) {
    if (instance) {
        await instance.loadchat(offset, limit);
    }
}

export async function sendMessageToRocketChat(message) {
    if (instance) {
        await instance.sendMessage(message);
    }
}
