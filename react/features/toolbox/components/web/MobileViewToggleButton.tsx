import { batch, connect } from 'react-redux';

import { createToolbarEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { IReduxState } from '../../../app/types';
import { TILE_VIEW_ENABLED } from '../../../base/flags/constants';
import { getFeatureFlag } from '../../../base/flags/functions';
import { translate } from '../../../base/i18n/functions';
import { IconGalleryView, IconSpeakerView } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { setOverflowMenuVisible } from '../../actions.web';
import { setTileView } from '../../../video-layout/actions.any';
import { shouldDisplayTileView } from '../../../video-layout/functions.any';
import logger from '../../../video-layout/logger';

/**
 * The type of the React {@code Component} props of {@link MobileViewToggleButton}.
 */
interface IProps extends AbstractButtonProps {

    /**
     * Whether or not tile view layout has been enabled as the user preference.
     */
    _tileViewEnabled: boolean;
}

/**
 * Component that renders a mobile toolbar button for toggling between speaker and tile (gallery) view.
 * 
 * @augments AbstractButton
 */
class MobileViewToggleButton<P extends IProps> extends AbstractButton<P> {
    // Default icon, will be overridden in render
    override icon = IconGalleryView;
    
    override accessibilityLabel = 'toolbar.tileViewToggle';
    override label = 'toolbar.tileViewToggle';
    override tooltip = 'toolbar.tileViewToggle';

    /**
     * Handles clicking / pressing the button.
     *
     * @override
     * @protected
     * @returns {void}
     */
    override _handleClick() {
        const { _tileViewEnabled, dispatch } = this.props;

        const value = !_tileViewEnabled;

        sendAnalytics(createToolbarEvent(
            'mobile.viewtoggle.button',
            {
                'is_enabled': value
            }));

        logger.debug(`Mobile view toggle: ${value ? 'gallery' : 'speaker'}`);
        batch(() => {
            dispatch(setTileView(value));
            dispatch(setOverflowMenuVisible(false));
        });
    }

    /**
     * Custom render to show different icon and text based on view state.
     * 
     * @override
     * @returns {ReactElement}
     */
    override render() {
        const { _tileViewEnabled } = this.props;
        
        // Temporarily change icon, label and tooltip based on current view
        // When in gallery view, show speaker icon/text (to switch to speaker)
        // When in speaker view, show gallery icon/text (to switch to gallery)
        this.icon = _tileViewEnabled ? IconSpeakerView : IconGalleryView;
        this.label = _tileViewEnabled ? 'toolbar.speakerView' : 'toolbar.galleryView';
        this.tooltip = _tileViewEnabled ? 'toolbar.speakerView' : 'toolbar.galleryView';
        
        return super.render();
    }
}

/**
 * Maps (parts of) the redux state to the associated props for the
 * {@code MobileViewToggleButton} component.
 *
 * @param {Object} state - The Redux state.
 * @param {Object} ownProps - The properties explicitly passed to the component instance.
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState, ownProps: any) {
    const enabled = getFeatureFlag(state, TILE_VIEW_ENABLED, true);
    const { visible = enabled } = ownProps;

    return {
        _tileViewEnabled: shouldDisplayTileView(state),
        visible
    };
}

export default translate(connect(_mapStateToProps)(MobileViewToggleButton));

