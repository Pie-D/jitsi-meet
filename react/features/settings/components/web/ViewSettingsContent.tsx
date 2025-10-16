import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import ContextMenu from '../../../base/ui/components/web/ContextMenu';
import ContextMenuItem from '../../../base/ui/components/web/ContextMenuItem';
import ContextMenuItemGroup from '../../../base/ui/components/web/ContextMenuItemGroup';
import { toggleViewSettings } from '../../actions.web';
import { setTileView } from '../../../video-layout/actions.any';
import { shouldDisplayTileView } from '../../../video-layout/functions.any';

const useStyles = makeStyles()(() => ({
    container: {
        position: 'relative',
        right: 'auto'
    }
}));

const ViewSettingsContent = () => {
    const { classes } = useStyles();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isTile = useSelector(shouldDisplayTileView);

    const selectTile = useCallback(() => {
        dispatch(setTileView(true));
        dispatch(toggleViewSettings());
    }, [ dispatch ]);

    const selectStage = useCallback(() => {
        dispatch(setTileView(false));
        dispatch(toggleViewSettings());
    }, [ dispatch ]);

    return (
        <ContextMenu
            activateFocusTrap = { true }
            className = { classes.container }
            hidden = { false }
            id = 'view-settings-dialog'>
            <ContextMenuItemGroup role = 'group'>
                <ContextMenuItem
                    accessibilityLabel = { t('toolbar.enterTileView') }
                    disabled = { isTile }
                    onClick = { selectTile }
                    role = 'menuitem'
                    text = { t('toolbar.enterTileView') } />
                <ContextMenuItem
                    accessibilityLabel = { t('toolbar.exitTileView') }
                    disabled = { !isTile }
                    onClick = { selectStage }
                    role = 'menuitem'
                    text = { t('toolbar.exitTileView') } />
            </ContextMenuItemGroup>
        </ContextMenu>
    );
};

export default ViewSettingsContent;


