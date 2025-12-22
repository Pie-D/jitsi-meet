import React from 'react';
import { useTranslation } from 'react-i18next';
import { makeStyles } from 'tss-react/mui';

import CopyButton from '../../../../base/buttons/CopyButton.web';

interface IProps {

    /**
     * Địa chỉ theo cú pháp room@domain cho thiết bị Cisco.
     */
    address: string;
}

const useStyles = makeStyles()(theme => {
    return {
        label: {
            display: 'block',
            marginBottom: theme.spacing(2)
        }
    };
});

/**
 * Khối copy địa chỉ để người dùng tham gia từ thiết bị Cisco.
 */
function CiscoMeetingLinkSection({ address }: IProps) {
    const { classes } = useStyles();
    const { t } = useTranslation();

    return (
        <>
            <p className = { classes.label }>{t('addPeople.shareCiscoInvite')}</p>
            <CopyButton
                accessibilityText = { address }
                className = 'invite-more-dialog-conference-url'
                displayedText = { address }
                id = 'add-people-copy-cisco-button'
                textOnCopySuccess = { t('addPeople.linkCopied') }
                textOnHover = { t('addPeople.copyLinkCisco') }
                textToCopy = { address } />
        </>
    );
}

export default CiscoMeetingLinkSection;

