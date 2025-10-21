import ReducerRegistry from '../base/redux/ReducerRegistry';
import { TRANSCRIBER_LEFT } from '../transcribing/actionTypes';

import {
    REMOVE_CACHED_TRANSCRIPT_MESSAGE,
    REMOVE_TRANSCRIPT_MESSAGE,
    SET_REQUESTING_SUBTITLES,
    SET_SUBTITLES_ERROR,
    STORE_SUBTITLE,
    TOGGLE_REQUESTING_SUBTITLES,
    UPDATE_TRANSCRIPT_MESSAGE
} from './actionTypes';
import { ISubtitle, ITranscriptMessage } from './types';

/**
 * Default State for 'features/transcription' feature.
 */
const defaultState = {
    _cachedTranscriptMessages: new Map(),
    _displaySubtitles: false,
    _transcriptMessages: new Map(),
    _requestingSubtitles: false,
    _language: null,
    messages: [],
    subtitlesHistory: [],
    _hasError: false
};

export interface ISubtitlesState {
    _cachedTranscriptMessages: Map<string, ITranscriptMessage>;
    _displaySubtitles: boolean;
    _hasError: boolean;
    _language: string | null;
    _requestingSubtitles: boolean;
    _transcriptMessages: Map<string, ITranscriptMessage>;
    messages: ITranscriptMessage[];
    subtitlesHistory: Array<ISubtitle>;
}

/**
 * Listen for actions for the transcription feature to be used by the actions
 * to update the rendered transcription subtitles.
 */
ReducerRegistry.register<ISubtitlesState>('features/subtitles', (
        state = defaultState, action): ISubtitlesState => {
    switch (action.type) {
    case REMOVE_TRANSCRIPT_MESSAGE:
        return _removeTranscriptMessage(state, action);
    case REMOVE_CACHED_TRANSCRIPT_MESSAGE:
        return _removeCachedTranscriptMessage(state, action);
    case UPDATE_TRANSCRIPT_MESSAGE:
        return _updateTranscriptMessage(state, action);
    case SET_REQUESTING_SUBTITLES:
        return {
            ...state,
            _displaySubtitles: action.displaySubtitles,
            _language: action.language,
            _requestingSubtitles: action.enabled,
            _hasError: false
        };
    case TOGGLE_REQUESTING_SUBTITLES:
        return {
            ...state,
            _requestingSubtitles: !state._requestingSubtitles,
            _hasError: false
        };
    case TRANSCRIBER_LEFT:
        return {
            ...state,
            ...defaultState
        };
    case STORE_SUBTITLE: {
        // Kiểm tra xem subtitle đã tồn tại chưa để tránh duplicate
        // Sử dụng participantId + text + timestamp để xác định duplicate
        const existingSubtitleIndex = state.subtitlesHistory.findIndex(subtitle => 
            subtitle.participantId === action.subtitle.participantId &&
            subtitle.text === action.subtitle.text &&
            Math.abs(subtitle.timestamp - action.subtitle.timestamp) < 1000 // Trong vòng 1 giây
        );
        
        // Nếu đã tồn tại thì không thêm nữa, chỉ cập nhật nếu cần
        if (existingSubtitleIndex !== -1) {
            // Có thể cập nhật interim status nếu cần
            const existingSubtitle = state.subtitlesHistory[existingSubtitleIndex];
            if (existingSubtitle.interim && !action.subtitle.interim) {
                // Cập nhật từ interim thành final
                const updatedSubtitles = [...state.subtitlesHistory];
                updatedSubtitles[existingSubtitleIndex] = action.subtitle;
                return {
                    ...state,
                    subtitlesHistory: updatedSubtitles
                };
            }
            // Nếu không cần cập nhật thì giữ nguyên
            return state;
        }
        
        // Thêm subtitle mới vào cuối mảng để hiển thị tuần tự như chat
        return {
            ...state,
            subtitlesHistory: [
                ...state.subtitlesHistory,
                action.subtitle
            ]
        };
    }
    case SET_SUBTITLES_ERROR:
        return {
            ...state,
            _hasError: action.hasError
        };
    }

    return state;
});

/**
 * Reduces a specific Redux action REMOVE_TRANSCRIPT_MESSAGE of the feature
 * transcription.
 *
 * @param {Object} state - The Redux state of the feature transcription.
 * @param {Action} action -The Redux action REMOVE_TRANSCRIPT_MESSAGE to reduce.
 * @returns {Object} The new state of the feature transcription after the
 * reduction of the specified action.
 */
function _removeTranscriptMessage(state: ISubtitlesState, { transcriptMessageID }: { transcriptMessageID: string; }) {
    const newTranscriptMessages = new Map(state._transcriptMessages);
    const message = newTranscriptMessages.get(transcriptMessageID);
    let { _cachedTranscriptMessages } = state;

    if (message && !message.final) {
        _cachedTranscriptMessages = new Map(_cachedTranscriptMessages);
        _cachedTranscriptMessages.set(transcriptMessageID, message);
    }

    // Deletes the key from Map once a final message arrives.
    newTranscriptMessages.delete(transcriptMessageID);

    return {
        ...state,
        _cachedTranscriptMessages,
        _transcriptMessages: newTranscriptMessages
    };
}


/**
 * Reduces a specific Redux action REMOVE_CACHED_TRANSCRIPT_MESSAGE of the feature transcription.
 *
 * @param {Object} state - The Redux state of the feature transcription.
 * @param {Action} action -The Redux action REMOVE_CACHED_TRANSCRIPT_MESSAGE to reduce.
 * @returns {Object} The new state of the feature transcription after the reduction of the specified action.
 */
function _removeCachedTranscriptMessage(state: ISubtitlesState,
        { transcriptMessageID }: { transcriptMessageID: string; }) {
    const newCachedTranscriptMessages = new Map(state._cachedTranscriptMessages);

    // Deletes the key from Map once a final message arrives.
    newCachedTranscriptMessages.delete(transcriptMessageID);

    return {
        ...state,
        _cachedTranscriptMessages: newCachedTranscriptMessages
    };
}

/**
 * Reduces a specific Redux action UPDATE_TRANSCRIPT_MESSAGE of the feature
 * transcription.
 *
 * @param {Object} state - The Redux state of the feature transcription.
 * @param {Action} action -The Redux action UPDATE_TRANSCRIPT_MESSAGE to reduce.
 * @returns {Object} The new state of the feature transcription after the
 * reduction of the specified action.
 */
function _updateTranscriptMessage(state: ISubtitlesState, { transcriptMessageID, newTranscriptMessage }:
{ newTranscriptMessage: ITranscriptMessage; transcriptMessageID: string; }) {
    const newTranscriptMessages = new Map(state._transcriptMessages);
    const _cachedTranscriptMessages = new Map(state._cachedTranscriptMessages);

    _cachedTranscriptMessages.delete(transcriptMessageID);

    // Updates the new message for the given key in the Map.
    newTranscriptMessages.set(transcriptMessageID, newTranscriptMessage);

    return {
        ...state,
        _cachedTranscriptMessages,
        _transcriptMessages: newTranscriptMessages
    };
}
