import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { translate } from '../../../base/i18n/functions';
import { connect } from 'react-redux';
import { IconSaveSpeechToText, IconSaveSpeechToTextHiden } from '../../../base/icons/svg';
import { IReduxState } from '../../../app/types';
import { setOverflowMenuVisible } from '../../../toolbox/actions.web';
import { setSaveSpeechToTextOpen } from '../../actionTypes';
import { startGstStream } from '../../../base/util/gstStreamUtils';

interface IProps extends AbstractButtonProps {

    /**
     * Whether or not the button is toggled.
     */
    _toggled: boolean;
    _conference: any;
}


class SaveSpeechToTextButtuon extends AbstractButton<IProps>{
    accessibilityLabel = 'toolbar.accessibilityLabel.saveSpeechToText';
    toggledAccessibilityLabel = 'toolbar.accessibilityLabel.saveSpeechToTextHiden';
    icon = IconSaveSpeechToText;
    label = 'toolbar.saveSpeechToText';
    toggledIcon = IconSaveSpeechToTextHiden;
    toggledLabel = 'toolbar.saveSpeechToTextHiden';
    toggledTooltip = 'toolbar.saveSpeechToTextHiden';
    tooltip = 'toolbar.saveSpeechToText';

    _handleClick() {
        const { dispatch, _toggled, _conference } = this.props;

        if(!_toggled) {
            const token = _conference.connection.token;
        
            if (!token) {
                return null;
            }

            const parts = token.split('.');

            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            startGstStream(decoded?.context?.token || null, _conference.room.cmeetMeetingId)
        }

        dispatch(setSaveSpeechToTextOpen(!_toggled));
        dispatch(setOverflowMenuVisible(false));
    }

    _isToggled() {
        return this.props._toggled;
    }
}

function _mapStateToProps(state: IReduxState) {
    return {
        _toggled: state['features/saveSpeechToText'].isOpen,
        _conference: state['features/base/conference'].conference,
        visible: true 
    };
}

export default translate(connect(_mapStateToProps)(SaveSpeechToTextButtuon));