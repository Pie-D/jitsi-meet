import ReducerRegistry from '../base/redux/ReducerRegistry';
import { DEFAULT_IMMERSIVE_SLOT_COUNT } from './constants';

import {
    SET_IMMERSIVE_ASSIGNMENTS,
    SET_IMMERSIVE_ENABLED,
    SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER,
    SET_IMMERSIVE_TEMPLATE,
    SET_IMMERSIVE_SLOT_COUNT
} from './actionTypes';

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
    switch (action.type) {
    case SET_IMMERSIVE_ENABLED:
        return {
            ...state,
            enabled: action.enabled
        };
    case SET_IMMERSIVE_TEMPLATE:
        return {
            ...state,
            templateId: action.templateId
        };
    case SET_IMMERSIVE_SLOT_COUNT:
        return {
            ...state,
            slotCount: action.slotCount
        };
    case SET_IMMERSIVE_ASSIGNMENTS:
        return {
            ...state,
            assignments: action.assignments
        };
    case SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER:
        return {
            ...state,
            followActiveSpeaker: action.enabled
        };
    }
    return state;
});


