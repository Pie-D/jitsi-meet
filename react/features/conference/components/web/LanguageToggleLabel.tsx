import React from 'react';
import { makeStyles } from 'tss-react/mui';

import LanguageToggleButton from '../../../base/i18n/components/web/LanguageToggleButton';

/**
 * The styles for the LanguageToggleLabel component.
 *
 * @param {Theme} theme - The MUI theme.
 * @returns {Object} The styles object.
 */
const useStyles = makeStyles()(theme => {
    return {
        container: {
            display: 'flex',
            alignItems: 'center',
            margin: '0 2px',
            height: '28px',
            boxSizing: 'border-box'
        }
    };
});

/**
 * Component that renders a language toggle button in the conference info header.
 *
 * @returns {JSX.Element} - The rendered component.
 */
function LanguageToggleLabel() {
    const { classes } = useStyles();
    
    return (
        <div className = { classes.container }>
            <LanguageToggleButton 
                compact = { true }
                testId = 'conference.languageToggle' />
        </div>
    );
}

export default LanguageToggleLabel;
