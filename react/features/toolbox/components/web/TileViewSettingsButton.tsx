import React, { Component } from 'react';
import { WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { isMobileBrowser } from '../../../base/environment/utils';
import { translate } from '../../../base/i18n/functions';
import { IconArrowUp } from '../../../base/icons/svg';
import ToolboxButtonWithIcon from '../../../base/toolbox/components/web/ToolboxButtonWithIcon';
import ViewSettingsPopup from '../../../settings/components/web/ViewSettingsPopup';
import { getViewSettingsVisibility } from '../../../settings/functions.web';
import { toggleViewSettings } from '../../../settings/actions.web';

import OpenViewSettingsButton from './OpenViewSettingsButton';

interface IProps extends WithTranslation {
    buttonKey?: string;
    isOpen: boolean;
    notifyMode?: string;
    visible: boolean;
    onViewOptionsClick: Function;
}

class TileViewSettingsButton extends Component<IProps> {
    constructor(props: IProps) {
        super(props);

        this._onEscClick = this._onEscClick.bind(this);
        this._onClick = this._onClick.bind(this);
    }

    _onEscClick(event: React.KeyboardEvent) {
        if (event.key === 'Escape' && this.props.isOpen) {
            event.preventDefault();
            event.stopPropagation();
            this._onClick();
        }
    }

    _onClick(e?: React.MouseEvent) {
        const { onViewOptionsClick, isOpen } = this.props;

        if (isOpen) {
            e?.stopPropagation();
        }
        onViewOptionsClick();
    }
    override render() {
        const { t, visible, isOpen, buttonKey, notifyMode } = this.props;

        return visible ? (
            <ViewSettingsPopup>
                <ToolboxButtonWithIcon
                    ariaControls = 'view-settings-dialog'
                    ariaExpanded = { isOpen }
                    ariaHasPopup = { true }
                    ariaLabel = { t('toolbar.viewSettings') }
                    buttonKey = { buttonKey }
                    icon = { IconArrowUp }
                    iconId = 'view-settings-button'
                    iconTooltip = { t('toolbar.viewSettings') }
                    iconDisabled = { false }
                    notifyMode = { notifyMode }
                    onIconClick = { this._onClick }
                    onIconKeyDown = { this._onEscClick }>
                    <OpenViewSettingsButton
                        buttonKey = { buttonKey }
                        notifyMode = { notifyMode } />
                </ToolboxButtonWithIcon>
            </ViewSettingsPopup>
        ) : <OpenViewSettingsButton buttonKey = { buttonKey } notifyMode = { notifyMode } />;
    }
}

function mapStateToProps(state: IReduxState) {
    const { isNarrowLayout } = state['features/base/responsive-ui'];

    return {
        isOpen: Boolean(getViewSettingsVisibility(state)),
        visible: !isMobileBrowser() && !isNarrowLayout
    };
}
const mapDispatchToProps = {
    onViewOptionsClick: toggleViewSettings
};

export default translate(connect(mapStateToProps, mapDispatchToProps)(TileViewSettingsButton));


