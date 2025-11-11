import { Theme } from '@mui/material';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { getParticipantDisplayName } from '../../../base/participants/functions';
import { ISubtitle } from '../../../subtitles/types';

/**
 * Props for the SubtitleMessage component.
 */
interface IProps extends ISubtitle {

    /**
     * Whether to show the display name of the participant.
     */
    showDisplayName: boolean;

    /**
     * Whether to display both languages (bilingual mode).
     */
    isBilingualMode?: boolean;
}

/**
 * The styles for the SubtitleMessage component.
 */
const useStyles = makeStyles()((theme: Theme) => {
    return {
        messageContainer: {
            backgroundColor: theme.palette.ui02,
            borderRadius: '4px 12px 12px 12px',
            padding: '12px',
            maxWidth: '100%',
            marginTop: '4px',
            boxSizing: 'border-box',
            display: 'inline-flex'
        },

        messageContent: {
            maxWidth: '100%',
            overflow: 'hidden',
            flex: 1
        },

        messageHeader: {
            ...theme.typography.labelBold,
            color: theme.palette.text02,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            marginBottom: theme.spacing(1),
            maxWidth: '130px'
        },

        messageText: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text01,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        },
        alternateLanguageText: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text01,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            backgroundColor: theme.palette.ui03,
            padding: '8px',
            borderRadius: '4px',
            marginTop: theme.spacing(1)
        },

        timestampRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: theme.spacing(1),
            gap: theme.spacing(1)
        },

        timestamp: {
            ...theme.typography.labelRegular,
            color: theme.palette.text03
        },

        translateButton: {
            ...theme.typography.labelRegular,
            color: theme.palette.link01,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s',
            '&:hover': {
                backgroundColor: theme.palette.ui03
            }
        },

        interim: {
            opacity: 0.7
        }
    };
});

/**
 * Parses text that might be JSON with vi/en structure
 * @param {string} text - The text to parse
 * @returns {Object} - Object with vi and en properties, or null if not JSON
 */
function parseMessageText(text: string): { vi?: string; en?: string } | null {
    try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null && ('vi' in parsed || 'en' in parsed)) {
            return parsed;
        }
    } catch (e) {
        // Not JSON, return null
    }
    return null;
}

/**
 * Gets the default language to display based on selected language
 * @param {string | null} selectedLanguage - The selected language from LanguageSelector
 * @returns {'vi' | 'en'} - The default language to display
 */
function getDefaultLanguage(selectedLanguage: string | null | undefined): 'vi' | 'en' {
    if (!selectedLanguage) {
        // Original selected, default to Vietnamese
        return 'vi';
    }
    
    // Remove 'translation-languages:' prefix if present
    const lang = selectedLanguage.replace('translation-languages:', '');
    
    if (lang === 'en') {
        return 'en';
    }
    
    // Default to Vietnamese for 'vi' or any other language
    return 'vi';
}

/**
 * Component that renders a single subtitle message with the participant's name,
 * message content, and timestamp.
 *
 * @param {IProps} props - The component props.
 * @returns {JSX.Element} - The rendered subtitle message.
 */
export default function SubtitleMessage({ participantId, text, timestamp, interim, showDisplayName, isBilingualMode = false }: IProps) {
    const { classes } = useStyles();
    const participantName = useSelector((state: IReduxState) =>
        getParticipantDisplayName(state, participantId));
    const selectedLanguage = useSelector((state: IReduxState) => state['features/subtitles']._language);
    const [showTranslation, setShowTranslation] = useState(false);

    // Parse text to check if it's JSON with vi/en structure
    const parsedText = parseMessageText(text);
    const isBilingual = parsedText !== null;

    // Determine default language based on selection
    const defaultLang = getDefaultLanguage(selectedLanguage);
    const alternateLang = defaultLang === 'vi' ? 'en' : 'vi';

    // Determine what text to display
    let displayText = text;
    let alternateText: string | null = null;
    
    if (isBilingual) {
        if (isBilingualMode) {
            // Bilingual mode: show both languages
            const defaultText = parsedText[defaultLang] || '';
            const alternateTextValue = parsedText[alternateLang] || '';
            
            displayText = defaultText || alternateTextValue || text;
            // Only show alternate text if it's different from default text
            if (alternateTextValue && alternateTextValue !== defaultText) {
                alternateText = alternateTextValue;
            }
        } else if (showTranslation) {
            // Show alternate language when translation button is clicked
            displayText = parsedText[alternateLang] || parsedText[defaultLang] || text;
        } else {
            // Show default language based on selection
            displayText = parsedText[defaultLang] || parsedText[alternateLang] || text;
        }
    }

    return (
        <div className = { `${classes.messageContainer} ${interim ? classes.interim : ''}` }>
            <div className = { classes.messageContent }>
                {showDisplayName && (
                    <div className = { classes.messageHeader }>
                        {participantName}
                    </div>
                )}
                <div className = { classes.messageText }>{displayText}</div>
                {isBilingualMode && alternateText && (
                    <div className = { classes.alternateLanguageText }>{alternateText}</div>
                )}
                <div className = { classes.timestampRow }>
                    <div className = { classes.timestamp }>
                        {new Date(timestamp).toLocaleTimeString()}
                    </div>
                    {!isBilingualMode && isBilingual && (parsedText.vi || parsedText.en) && (
                        <button
                            className = { classes.translateButton }
                            onClick = { () => setShowTranslation(!showTranslation) }>
                            {showTranslation ? 'Ẩn dịch' : 'Dịch'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
