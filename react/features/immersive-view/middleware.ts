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

    // Chỉ log immersive view actions
    if (!conference) {
        return result;
    }

    // Chỉ moderator mới được gửi immersive view settings qua XMPP
    const isModerator = state['features/base/participants']?.local?.role === 'moderator';
    
    switch (action.type) {
    case SET_IMMERSIVE_ENABLED: {
        if (isModerator) {
            conference.setImmersiveViewEnabled(action.enabled);
        } else {
            console.log('❌ [ImmersiveView Middleware] Only moderators can enable/disable immersive view');
        }
        break;
    }
    case SET_IMMERSIVE_TEMPLATE: {
        if (isModerator && action.templateId) {
            conference.setImmersiveViewTemplate(action.templateId);
        } else if (!isModerator) {
            console.log('❌ [ImmersiveView Middleware] Only moderators can change immersive view template');
        }
        break;
    }
    case SET_IMMERSIVE_SLOT_COUNT: {
        if (isModerator) {
            conference.setImmersiveViewSlotCount(action.slotCount);
        } else {
            console.log('❌ [ImmersiveView Middleware] Only moderators can change immersive view slot count');
        }
        break;
    }
    case SET_IMMERSIVE_ASSIGNMENTS: {
        console.log('🎯 [ImmersiveView Middleware] Dispatching assignments:', action.assignments);
        if (isModerator) {
            conference.sendImmersiveViewAssignments(action.assignments);
        } else {
            console.log('❌ [ImmersiveView Middleware] Only moderators can send immersive view assignments');
        }
        break;
    }
    }

    return result;
});
