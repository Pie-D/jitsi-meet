import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { IStore } from '../app/types';
import { AnyAction } from 'redux';

import {
    SET_IMMERSIVE_ENABLED,
    SET_IMMERSIVE_TEMPLATE,
    SET_IMMERSIVE_SLOT_COUNT,
    SET_IMMERSIVE_ASSIGNMENTS
} from './actionTypes';

/**
 * Middleware để sync immersive view state qua XMPP.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);
    const { dispatch, getState } = store;
    const state = getState();
    const conference = state['features/base/conference'].conference;

    if (!conference) {
        return result;
    }

    switch (action.type) {
    case SET_IMMERSIVE_ENABLED: {
        // Sync immersive view enabled state qua XMPP
        conference.setImmersiveViewEnabled(action.enabled);
        break;
    }
    case SET_IMMERSIVE_TEMPLATE: {
        // Sync immersive view template qua XMPP
        if (action.templateId) {
            conference.setImmersiveViewTemplate(action.templateId);
        }
        break;
    }
    case SET_IMMERSIVE_SLOT_COUNT: {
        // Sync immersive view slot count qua XMPP
        conference.setImmersiveViewSlotCount(action.slotCount);
        break;
    }
    case SET_IMMERSIVE_ASSIGNMENTS: {
        // Sync immersive view assignments qua XMPP
        conference.sendImmersiveViewAssignments(action.assignments);
        break;
    }
    }

    return result;
});
