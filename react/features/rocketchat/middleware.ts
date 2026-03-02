import {
    IRocketChatMessage,
    IRocketChatParticipant,
    deleteMessageFromRocketChat,
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
import { DELETE_MESSAGE, SEND_MESSAGE, SEND_REACTION } from '../chat/actionTypes';
import { addMessage, setRocketChatMessagesLoaded } from '../chat/actions.any';
import { JITSI_TO_ROCKET_CHAT_REACTIONS } from '../../../rocketchat/constants';

async function waitForConnectionToken(getState: () => any, maxWaitMs = 2000, intervalMs = 100): Promise<string> {
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
                    dispatch(setRocketChatMessagesLoaded(false));
                    const roomName = getRoomName(store.getState()) || '';
                    let token = await waitForConnectionToken(store.getState);

                    if (!token) {
                        const conferenceState = store.getState()['features/base/conference'] as IConferenceState;
                        const jwtState = store.getState()['features/base/jwt'];

                        token = conferenceState?.conference?.connection?.token || jwtState?.jwt || '';
                    }

                    console.log('[RocketChat Middleware] Token for Init:', token ? 'Found' : 'Missing', roomName);

                    const instance = await initRocketChat(store, token, roomName, localParticipant);

                    if (instance) {
                        await syncRocketChatMessages(0, 30, (msg: IRocketChatMessage) => {
                            dispatch(addMessage({ ...msg, hasRead: false, isRocketChatHistory: true }));
                        });
                        console.log('RocketChat Middleware: Synced messages from RocketChat successfully');
                    }
                } catch (err) {
                    console.error('RocketChat Middleware error in CONFERENCE_JOINED:', err);
                } finally {
                    dispatch(setRocketChatMessagesLoaded(true));
                }
            })().catch(err => {
                console.error('Unhandled error in RocketChat init:', err);
                dispatch(setRocketChatMessagesLoaded(true));
            });
            break;
        }

        case CONFERENCE_LEFT:
        case CONFERENCE_FAILED:
            stopRocketChat();
            break;

        case SEND_MESSAGE: {
            // Chỉ gửi tin nhắn group chat tới Rocket.Chat (không gửi private messages)
            const { privateMessageRecipient, isLobbyChatActive } = state['features/chat'];
            const { message, messageId } = action;

            if (!privateMessageRecipient && !isLobbyChatActive && message) {
                if (isRocketChatInitialized()) {
                    console.log('[RocketChat Middleware] Sending message to Rocket.Chat:', message.substring(0, 50));
                    sendMessageToRocketChat(message)
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
                const mappedReaction = JITSI_TO_ROCKET_CHAT_REACTIONS[reaction as string] || reaction;

                console.log('[RocketChat Middleware] Sending reaction to Rocket.Chat:', mappedReaction);

                sendReactionToRocketChat(messageId, mappedReaction)
                    .catch(err => console.error('Failed to send reaction to Rocket.Chat', err));
                return;
            }
            break;
        }

        case DELETE_MESSAGE: {
            if (isRocketChatInitialized() && !action.fromRocketChat) {
                const { messageId } = action;

                const messages = store.getState()['features/chat'].messages;
                const message = messages.find((m: any) => m.messageId === messageId);
                const rcMessageId = message?.rcMessageId || messageId;

                console.log('[RocketChat Middleware] Deleting message from Rocket.Chat:', rcMessageId);
                deleteMessageFromRocketChat(rcMessageId)
                    .catch(err => console.error('Failed to delete message from Rocket.Chat', err));
            }
            break;
        }
    }

    return next(action);
});
