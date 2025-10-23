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
    if (action.type === SET_IMMERSIVE_ENABLED || 
        action.type === SET_IMMERSIVE_TEMPLATE || 
        action.type === SET_IMMERSIVE_SLOT_COUNT || 
        action.type === SET_IMMERSIVE_ASSIGNMENTS) {
        console.log('🔧 [ImmersiveView Middleware] Action:', action.type, action);
    }

    if (!conference) {
        if (action.type === SET_IMMERSIVE_ENABLED || 
            action.type === SET_IMMERSIVE_TEMPLATE || 
            action.type === SET_IMMERSIVE_SLOT_COUNT || 
            action.type === SET_IMMERSIVE_ASSIGNMENTS) {
            console.log('❌ [ImmersiveView Middleware] No conference available');
        }
        return result;
    }

    switch (action.type) {
    case SET_IMMERSIVE_ENABLED: {
        console.log('🚀 [ImmersiveView Middleware] Setting immersive view enabled:', action.enabled);
        // Sync immersive view enabled state qua XMPP
        conference.setImmersiveViewEnabled(action.enabled);
        break;
    }
    case SET_IMMERSIVE_TEMPLATE: {
        console.log('🎨 [ImmersiveView Middleware] Setting immersive view template:', action.templateId);
        // Sync immersive view template qua XMPP
        if (action.templateId) {
            conference.setImmersiveViewTemplate(action.templateId);
        }
        break;
    }
    case SET_IMMERSIVE_SLOT_COUNT: {
        console.log('📊 [ImmersiveView Middleware] Setting immersive view slot count:', action.slotCount);
        // Sync immersive view slot count qua XMPP
        conference.setImmersiveViewSlotCount(action.slotCount);
        break;
    }
    case SET_IMMERSIVE_ASSIGNMENTS: {
        console.log('👥 [ImmersiveView Middleware] Sending immersive view assignments:', action.assignments);
        // Sync immersive view assignments qua XMPP
        conference.sendImmersiveViewAssignments(action.assignments);
        break;
    }
    }

    return result;
});
