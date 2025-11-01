/* eslint-disable require-jsdoc */
import { IRocketChatMessage, IRocketChatParticipant, initRocketChat, sendMessageToRocketChat, stopRocketChat, syncRocketChatMessages } from '../../../rocketchat/index';
import { CONFERENCE_FAILED, CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { getRoomName } from '../base/conference/functions';
import { IConferenceState } from '../base/conference/reducer';
import { getLocalParticipant } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { ADD_MESSAGE } from '../chat/actionTypes';
import { addMessage } from '../chat/actions.any';
import { createMessageId } from '../chat/functions';

MiddlewareRegistry.register(store => next => action => {
    const { dispatch, getState } = store;
    const state = getState();
    const localParticipant = getLocalParticipant(state) as IRocketChatParticipant;

    switch (action.type) {
    case CONFERENCE_JOINED: {
        (async () => {
            try {
                const roomName = getRoomName(store.getState()) || '';
                const conferenceState = store.getState()['features/base/conference'] as IConferenceState;
                const token = conferenceState?.conference?.connection?.token || '';

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

    case ADD_MESSAGE: {
        const chatState = state['features/chat'] || { shownMessages: new Set<string>() };

        if (action.message && action.participantId && action.timestamp) {
            try {
                const messageId = createMessageId(action.participantId, action.timestamp, action.message);

                if (!chatState.shownMessages) {
                    chatState.shownMessages = new Set<string>();
                }

                if (chatState.shownMessages.has(messageId)) {
                    return;
                }

                void sendMessageToRocketChat(action.message);
            } catch (err) {
                console.error('Failed to send message to Rocket.Chat', err);
            }
        }
        break;
    }
    }

    return next(action);
});
