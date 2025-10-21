import React, { ReactNode } from 'react';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import Popover from '../../../base/popover/components/Popover.web';
import { toggleViewSettings } from '../../actions.web';
import { setToolboxVisible } from '../../../toolbox/actions.web';
import { useDispatch } from 'react-redux';
import { getViewSettingsVisibility } from '../../functions.web';

import ViewSettingsContent from './ViewSettingsContent';

interface IProps {
    children: ReactNode;
    isOpen: boolean;
    onClose: Function;
    popupPlacement: string;
}

const useStyles = makeStyles()(() => ({
    container: {
        background: 'none',
        display: 'inline-block'
    }
}));

function ViewSettingsPopup({ children, isOpen, onClose, popupPlacement }: IProps) {
    const { classes, cx } = useStyles();
    const dispatch = useDispatch();

    return (
        <div className = { cx('video-preview', classes.container) }>
            <Popover
                allowClick = { true }
                content = { <ViewSettingsContent/> }
                headingId = 'view-settings-button'
                onPopoverClose = { () => {
                    onClose();
                    dispatch(setToolboxVisible(false));
                } }
                position = { popupPlacement }
                role = 'menu'
                trigger = 'click'
                visible = { isOpen }>
                { children }
            </Popover>
        </div>
    );
}

function mapStateToProps(state: IReduxState) {
    return {
        isOpen: Boolean(getViewSettingsVisibility(state)),
        popupPlacement: 'top-end'
    };
}

const mapDispatchToProps = {
    onClose: toggleViewSettings
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewSettingsPopup);


