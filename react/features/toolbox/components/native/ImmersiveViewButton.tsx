import { connect } from 'react-redux';

import { IReduxState, IStore } from '../../../app/types';
import { IconImmersiveView } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { setImmersiveEnabled, setImmersiveTemplate, setImmersiveSlotCount } from '../../../immersive-view/actions';
import '../../../immersive-view/reducer';
import { Platform } from 'react-native';

/**
 * The type of the React {@code Component} props of {@link ImmersiveViewButton}.
 */
interface IProps extends AbstractButtonProps {

    /**
     * Whether immersive view is currently enabled.
     */
    _isEnabled?: boolean;

    /**
     * Currently selected template id, if any.
     */
    _templateId?: string;

    /**
     * Redux dispatch function.
     */
    dispatch: IStore['dispatch'];

    /** Whether rendered inside toolbox row */
    isToolboxButton?: boolean;

    /** Button style set from color scheme */
    styles?: any;
}
class ImmersiveViewButton<P extends IProps> extends AbstractButton<P> {
    override accessibilityLabel = 'toolbar.accessibilityLabel.immersiveView';
    override icon = IconImmersiveView;
    override label = 'toolbar.immersiveView';

    override _handleClick() {
        const { _isEnabled = false, _templateId, dispatch } = this.props as IProps;
        const nextEnabled = !_isEnabled;

        console.log('[ImmersiveViewButton] Click', { prevEnabled: _isEnabled, nextEnabled, templateId: _templateId });
        dispatch(setImmersiveEnabled(nextEnabled));

        if (nextEnabled) {
            if (!_templateId) {
                console.log('[ImmersiveViewButton] Set default template: cati');
                dispatch(setImmersiveTemplate('cati'));
            }
            dispatch(setImmersiveSlotCount(5));
        }
    }

    override _isToggled() {
        return Boolean((this.props as IProps)._isEnabled);
    }
}

/**
 * Maps part of the redux state to the component's props.
 *
 * @param {Object} state - The redux store/state.
 * @returns {IProps}
 */
function mapStateToProps(state: IReduxState) {
    const { enabled, templateId } = state['features/immersive-view'] || {};

    return {
        _isEnabled: enabled,
        _templateId: templateId
    };
}

export default connect(mapStateToProps)(ImmersiveViewButton);
