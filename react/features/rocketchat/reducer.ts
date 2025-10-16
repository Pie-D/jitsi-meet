/* eslint-disable require-jsdoc */
import ReducerRegistry from '../base/redux/ReducerRegistry';

import {
    ADD_ROCKETCHAT_MESSAGE,
    CLEAR_ROCKETCHAT_MESSAGES,
    SET_ROCKETCHAT_CONNECTION_STATUS,
    SET_ROCKETCHAT_ROOM_ID,
    SET_ROCKETCHAT_STATUS
} from './actionTypes';

/**
 * The default state of the Rocket.Chat feature.
 */
const DEFAULT_STATE = {
    enabled: false,
    connected: false,
    roomId: null,
    messages: []
};

export interface IRocketChatState {
    connected: boolean;
    enabled: boolean;
    messages: any[];
    roomId: string | null;
}

/**
 * Reduces the Redux actions of the feature Rocket.Chat.
 */
ReducerRegistry.register('features/rocketchat', (state: IRocketChatState = DEFAULT_STATE, action: any) => {
    switch (action.type) {
    case SET_ROCKETCHAT_STATUS:
        return {
            ...state,
            enabled: action.enabled
        };

    case SET_ROCKETCHAT_ROOM_ID:
        return {
            ...state,
            roomId: action.roomId
        };

    case SET_ROCKETCHAT_CONNECTION_STATUS:
        return {
            ...state,
            connected: action.connected
        };

    case ADD_ROCKETCHAT_MESSAGE:
        return {
            ...state,
            messages: [ ...state.messages, action.message ]
        };

    case CLEAR_ROCKETCHAT_MESSAGES:
        return {
            ...state,
            messages: []
        };

    default:
        return state;
    }
});
