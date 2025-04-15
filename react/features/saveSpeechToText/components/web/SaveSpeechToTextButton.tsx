import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { translate } from '../../../base/i18n/functions';
import { connect, DispatchProp, useSelector } from 'react-redux';
import { IconSaveSpeechToText, IconSaveSpeechToTextHiden } from '../../../base/icons/svg';
import { IReduxState } from '../../../app/types';
import { setOverflowMenuVisible } from '../../../toolbox/actions.web';
import { setSaveSpeechToTextOpen } from '../../actionTypes';
import { startGstStream, stopGstStream } from '../../../base/util/gstStreamUtils';
import { IJitsiConference } from '../../../base/conference/reducer';
import { isLocalRoomOwner } from '../../../base/participants/functions';
import { getWhipLink } from '../../../base/util/cMeetUtils';

interface IProps extends AbstractButtonProps {
    _toggled: boolean;
    _conference?: IJitsiConference;
    visible: boolean;
}

class SaveSpeechToTextButton extends AbstractButton<IProps>{
    accessibilityLabel = 'toolbar.accessibilityLabel.saveSpeechToText';
    toggledAccessibilityLabel = 'toolbar.accessibilityLabel.saveSpeechToTextHiden';
    icon = IconSaveSpeechToText;
    label = 'toolbar.saveSpeechToText';
    toggledIcon = IconSaveSpeechToTextHiden;
    toggledLabel = 'toolbar.saveSpeechToTextHiden';
    toggledTooltip = 'toolbar.saveSpeechToTextHiden';
    tooltip = 'toolbar.saveSpeechToText';

    async _handleClick() {
        const { dispatch, _toggled, _conference } = this.props;
        if(!_toggled) {
            const token = _conference?.connection.token;
            
            if (!token) {
                return null;
            }

            const parts = token.split('.');

            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

            const whipLink = await getWhipLink(decoded?.context?.userId || null, _conference.room.cmeetMeetingId);
            if(whipLink == undefined) return;

            const isStart = await startGstStream(decoded?.context?.token || null, _conference.room.cmeetMeetingId, whipLink);
            if(!isStart) return;
        } else {
            const roomId = _conference?.room.cmeetMeetingId;
            if(!roomId) return null;
            stopGstStream(roomId);
        }

        dispatch(setSaveSpeechToTextOpen(!_toggled));
        dispatch(setOverflowMenuVisible(false));
    }

    _isToggled() {
        return this.props._toggled;
    }
}

function _mapStateToProps(state: IReduxState) {
    const isOwner = isLocalRoomOwner(state);
    return {
        _toggled: state['features/saveSpeechToText'].isOpen,
        _conference: state['features/base/conference'].conference,
        visible: isOwner 
    };
}

export default translate(connect(_mapStateToProps)(SaveSpeechToTextButton));