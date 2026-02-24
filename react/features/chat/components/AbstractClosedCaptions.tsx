import React, { ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { IReduxState } from '../../app/types';
import { openDialog } from '../../base/dialog/actions';
import { IMessageGroup, groupMessagesBySender } from '../../base/util/messageGrouping';
// @ts-ignore
import { StartRecordingDialog } from '../../recording/components/Recording';
import { setRequestingSubtitles } from '../../subtitles/actions.any';
import { canStartSubtitles } from '../../subtitles/functions.any';
import { ISubtitle } from '../../subtitles/types';
import { isTranscribing } from '../../transcribing/functions';

export type AbstractProps = {
    canStartSubtitles: boolean;
    filteredSubtitles: ISubtitle[];
    groupedSubtitles: IMessageGroup<ISubtitle>[];
    isButtonPressed: boolean;
    isTranscribing: boolean;
    startClosedCaptions: () => void;
    isBilingualMode: boolean;
    setIsBilingualMode: (isBilingual: boolean) => void;
};

const AbstractClosedCaptions = (Component: ComponentType<AbstractProps>) => () => {
    const dispatch = useDispatch();
    const subtitles = useSelector((state: IReduxState) => state['features/subtitles'].subtitlesHistory);
    const language = useSelector((state: IReduxState) => state['features/subtitles']._language);
    const selectedLanguage = language?.replace('translation-languages:', '');
    const _isTranscribing = useSelector(isTranscribing);
    const _canStartSubtitles = useSelector(canStartSubtitles);
    const [ isButtonPressed, setButtonPressed ] = useState(false);
    const subtitlesError = useSelector((state: IReduxState) => state['features/subtitles']._hasError);
    const [ isBilingualMode, setIsBilingualMode ] = useState(false);
    const isAsyncTranscriptionEnabled = useSelector((state: IReduxState) =>
        state['features/base/conference'].conference?.getMetadataHandler()?.getMetadata()?.asyncTranscription);

    const filteredSubtitles = useMemo(() => {
        // console.log('=== ClosedCaptionsTab filteredSubtitles ===', { subtitles, selectedLanguage });
        
        // Lọc và loại bỏ duplicate phụ đề dựa trên id và timestamp
        // Chỉ giữ lại phụ đề transcription (không phải translation)
        const transcriptionSubtitles = subtitles
            .filter(s => s.isTranscription)
            .reduce((acc, current) => {
                // Kiểm tra xem đã có subtitle với cùng id và timestamp chưa
                const existingIndex = acc.findIndex(item => 
                    item.id === current.id && 
                    item.timestamp === current.timestamp &&
                    item.participantId === current.participantId
                );
                
                // Nếu chưa có thì thêm vào, nếu có rồi thì bỏ qua (tránh duplicate)
                if (existingIndex === -1) {
                    acc.push(current);
                }
                
                return acc;
            }, [] as ISubtitle[])
            .sort((a, b) => a.timestamp - b.timestamp); // Sắp xếp theo timestamp

        if (!selectedLanguage) {
            // When no language is selected, show all original transcriptions
            return transcriptionSubtitles;
        }

        // When a language is selected, for each transcription message:
        // 1. Use its translation if available
        // 2. Fall back to the original transcription if no translation exists
        const translationMessages = new Map(
            subtitles
                .filter(s => !s.isTranscription && s.language === selectedLanguage)
                .map(s => [ s.id, s ])
        );

        return transcriptionSubtitles.map(m => translationMessages.get(m.id) ?? m);
    }, [ subtitles, selectedLanguage ]);

    const groupedSubtitles = useMemo(() =>
        groupMessagesBySender(filteredSubtitles), [ filteredSubtitles ]);

    const startClosedCaptions = useCallback(() => {
        if (isAsyncTranscriptionEnabled) {
            dispatch(openDialog('StartRecordingDialog', StartRecordingDialog, {
                recordAudioAndVideo: false
            }));
        } else {
            if (isButtonPressed) {
                return;
            }
            dispatch(setRequestingSubtitles(true, false, null));
            setButtonPressed(true);
        }

    }, [ isAsyncTranscriptionEnabled, dispatch, isButtonPressed, openDialog, setButtonPressed ]);

    useEffect(() => {
        if (subtitlesError && isButtonPressed && !isAsyncTranscriptionEnabled) {
            setButtonPressed(false);
        }
    }, [ subtitlesError, isButtonPressed, isAsyncTranscriptionEnabled ]);

    useEffect(() => {
        if (!_isTranscribing && isButtonPressed && !isAsyncTranscriptionEnabled) {
            setButtonPressed(false);
        }
    }, [ _isTranscribing, isButtonPressed, isAsyncTranscriptionEnabled ]);

    useEffect(() => {
        if (isButtonPressed && !isAsyncTranscriptionEnabled) {
            setButtonPressed(false);
        }
    }, [ isButtonPressed, isAsyncTranscriptionEnabled ]);

    return (
        <Component
            canStartSubtitles = { _canStartSubtitles }
            filteredSubtitles = { filteredSubtitles }
            groupedSubtitles = { groupedSubtitles }
            isButtonPressed = { isButtonPressed }
            isTranscribing = { _isTranscribing }
            startClosedCaptions = { startClosedCaptions } 
            isBilingualMode = { isBilingualMode } 
            setIsBilingualMode = { setIsBilingualMode } />
    );
};

export default AbstractClosedCaptions;

