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

// Flag để đảm bảo listener chỉ được đăng ký một lần
let immersiveViewListenerRegistered = false;

/**
 * Middleware để handle immersive view events từ XMPP.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);
    const { dispatch, getState } = store;

    // Đăng ký listener cho conference events khi conference được tạo
    if (action.type === 'CONFERENCE_JOINED' && !immersiveViewListenerRegistered) {
        // console.log('🔥 IMMERSIVE_SYNC: Registering XMPP listeners');
        immersiveViewListenerRegistered = true;
        
        const state = getState();
        const conference = state['features/base/conference'].conference;
        
        if (conference) {
            // console.log('🔥 IMMERSIVE_SYNC: Conference found, setting up listeners');
            // Listen for immersive view events
            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED, (participantId: string, enabled: boolean) => {
                // Chỉ sync từ moderator
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    dispatch(setImmersiveEnabled(enabled));
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED, (participantId: string, templateId: string) => {
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    dispatch(setImmersiveTemplate(templateId));
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED, (participantId: string, slotCount: number) => {
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    dispatch(setImmersiveSlotCount(slotCount));
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED, (participantId: string, payload: any) => {
                // console.log('🔥 IMMERSIVE_SYNC: ASSIGNMENTS RECEIVED from', participantId, payload);
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    // console.log('🔥 IMMERSIVE_SYNC: Syncing assignments from moderator');
                    
                    // Sync assignments
                    dispatch(setImmersiveAssignments(payload.assignments || payload));
                    
                    // Sync template và slot count nếu có
                    if (payload.templateId) {
                        dispatch(setImmersiveTemplate(payload.templateId));
                    }
                    if (payload.slotCount) {
                        dispatch(setImmersiveSlotCount(payload.slotCount));
                    }
                } else {
                    // console.log('🔥 IMMERSIVE_SYNC: Ignoring - not from moderator');
                }
            });
        }
    }


    return result;
});