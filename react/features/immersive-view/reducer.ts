import ReducerRegistry from '../base/redux/ReducerRegistry';
import { DEFAULT_IMMERSIVE_SLOT_COUNT } from './constants';

import {
    SET_IMMERSIVE_ASSIGNMENTS,
    SET_IMMERSIVE_ENABLED,
    SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER,
    SET_IMMERSIVE_TEMPLATE,
    SET_IMMERSIVE_SLOT_COUNT
} from './actionTypes';

// Import middleware để sync qua XMPP
import './middleware';
import './xmppMiddleware';

export interface IImmersiveState {
    enabled: boolean;
    templateId?: string;
    followActiveSpeaker?: boolean;
    assignments: { [slotIndex: number]: string; };
    slotCount: number;
}

const DEFAULT_STATE: IImmersiveState = {
    enabled: false,
    templateId: undefined,
    followActiveSpeaker: false,
    assignments: {},
    slotCount: DEFAULT_IMMERSIVE_SLOT_COUNT
};

ReducerRegistry.register<IImmersiveState>('features/immersive-view', (state = DEFAULT_STATE, action): IImmersiveState => {
    // Chỉ log immersive view actions
    if (action.type === SET_IMMERSIVE_ENABLED ||
        action.type === SET_IMMERSIVE_TEMPLATE ||
        action.type === SET_IMMERSIVE_SLOT_COUNT ||
        action.type === SET_IMMERSIVE_ASSIGNMENTS ||
        action.type === SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER) {
        console.log('🔄 [ImmersiveView Reducer] Action:', action.type, action);
    }
    
    switch (action.type) {
    case SET_IMMERSIVE_ENABLED:
        console.log('✅ [ImmersiveView Reducer] Setting enabled:', action.enabled);
        return {
            ...state,
            enabled: action.enabled
        };
    case SET_IMMERSIVE_TEMPLATE:
        console.log('✅ [ImmersiveView Reducer] Setting template:', action.templateId);
        return {
            ...state,
            templateId: action.templateId
        };
    case SET_IMMERSIVE_SLOT_COUNT:
        console.log('✅ [ImmersiveView Reducer] Setting slot count:', action.slotCount);
        return {
            ...state,
            slotCount: action.slotCount
        };
    case SET_IMMERSIVE_ASSIGNMENTS:
        console.log('✅ [ImmersiveView Reducer] Setting assignments:', action.assignments);
        return {
            ...state,
            assignments: action.assignments
        };
    case SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER:
        console.log('✅ [ImmersiveView Reducer] Setting follow active speaker:', action.enabled);
        return {
            ...state,
            followActiveSpeaker: action.enabled
        };
    }
    return state;
});


