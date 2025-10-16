/* eslint-disable require-jsdoc */
import { env } from '../../../ENV';
import { startConference } from '../../../rocketchat';
import { CONFERENCE_FAILED, CONFERENCE_JOINED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { getRoomName } from '../base/conference/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';

import { setRocketChatConnectionStatus, setRocketChatStatus } from './actions';

/**
 * Middleware for Rocket.Chat integration.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_JOINED:
        _handleConferenceJoined(store, action);
        break;
    case CONFERENCE_LEFT:
    case CONFERENCE_FAILED:
        _handleConferenceLeft(store, action);
        break;
    }

    return result;
});

/**
 * Handle conference joined event.
 *
 * @param {Object} store - The Redux store.
 * @param {Object} _action - The Redux action.
 * @returns {void}
 */
function _handleConferenceJoined(store: any, _action: any) {
    const state = store.getState();
    const roomName = getRoomName(state);

    // Check if Rocket.Chat is enabled
    if (!env.ROCKET_CHAT_API_URL || !env.ROCKET_CHAT_WS_URL) {
        store.dispatch(setRocketChatStatus(false));

        return;
    }

    // Set Rocket.Chat status as enabled
    store.dispatch(setRocketChatStatus(true));

    // Check if Rocket.Chat room ID exists before initializing
    (async () => {
        try {
            // Create config object
            const config = {
                cmeetApiUrl: env.CMEET_URL
            };

            // Check if room ID exists
            const rocketchatModule = require('../../../rocketchat');
            const roomIdResult = await rocketchatModule.Utils.getRocketChatRoomId(config, roomName);

            if (roomIdResult.success && roomIdResult.data) {
                // Room ID exists, initialize Rocket.Chat integration
                startConference(store, roomName || 'default-room')
                    .then(success => {
                        store.dispatch(setRocketChatConnectionStatus(success));
                    })
                    .catch(() => {
                        store.dispatch(setRocketChatConnectionStatus(false));
                    });
            } else {
                // No room ID found, disable Rocket.Chat integration
                store.dispatch(setRocketChatConnectionStatus(false));
            }
        } catch (error) {
            // Error checking room ID, disable Rocket.Chat integration
            store.dispatch(setRocketChatConnectionStatus(false));
        }
    })();
}

/**
 * Handle conference left/failed event.
 *
 * @param {Object} store - The Redux store.
 * @param {Object} _action - The Redux action.
 * @returns {void}
 */
function _handleConferenceLeft(store: any, _action: any) {
    // Update connection status
    store.dispatch(setRocketChatConnectionStatus(false));

    // Clean up Rocket.Chat integration
    const { default: rocketChatInstance } = require('../../../rocketchat');

    rocketChatInstance.destroy();
}

