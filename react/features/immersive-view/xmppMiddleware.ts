import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { IStore } from '../app/types';
import { AnyAction } from 'redux';

import { JitsiConferenceEvents } from '../../../../lib-jitsi-meet/JitsiConferenceEvents';
import {
    setImmersiveAssignments,
    setImmersiveEnabled,
    setImmersiveTemplate,
    setImmersiveSlotCount
} from './actions';

/**
 * Middleware để handle immersive view events từ XMPP.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);
    const { dispatch, getState } = store;

    // Chỉ log immersive view events
    if (action.type === JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED ||
        action.type === JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED ||
        action.type === JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED ||
        action.type === JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED) {
        console.log('📡 [ImmersiveView XMPP Middleware] Action:', action.type, action);
    }

    switch (action.type) {
    case JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED: {
        const { participantId, enabled } = action;
        console.log('🎯 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_ENABLED:', { participantId, enabled });
        
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        console.log('👤 [ImmersiveView XMPP Middleware] Participant:', participant);
        
        if (participant && participant.role === 'moderator') {
            console.log('✅ [ImmersiveView XMPP Middleware] Syncing from moderator, dispatching setImmersiveEnabled:', enabled);
            dispatch(setImmersiveEnabled(enabled));
        } else {
            console.log('❌ [ImmersiveView XMPP Middleware] Not from moderator, ignoring. Role:', participant?.role);
        }
        break;
    }
    case JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED: {
        const { participantId, templateId } = action;
        console.log('🎨 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_TEMPLATE_CHANGED:', { participantId, templateId });
        
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            console.log('✅ [ImmersiveView XMPP Middleware] Syncing template from moderator:', templateId);
            dispatch(setImmersiveTemplate(templateId));
        } else {
            console.log('❌ [ImmersiveView XMPP Middleware] Template not from moderator, ignoring');
        }
        break;
    }
    case JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED: {
        const { participantId, slotCount } = action;
        console.log('📊 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_SLOT_COUNT_CHANGED:', { participantId, slotCount });
        
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            console.log('✅ [ImmersiveView XMPP Middleware] Syncing slot count from moderator:', slotCount);
            dispatch(setImmersiveSlotCount(slotCount));
        } else {
            console.log('❌ [ImmersiveView XMPP Middleware] Slot count not from moderator, ignoring');
        }
        break;
    }
    case JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED: {
        const { participantId, assignments } = action;
        console.log('👥 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED:', { participantId, assignments });
        
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            console.log('✅ [ImmersiveView XMPP Middleware] Syncing assignments from moderator:', assignments);
            dispatch(setImmersiveAssignments(assignments));
        } else {
            console.log('❌ [ImmersiveView XMPP Middleware] Assignments not from moderator, ignoring');
        }
        break;
    }
    }

    return result;
});
