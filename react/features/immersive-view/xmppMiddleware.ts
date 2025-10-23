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
        console.log('🎯 [ImmersiveView XMPP Middleware] Registering conference event listeners');
        immersiveViewListenerRegistered = true;
        
        const state = getState();
        const conference = state['features/base/conference'].conference;
        
        if (conference) {
            // Listen for immersive view events
            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED, (participantId: string, enabled: boolean) => {
                console.log('🎯 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_ENABLED event:', { participantId, enabled });
                
                // Chỉ sync từ moderator
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                console.log('👤 [ImmersiveView XMPP Middleware] Participant:', participant);
                console.log('👤 [ImmersiveView XMPP Middleware] Participant role:', participant?.role);
                
                if (participant && participant.role === 'moderator') {
                    console.log('✅ [ImmersiveView XMPP Middleware] Syncing from moderator, dispatching setImmersiveEnabled:', enabled);
                    dispatch(setImmersiveEnabled(enabled));
                } else {
                    console.log('❌ [ImmersiveView XMPP Middleware] Not from moderator, ignoring. Role:', participant?.role);
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED, (participantId: string, templateId: string) => {
                console.log('🎨 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_TEMPLATE_CHANGED event:', { participantId, templateId });
                
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    console.log('✅ [ImmersiveView XMPP Middleware] Syncing template from moderator:', templateId);
                    dispatch(setImmersiveTemplate(templateId));
                } else {
                    console.log('❌ [ImmersiveView XMPP Middleware] Template not from moderator, ignoring');
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED, (participantId: string, slotCount: number) => {
                console.log('📊 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_SLOT_COUNT_CHANGED event:', { participantId, slotCount });
                
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    console.log('✅ [ImmersiveView XMPP Middleware] Syncing slot count from moderator:', slotCount);
                    dispatch(setImmersiveSlotCount(slotCount));
                } else {
                    console.log('❌ [ImmersiveView XMPP Middleware] Slot count not from moderator, ignoring');
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED, (participantId: string, assignments: any) => {
                console.log('👥 [ImmersiveView XMPP Middleware] Received IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED event:', { participantId, assignments });
                
                const currentState = getState();
                const participant = currentState['features/base/participants'].remote.get(participantId);
                
                if (participant && participant.role === 'moderator') {
                    console.log('✅ [ImmersiveView XMPP Middleware] Syncing assignments from moderator:', assignments);
                    dispatch(setImmersiveAssignments(assignments));
                } else {
                    console.log('❌ [ImmersiveView XMPP Middleware] Assignments not from moderator, ignoring');
                }
            });
        }
    }

    // Log tất cả actions để debug
    if (action.type && action.type.includes('IMMERSIVE')) {
        console.log('📡 [ImmersiveView XMPP Middleware] Action:', action.type, action);
    }

    return result;
});