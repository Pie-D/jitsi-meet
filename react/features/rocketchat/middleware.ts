import {
    IRocketChatMessage,
    IRocketChatParticipant,
    initRocketChat,
    isRocketChatInitialized,
    sendMessageToRocketChat,
    sendReactionToRocketChat,
    stopRocketChat,
    syncRocketChatMessages
} from '../../../rocketchat/index';
import { CONFERENCE_FAILED, CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { getRoomName } from '../base/conference/functions';
import { IConferenceState } from '../base/conference/reducer';
import { getLocalParticipant } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { SEND_MESSAGE, SEND_REACTION } from '../chat/actionTypes';
import { addMessage } from '../chat/actions.any';

async function waitForConnectionToken(getState: () => any, maxWaitMs = 10000, intervalMs = 100): Promise<string> {
    const start = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const conferenceState = getState()['features/base/conference'] as IConferenceState;
        const jwtState = getState()['features/base/jwt'];
        const token = conferenceState?.conference?.connection?.token || jwtState?.jwt || '';

        if (token) {
            return token;
        }

        if (Date.now() - start >= maxWaitMs) {
            return '';
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
}

MiddlewareRegistry.register(store => next => action => {
    const { dispatch, getState } = store;
    const state = getState();
    const localParticipant = getLocalParticipant(state) as IRocketChatParticipant;

    switch (action.type) {
    case CONFERENCE_JOINED: {
        (async () => {
            try {
                const roomName = getRoomName(store.getState()) || '';
                let token = await waitForConnectionToken(store.getState);

                if (!token) {
                    const conferenceState = store.getState()['features/base/conference'] as IConferenceState;
                    const jwtState = store.getState()['features/base/jwt'];

                    token = conferenceState?.conference?.connection?.token || jwtState?.jwt || '';
                }

                const instance = await initRocketChat(store, token, roomName, localParticipant);

                if (instance) {
                    await syncRocketChatMessages(0, 30, (msg: IRocketChatMessage) => {
                        dispatch(addMessage({ ...msg, hasRead: false }));
                    });
                    console.log('RocketChat Middleware: Synced messages from RocketChat successfully');
                }
            } catch (err) {
                console.error('RocketChat Middleware error in CONFERENCE_JOINED:', err);
            }
        })().catch(err => console.error('Unhandled error in RocketChat init:', err));
        break;
    }

    case CONFERENCE_LEFT:
    case CONFERENCE_FAILED:
        stopRocketChat();
        break;

    case SEND_MESSAGE: {
        // Chỉ gửi tin nhắn group chat tới Rocket.Chat (không gửi private messages)
        const { privateMessageRecipient, isLobbyChatActive } = state['features/chat'];

        if (!privateMessageRecipient && !isLobbyChatActive && action.message) {
            if (isRocketChatInitialized()) {
                sendMessageToRocketChat(action.message)
                    .catch(err => console.error('Failed to send message to Rocket.Chat', err));
                return;
            }
        }
        break;
    }

    case SEND_REACTION: {
        // Intercept reactions for Rocket.Chat
        if (isRocketChatInitialized()) {
            const { messageId, reaction } = action;

            sendReactionToRocketChat(messageId, reaction)
                .catch(err => console.error('Failed to send reaction to Rocket.Chat', err));
            return;
        }
        break;
    }
    }

    return next(action);
});
