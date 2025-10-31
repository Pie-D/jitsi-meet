import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { IStore } from '../app/types';
import { AnyAction } from 'redux';
import { setImmersiveEnabled, setImmersiveSlotCount, setImmersiveTemplate, setImmersiveAssignments } from './actions';
import {
    SET_IMMERSIVE_ENABLED,
    SET_IMMERSIVE_TEMPLATE,
    SET_IMMERSIVE_SLOT_COUNT,
    SET_IMMERSIVE_ASSIGNMENTS
} from './actionTypes';
import {isLocalParticipantModerator, isLocalRoomOwner} from '../base/participants/functions';
/**
 * Middleware để sync immersive view state qua XMPP.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);
    const { dispatch, getState } = store;
    const state = getState();
    const conference = state['features/base/conference'].conference;
    // Đăng ký lắng nghe presence để đồng bộ immersive view từ moderator tới những client khác
        if (conference && !(window as any)._immersivePresenceListenersRegistered) {
        (window as any)._immersivePresenceListenersRegistered = true;

        // Helper: safely extract value from presence payload
        const extractValue = (data: any): any => {
            // Presence handler receives object like { value, attributes, ... }
            if (!data) {
                return undefined;
            }
            if (typeof data === 'object' && 'value' in data) {
                return (data as any).value;
            }

            return data;
        };

        // enabled flag
        conference.addCommandListener('jitsi_participant_immersive_view_enabled', (payload: any) => {
            const value = extractValue(payload);
            const enabled = String(value) === 'true';
            (window as any)._immersiveSuppressSend = true;
            dispatch(setImmersiveEnabled(enabled));
            (window as any)._immersiveSuppressSend = false;
        });

        // template id
        conference.addCommandListener('jitsi_participant_immersive_view_template', (payload: any) => {
            const value = extractValue(payload);
            if (typeof value === 'string' && value.length) {
                (window as any)._immersiveSuppressSend = true;
                dispatch(setImmersiveTemplate(value));
                (window as any)._immersiveSuppressSend = false;
            }
        });

        // slot count
        conference.addCommandListener('jitsi_participant_immersive_view_slot_count', (payload: any) => {
            const value = extractValue(payload);
            const num = Number.parseInt(String(value), 10);
            if (!Number.isNaN(num)) {
                (window as any)._immersiveSuppressSend = true;
                dispatch(setImmersiveSlotCount(num));
                (window as any)._immersiveSuppressSend = false;
            }
        });

        // assignments (JSON string)
        conference.addCommandListener('jitsi_participant_immersive_view_assignments', (payload: any) => {
            try {
                const value = extractValue(payload);
                const json = typeof value === 'string' ? JSON.parse(value) : value;
                if (json && typeof json === 'object') {
                    (window as any)._immersiveSuppressSend = true;
                    dispatch(setImmersiveAssignments(json));
                    (window as any)._immersiveSuppressSend = false;
                }
            } catch (e) {
                // ignore malformed data
            }
        });
    }
    // Chỉ log immersive view actions
    if (!conference) {
        return result;
    }

    // Chỉ owner (flag trong JWT features) mới được gửi immersive view settings qua XMPP hoặc participant join first time
    // const localFeatures: any = state['features/base/participants']?.local?.features as any;
    // const ownerRaw = localFeatures?.owner ?? localFeatures?.isOwner;
    // const isOwner = typeof ownerRaw === 'string' ? ownerRaw.toLowerCase() === 'true' : Boolean(ownerRaw);
    const isOwner = isLocalRoomOwner(state);
    const suppress = (window as any)._immersiveSuppressSend === true;
    switch (action.type) {
    case SET_IMMERSIVE_ENABLED: {
        if (isOwner && !suppress) {
            conference.setImmersiveViewEnabled(action.enabled);
        } 
        break;
    }
    case SET_IMMERSIVE_TEMPLATE: {
        if (isOwner && action.templateId && !suppress) {
            conference.setImmersiveViewTemplate(action.templateId);
        } 
        break;
    }
    case SET_IMMERSIVE_SLOT_COUNT: {
        if (isOwner && !suppress) {
            conference.setImmersiveViewSlotCount(action.slotCount);
        } 
        break;
    }
    case SET_IMMERSIVE_ASSIGNMENTS: {
        // console.log('🔥 IMMERSIVE_SYNC: SENDING assignments:', action.assignments);
        if (isOwner && !suppress) {
            // Lấy thông tin template và slot count từ state
            const immersiveState = state['features/immersive-view'];
            const templateId = immersiveState?.templateId;
            const slotCount = immersiveState?.slotCount;
            
            // Gửi metadata để user tự tính toán vị trí responsive
            conference.sendImmersiveViewAssignments(action.assignments, templateId, slotCount);
        } 
        break;
    }
    }

    return result;
});
