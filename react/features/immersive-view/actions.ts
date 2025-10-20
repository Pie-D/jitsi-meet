import { IStore } from '../app/types';

import {
    SET_IMMERSIVE_ASSIGNMENTS,
    SET_IMMERSIVE_ENABLED,
    SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER,
    SET_IMMERSIVE_TEMPLATE,
    SET_IMMERSIVE_SLOT_COUNT
} from './actionTypes';

export function setImmersiveEnabled(enabled: boolean) {
    return {
        type: SET_IMMERSIVE_ENABLED,
        enabled
    };
}

export function setImmersiveTemplate(templateId?: string) {
    return {
        type: SET_IMMERSIVE_TEMPLATE,
        templateId
    };
}

export function setImmersiveSlotCount(slotCount: number) {
    return {
        type: SET_IMMERSIVE_SLOT_COUNT,
        slotCount
    } as const;
}

export function setImmersiveAssignments(assignments: { [slotIndex: number]: string; }) {
    return {
        type: SET_IMMERSIVE_ASSIGNMENTS,
        assignments
    };
}

export function setImmersiveFollowActiveSpeaker(enabled: boolean) {
    return {
        type: SET_IMMERSIVE_FOLLOW_ACTIVE_SPEAKER,
        enabled
    };
}

export function swapImmersiveSlots(srcIndex: number, dstIndex: number) {
    return (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState()['features/immersive-view'];
        const next = { ...(state?.assignments || {}) } as { [slotIndex: number]: string; };
        const tmp = next[srcIndex];
        next[srcIndex] = next[dstIndex];
        next[dstIndex] = tmp;

        dispatch(setImmersiveAssignments(next));
    };
}


