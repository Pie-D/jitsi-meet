import ReducerRegistry from "../base/redux/ReducerRegistry";
import { SET_SAVESPEECHTOTEXT_OPEN } from "./actionTypes";

export interface ISaveSpeechToTextState {
    isOpen: boolean;
}

const DEFAULT_STATE: ISaveSpeechToTextState = {
    isOpen: false
};

export interface ISaveSpeechToTextAction extends Partial<ISaveSpeechToTextState> {
    isOpen: boolean;
    type: string;
}

ReducerRegistry.register<ISaveSpeechToTextState>(
    'features/saveSpeechToText',
    (state = DEFAULT_STATE, action): ISaveSpeechToTextState  => {
        switch (action.type) {
            case SET_SAVESPEECHTOTEXT_OPEN: {
                return {
                    ...state,
                    isOpen: action.isOpen
                };
            }
        }

        return state;
    });