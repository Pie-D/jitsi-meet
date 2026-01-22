import React, { ComponentType, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState, IStore } from '../../app/types';
import { DEFAULT_LANGUAGE } from '../../base/i18n/i18next';
import { setRequestingSubtitles, setStageBilingualMode } from '../actions.any';
import { openDialog } from '../../base/dialog/actions';
import { StartRecordingDialog } from '../../recording/components/Recording/index';
// import { setRequestingSubtitles } from '../actions.any';
import { getAvailableSubtitlesLanguages } from '../functions.any';

export interface IAbstractLanguageSelectorDialogProps {
    dispatch: IStore['dispatch'];
    language: string | null;
    listItems: Array<any>;
    onLanguageSelected: (e: string) => void;
    subtitles: string;
    t: Function;
}


/**
 * Higher Order Component taking in a concrete LanguageSelector component and
 * augmenting it with state/behavior common to both web and native implementations.
 *
 * @param {React.Component} Component - The concrete component.
 * @returns {React.Component}
 */
const AbstractLanguageSelectorDialog = (Component: ComponentType<IAbstractLanguageSelectorDialogProps>) => () => {
    const dispatch = useDispatch();
    const { t } = useTranslation();
    const subtitlesState = useSelector((state: IReduxState) => state['features/subtitles']);
    const language = subtitlesState._language;
    const isStageBilingual = subtitlesState._isStageBilingualMode;

    // The value for the selected language contains "translation-languages:" prefix.
    const selectedLanguage = language?.replace('translation-languages:', '');
    const languageCodes = useSelector((state: IReduxState) => getAvailableSubtitlesLanguages(state, selectedLanguage));

    const noLanguageLabel = 'transcribing.subtitlesOff';
    const BILINGUAL_LABEL = 'transcribing.bilingual';

    const selected = isStageBilingual ? BILINGUAL_LABEL : (language ?? noLanguageLabel);
    const items = [
        noLanguageLabel,
        ...languageCodes.map((lang: string) => `translation-languages:${lang}`),
        BILINGUAL_LABEL
    ];
    const listItems = items
        .map((lang, index) => {
            return {
                id: lang + index,
                lang,
                selected: lang === selected
            };
        });
    const { conference } = useSelector((state: IReduxState) => state['features/base/conference']);

    const onLanguageSelected = useCallback((value: string) => {
        if (value === BILINGUAL_LABEL) {
            const fallbackLanguage = language ?? `translation-languages:${DEFAULT_LANGUAGE}`;

            dispatch(setStageBilingualMode(true));
            dispatch(setRequestingSubtitles(true, true, fallbackLanguage));

            return;
        }

        dispatch(setStageBilingualMode(false));

        const _selectedLanguage = value === noLanguageLabel ? null : value;
        const enabled = Boolean(_selectedLanguage);
        const displaySubtitles = enabled;

        if (conference?.getMetadataHandler()?.getMetadata()?.asyncTranscription) {
            dispatch(openDialog('StartRecordingDialog', StartRecordingDialog, {
                recordAudioAndVideo: false
            }));
        } else {
            dispatch(setRequestingSubtitles(enabled, displaySubtitles, _selectedLanguage));
        }
    }, [ conference, language ]);

    return (
        <Component
            dispatch = { dispatch }
            language = { language }
            listItems = { listItems }
            onLanguageSelected = { onLanguageSelected }
            subtitles = { selected }
            t = { t } />
    );
};

export default AbstractLanguageSelectorDialog;
