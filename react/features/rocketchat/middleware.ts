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

MiddlewareRegistry.register(store => next => async action => {
    const result = next(action);
    const state = store.getState();

    switch (action.type) {
    case CONFERENCE_JOINED: {
        const roomName = getRoomName(state) || '';

        const conferenceState = state['features/base/conference'] as IConferenceState;

        const token = conferenceState?.conference?.connection?.token || '';

        const localParticipant = getLocalParticipant(state);

        initRocketChat(store, token, roomName, localParticipant as IRocketChatParticipant)
            .then((instance: any) => {
                if (instance) {
                    return syncRocketChatMessages(0, 30, (message: IRocketChatMessage) => store.dispatch(addMessage({ ...message, hasRead: false })));
                }
            })
            .catch((error: any) => {
                console.error('Failed to init RocketChat:', error);
            }).finally(() => {
                console.log('RocketChat Middleware: Synced messages from RocketChat successfully');
            });
        break;
    }

    case CONFERENCE_LEFT:
    case CONFERENCE_FAILED:
        stopRocketChat();
        break;

    case ADD_MESSAGE: {
        const currentState = store.getState();
        const chatState = currentState['features/chat'] || {};

        // console.log('RocketChat Middleware: Adding message to RocketChat', action);

        if (action.message && action.participantId && action.timestamp) {
            try {
                const messageId = createMessageId(action.participantId, action.timestamp, action.message);

                console.log('RocketChat Middleware: Message ID', messageId);

                if (chatState.shownMessages.has(messageId)) {
                    return;
                }

                await sendMessageToRocketChat(action.message);
                chatState.shownMessages.add(messageId);
            } catch {
                console.error('Failed to send message to Rocket.Chat');
            }
        }
        break;
    }
    }

    return result;
});
