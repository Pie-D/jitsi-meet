/* eslint-disable require-jsdoc */
import { IRocketChatMessage, IRocketChatParticipant, initRocketChat, sendMessageToRocketChat, stopRocketChat, syncRocketChatMessages } from '../../../rocketchat/index';
import { CONFERENCE_FAILED, CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { getRoomName } from '../base/conference/functions';
import { getLocalParticipant } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { SEND_MESSAGE } from '../chat/actionTypes';
import { addMessage } from '../chat/actions.any';
import {IConferenceState} from "../base/conference/reducer";

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

    case SEND_MESSAGE: {
        // Chỉ gửi tin nhắn group chat tới Rocket.Chat (không gửi private messages)
        const { privateMessageRecipient, isLobbyChatActive } = state['features/chat'];

        if (!privateMessageRecipient && !isLobbyChatActive && action.message) {
            try {
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
