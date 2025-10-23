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

    switch (action.type) {
    case JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED: {
        const { participantId, enabled } = action;
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            dispatch(setImmersiveEnabled(enabled));
        }
        break;
    }
    case JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED: {
        const { participantId, templateId } = action;
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            dispatch(setImmersiveTemplate(templateId));
        }
        break;
    }
    case JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED: {
        const { participantId, slotCount } = action;
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            dispatch(setImmersiveSlotCount(slotCount));
        }
        break;
    }
    case JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED: {
        const { participantId, assignments } = action;
        // Chỉ sync từ moderator
        const state = getState();
        const participant = state['features/base/participants'].remote.get(participantId);
        
        if (participant && participant.role === 'moderator') {
            dispatch(setImmersiveAssignments(assignments));
        }
        break;
    }
    }

    return result;
});
