import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { translate } from '../../../base/i18n/functions';
import { connect, DispatchProp, useSelector } from 'react-redux';
import { IconSaveSpeechToText, IconSaveSpeechToTextHiden } from '../../../base/icons/svg';
import { IReduxState } from '../../../app/types';
import { setOverflowMenuVisible } from '../../../toolbox/actions.web';
import { setSaveSpeechToTextOpen } from '../../actionTypes';
import { startGstStream, stopGstStream } from '../../../base/util/gstStreamUtils';
import { IJitsiConference } from '../../../base/conference/reducer';
// import { isLocalRoomOwner } from '../../../base/participants/functions';
import { isLocalParticipantModerator } from '../../../base/participants/functions';
import { getWhipLink } from '../../../base/util/cMeetUtils';
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { env } from '../../../../../ENV';

interface IProps extends AbstractButtonProps {
    _toggled: boolean;
    _conference?: IJitsiConference;
    visible: boolean;
}

class SaveSpeechToTextButton extends AbstractButton<IProps>{
    override accessibilityLabel = 'toolbar.accessibilityLabel.saveSpeechToText';
    override toggledAccessibilityLabel = 'toolbar.accessibilityLabel.saveSpeechToTextHiden';
    override icon = IconSaveSpeechToText;
    override label = 'toolbar.saveSpeechToText';
    override toggledIcon = IconSaveSpeechToTextHiden;
    override toggledLabel = 'toolbar.saveSpeechToTextHiden';
    override toggledTooltip = 'toolbar.saveSpeechToTextHiden';
    override tooltip = 'toolbar.saveSpeechToText';
    stompClient: any;

    constructor(props: IProps) {
        super(props);
        this.stompClient = new Client();
        this.stompClient.webSocketFactory = () => {
            return new SockJS(env.GST_STREAM_WS);
        };
    }

    override async _handleClick() {
        const { dispatch, _toggled, _conference } = this.props;
        if(!_toggled) {
            console.log('SaveSpeechToTextButton clicked', _conference);
            const token = _conference?.connection.token;

            if (!token) {
                return null;
            }

            const parts = token.split('.');

            if (parts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            const decoded = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

            const whipLink = await getWhipLink(decoded?.context?.token || null, _conference.room.cmeetMeetingId);
            if(whipLink == undefined) return;

            const isStart = await startGstStream(_conference.room.cmeetMeetingId, whipLink);
            if(!isStart) return;

            this.stompClient.onConnect = (frame: any) => {
                this.stompClient.publish({
                    destination: '/app/conference/' + _conference.room.cmeetMeetingId,
                    body: JSON.stringify({
                        roomId: _conference.room.cmeetMeetingId
                    }),
                });
            };
            this.stompClient.activate();
        } else {
            const roomId = _conference?.room.cmeetMeetingId;
            if(!roomId) return null;
            stopGstStream(roomId);
            this.stompClient.deactivate();
        }

        dispatch(setSaveSpeechToTextOpen(!_toggled));
        dispatch(setOverflowMenuVisible(false));
    }

    override _isToggled() {
        return this.props._toggled;
    }
}

function _mapStateToProps(state: IReduxState) {
    // const isOwner = isParticipantModerator(state);
    const isOwner = isLocalParticipantModerator(state);
    return {
        _toggled: state['features/saveSpeechToText'].isOpen,
        _conference: state['features/base/conference'].conference,
        visible: isOwner
    };
}

export default translate(connect(_mapStateToProps)(SaveSpeechToTextButton));