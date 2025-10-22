import { connect } from 'react-redux';
import { translate } from '../../../base/i18n/functions';
import { IconTileView } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { IReduxState } from '../../../app/types';
import { TILE_VIEW_ENABLED } from '../../../base/flags/constants';
import { getFeatureFlag } from '../../../base/flags/functions';
import { toggleViewSettings } from '../../../settings/actions.web';

interface IProps extends AbstractButtonProps {}

/**
 * Main toolbar button that opens the View Settings popover instead of toggling layout.
 */
class OpenViewSettingsButton<P extends IProps> extends AbstractButton<P> {
    override accessibilityLabel = 'toolbar.tileViewToggle';
    override icon = IconTileView;
    override label = 'toolbar.tileViewToggle';
    override tooltip = 'toolbar.tileViewToggle';

    override _handleClick() {
        this.props.dispatch(toggleViewSettings());
    }
}

function _mapStateToProps(state: IReduxState, ownProps: any) {
    const enabled = getFeatureFlag(state, TILE_VIEW_ENABLED, true);
    const { visible = enabled } = ownProps;

    return {
        visible
    };
}

export default translate(connect(_mapStateToProps)(OpenViewSettingsButton));


