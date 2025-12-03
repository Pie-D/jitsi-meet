import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { IStore } from '../app/types';
import { AnyAction } from 'redux';
import { getParticipantByIdOrUndefined, isOwnerParticipant, isRoomOwner, isLocalParticipantModerator } from '../base/participants/functions';
import { JitsiConferenceEvents } from '../../../../lib-jitsi-meet/JitsiConferenceEvents';
import {
    setImmersiveAssignments,
    setImmersiveEnabled,
    setImmersiveTemplate,
    setImmersiveSlotCount
} from './actions';

// Flag để đảm bảo listener chỉ được đăng ký một lần
let immersiveViewListenerRegistered = false;

function isSenderOwner(state: any, participantId: string) {
    const participant = getParticipantByIdOrUndefined(state, participantId);
    const roomOwnerId = state['features/base/conference']?.conference?.room?.roomOwner;
    return isRoomOwner(participant, roomOwnerId);
}

/**
 * Middleware để handle immersive view events từ XMPP.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);
    const { dispatch, getState } = store;

    // Reset listener khi rời conference để join phòng khác có thể đăng ký lại
    if (action.type === 'CONFERENCE_LEFT') {
        immersiveViewListenerRegistered = false;
    }

    // Đăng ký listener cho conference events khi conference được tạo
    if (action.type === 'CONFERENCE_JOINED' && !immersiveViewListenerRegistered) {
        immersiveViewListenerRegistered = true;
        
        const state = getState();
        const conference = state['features/base/conference'].conference;
        
        if (conference) {
            // Listen for immersive view events
            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ENABLED, (participantId: string, enabled: boolean) => {
                const currentState = getState();
                if (isSenderOwner(currentState, participantId)) {
                    dispatch(setImmersiveEnabled(enabled));
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_TEMPLATE_CHANGED, (participantId: string, templateId: string) => {
                const currentState = getState();
                if (isSenderOwner(currentState, participantId)) {
                    dispatch(setImmersiveTemplate(templateId));
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_SLOT_COUNT_CHANGED, (participantId: string, slotCount: number) => {
                const currentState = getState();
                if (isSenderOwner(currentState, participantId)) {
                    dispatch(setImmersiveSlotCount(slotCount));
                }
            });

            conference.on(JitsiConferenceEvents.IMMERSIVE_VIEW_ASSIGNMENTS_CHANGED, (participantId: string, payload: any) => {
                const currentState = getState();
                if (isSenderOwner(currentState, participantId)) {
                    // Sync assignments
                    dispatch(setImmersiveAssignments(payload.assignments || payload));
                    
                    // Sync template và slot count nếu có
                    if (payload.templateId) {
                        dispatch(setImmersiveTemplate(payload.templateId));
                    }
                    if (payload.slotCount) {
                        dispatch(setImmersiveSlotCount(payload.slotCount));
                    }
                }
            });
        }
    }


    return result;
});