/* eslint-disable require-jsdoc */
import {
    ADD_ROCKETCHAT_MESSAGE,
    CLEAR_ROCKETCHAT_MESSAGES,
    SET_ROCKETCHAT_CONNECTION_STATUS,
    SET_ROCKETCHAT_ROOM_ID,
    SET_ROCKETCHAT_STATUS
} from './actionTypes';

/**
 * Sets the Rocket.Chat integration status.
 *
 * @param {boolean} enabled - Whether Rocket.Chat integration is enabled.
 * @returns {Object}
 */
export function setRocketChatStatus(enabled: boolean) {
    return {
        type: SET_ROCKETCHAT_STATUS,
        enabled
    };
}

/**
 * Sets the Rocket.Chat room ID.
 *
 * @param {string} roomId - The Rocket.Chat room ID.
 * @returns {Object}
 */
export function setRocketChatRoomId(roomId: string) {
    return {
        type: SET_ROCKETCHAT_ROOM_ID,
        roomId
    };
}

/**
 * Sets the Rocket.Chat connection status.
 *
 * @param {boolean} connected - Whether Rocket.Chat is connected.
 * @returns {Object}
 */
export function setRocketChatConnectionStatus(connected: boolean) {
    return {
        type: SET_ROCKETCHAT_CONNECTION_STATUS,
        connected
    };
}

/**
 * Adds a Rocket.Chat message to the store.
 *
 * @param {Object} message - The message to add.
 * @returns {Object}
 */
export function addRocketChatMessage(message: any) {
    return {
        type: ADD_ROCKETCHAT_MESSAGE,
        message
    };
}

/**
 * Clears all Rocket.Chat messages.
 *
 * @returns {Object}
 */
export function clearRocketChatMessages() {
    return {
        type: CLEAR_ROCKETCHAT_MESSAGES
    };
}
