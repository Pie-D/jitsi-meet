import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IconLanguageVN, IconLanguageEN } from '../../../../base/icons/svg';
import i18next from '../../i18next';
import { getConferenceState } from '../../../conference/functions';

/**
 * The styles for the LanguageToggleButton component.
 *
 * @param {Theme} theme - The MUI theme.
 * @returns {Object} The styles object.
 */
const useStyles = makeStyles()(theme => {
    return {
        toggleButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '40px',
            height: '40px',
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.action02,
            color: theme.palette.text01,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            userSelect: 'none',
            padding: 0,
            
            '&:hover': {
                backgroundColor: theme.palette.action01,
                borderColor: theme.palette.divider,
                transform: 'translateY(-1px)',
                boxShadow: theme.shadows[2]
            },
            
            '&:active': {
                transform: 'scale(0.95)',
                boxShadow: theme.shadows[1]
            },
            
            '&:focus': {
                outline: `2px solid ${theme.palette.focus01}`,
                outlineOffset: '2px'
            },
            
            '&:disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
                backgroundColor: theme.palette.action03,
                color: theme.palette.text03
            }
        },
        
        compact: {
            minWidth: '28px',
            height: '28px'
        },
        
        large: {
            minWidth: '48px',
            height: '48px'
        },
        
        icon: {
            width: '20px',
            height: '20px'
        },
        
        compactIcon: {
            width: '14px',
            height: '14px'
        },
        
        largeIcon: {
            width: '24px',
            height: '24px'
        }
    };
});

interface IProps {
    /**
     * Whether to use compact size.
     */
    compact?: boolean;
    
    /**
     * Whether to use large size.
     */
    large?: boolean;
    
    /**
     * Additional CSS class name.
     */
    className?: string;
    
    /**
     * Whether the button is disabled.
     */
    disabled?: boolean;
    
    /**
     * Test ID for testing purposes.
     */
    testId?: string;
}

/**
 * Component that renders a language toggle button to switch between Vietnamese and English.
 *
 * @param {IProps} props - The component props.
 * @returns {JSX.Element} - The rendered component.
 */
function LanguageToggleButton({ 
    compact = false, 
    large = false, 
    className = '', 
    disabled = false,
    testId = 'language-toggle-button'
}: IProps) {
    const { t, i18n } = useTranslation();
    const { classes } = useStyles();
    const dispatch = useDispatch();
    
    /**
     * Gets the current language code.
     */
    const getCurrentLanguage = useCallback(() => {
        return i18n.language || 'vi';
    }, [ i18n.language ]);
    
    /**
     * Gets the next language to toggle to.
     */
    const getNextLanguage = useCallback(() => {
        const current = getCurrentLanguage();
        return current === 'vi' ? 'en' : 'vi';
    }, [ getCurrentLanguage ]);
    
    /**
     * Gets the icon component for the current language.
     */
    const getLanguageIcon = useCallback(() => {
        const current = getCurrentLanguage();
        return current === 'vi' ? IconLanguageVN : IconLanguageEN;
    }, [ getCurrentLanguage ]);
    
    /**
     * Handles the language toggle.
     */
    const handleToggle = useCallback(() => {
        if (disabled) {
            return;
        }
        
        const nextLanguage = getNextLanguage();
        
        // Change the language using i18next
        i18next.changeLanguage(nextLanguage);
        
        // Update conference transcription language if available
        const state = (dispatch as any).getState?.();
        if (state) {
            const { conference } = getConferenceState(state);
            conference?.setTranscriptionLanguage(nextLanguage);
        }
    }, [ disabled, getNextLanguage, dispatch ]);
    
    /**
     * Handles keyboard events for accessibility.
     */
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    }, [ handleToggle ]);
    
    const buttonClasses = [
        classes.toggleButton,
        compact ? classes.compact : '',
        large ? classes.large : '',
        className
    ].filter(Boolean).join(' ');
    
    const iconClasses = [
        classes.icon,
        compact ? classes.compactIcon : '',
        large ? classes.largeIcon : ''
    ].filter(Boolean).join(' ');
    
    const LanguageIcon = getLanguageIcon();
    
    return (
        <button
            className = { buttonClasses }
            data-testid = { testId }
            disabled = { disabled }
            onClick = { handleToggle }
            onKeyPress = { handleKeyPress }
            role = 'button'
            tabIndex = { 0 }
            title = { t('settings.language') }
            type = 'button'>
            <LanguageIcon className = { iconClasses } />
        </button>
    );
}

export default LanguageToggleButton;
