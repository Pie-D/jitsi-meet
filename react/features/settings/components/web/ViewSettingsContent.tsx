import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { isMobileBrowser } from '../../../base/environment/utils';
import ContextMenu from '../../../base/ui/components/web/ContextMenu';
import ContextMenuItem from '../../../base/ui/components/web/ContextMenuItem';
import ContextMenuItemGroup from '../../../base/ui/components/web/ContextMenuItemGroup';
import { toggleViewSettings } from '../../actions.web';
import { setTileView } from '../../../video-layout/actions.any';
import { shouldDisplayTileView } from '../../../video-layout/functions.any';
import { IconGalleryView, IconImmersiveView, IconSpeakerView } from '../../../base/icons/svg';
import { setImmersiveEnabled, setImmersiveTemplate } from '../../../immersive-view/actions';
import ImmersiveSetupDialog from '../../../immersive-view/components/ImmersiveSetupDialog';
import { openDialog } from '../../../base/dialog/actions';
import { IReduxState as IState } from '../../../app/types';
import '../../../immersive-view/reducer';
import {isLocalParticipantModerator, isLocalRoomOwner} from '../../../base/participants/functions';
const useStyles = makeStyles()(() => ({
    container: {
        position: 'relative',
        right: 'auto',
        marginBottom: '4px',
        minWidth: '150px'
    }
}));

const ViewSettingsContent = () => {
    const { classes } = useStyles();
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const isTile = useSelector(shouldDisplayTileView);
    const immersiveEnabled = useSelector((state: IReduxState) => state['features/immersive-view']?.enabled);
    // const isOwner = useSelector((state: IState) => {
    //     const features: any = state['features/base/participants'].local?.features as any;
    //     const raw = features?.owner ?? features?.isOwner;
    //     return typeof raw === 'string' ? raw.toLowerCase() === 'true' : Boolean(raw);
    // });
    const isOwner = useSelector(isLocalRoomOwner);
    const isMobile = isMobileBrowser();

    const selectTile = useCallback(() => {
        dispatch(setImmersiveEnabled(false));
        dispatch(setTileView(true));
        dispatch(toggleViewSettings());
    }, [ dispatch ]);

    const selectStage = useCallback(() => {
        dispatch(setImmersiveEnabled(false));
        dispatch(setTileView(false));
        dispatch(toggleViewSettings());
    }, [ dispatch ]);

    const selectImmersive = useCallback(() => {
        dispatch(setTileView(false));
        dispatch(toggleViewSettings());
        dispatch(openDialog('immersiveSetupDialog', ImmersiveSetupDialog));
    }, [ dispatch ]);

    return (
        <ContextMenu
            activateFocusTrap={true}
            className={classes.container}
            hidden={false}
            id='view-settings-dialog'>
            <ContextMenuItemGroup role='group'>
                <ContextMenuItem
                    accessibilityLabel={t('toolbar.speakerView')}
                    icon={IconSpeakerView}
                    onClick={selectStage}
                    role='menuitem'
                    selected={!isTile && !immersiveEnabled}
                    text={t('toolbar.speakerView')} />
                <ContextMenuItem
                    accessibilityLabel={t('toolbar.galleryView')}
                    icon={IconGalleryView}
                    onClick={selectTile}
                    role='menuitem'
                    selected={isTile && !immersiveEnabled} 
                    text={t('toolbar.galleryView')} />

                {/* immersive view - chỉ owner mới có thể sử dụng và chỉ trên desktop */}
                {isOwner && !isMobile && (

                    <ContextMenuItem
                        accessibilityLabel={t('toolbar.immersiveView')}
                        icon={IconImmersiveView}
                        onClick={selectImmersive}
                        role='menuitem'
                        selected={immersiveEnabled}
                        text={t('toolbar.immersiveView')} />
                )}

            </ContextMenuItemGroup>
        </ContextMenu>
    );
};

export default ViewSettingsContent;


