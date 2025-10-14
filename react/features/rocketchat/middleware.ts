/* eslint-disable require-jsdoc */
import { initRocketChat, sendMessageToRocketChat, stopRocketChat, syncRocketChatMessages } from '../../../rocketchat/index';
import { CONFERENCE_FAILED, CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { getRoomName } from '../base/conference/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { SEND_MESSAGE } from '../chat/actionTypes';

MiddlewareRegistry.register(store => next => async action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED: {
        const state: any = store.getState();
        const roomName = getRoomName(state);

        const xmpp = state['features/base/conference']?.conference?.xmpp
            || state['features/base/conference']?.xmpp || undefined;

        initRocketChat(store, xmpp, roomName)
            .then(instance => {
                if (instance) {
                    return syncRocketChatMessages(0, 30);
                }
            })
            .catch(error => {
                console.error('Failed to init RocketChat:', error);
            });
        break;
    }

    case CONFERENCE_LEFT:
    case CONFERENCE_FAILED:
        stopRocketChat();
        break;

    case SEND_MESSAGE: {
        const currentState = store.getState();
        const chatState = currentState['features/chat'] || {};
        const { privateMessageRecipient, isLobbyChatActive, lobbyMessageRecipient } = chatState;

        if (privateMessageRecipient || (isLobbyChatActive && lobbyMessageRecipient)) {
            break;
        }

        if (action.message) {
            try {
                await sendMessageToRocketChat(action.message);
            } catch {
                console.error('Failed to send message to Rocket.Chat');
            }
        }
        break;
    }
    }

    return result;
});
