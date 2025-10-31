import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { endConference } from '../../../base/conference/actions';
// import {isLocalParticipantModerator} from '../../../base/participants/functions';
import {isLocalParticipantModerator, isLocalRoomOwner} from '../../../base/participants/functions';
import { BUTTON_TYPES } from '../../../base/ui/constants.web';
import { isInBreakoutRoom } from '../../../breakout-rooms/functions';

import { HangupContextMenuItem } from './HangupContextMenuItem';
import { stopGstStream } from '../../../base/util/gstStreamUtils';
import { IReduxState } from '../../../app/types';

/**
 * The type of the React {@code Component} props of {@link EndConferenceButton}.
 */
interface IProps {

    /**
     * Key to use for toolbarButtonClicked event.
     */
    buttonKey: string;

    /**
     * Notify mode for `toolbarButtonClicked` event -
     * whether to only notify or to also prevent button click routine.
     */
    notifyMode?: string;
}


/**
 * Button to end the conference for all participants.
 *
 * @param {Object} props - Component's props.
 * @returns {JSX.Element} - The end conference button.
 */
export const EndConferenceButton = (props: IProps) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const _isLocalParticipantModerator = useSelector(isLocalParticipantModerator);
    const _isInBreakoutRoom = useSelector(isInBreakoutRoom);
    const _isOwner = useSelector(isLocalRoomOwner);
    const state = useSelector(state => state as IReduxState);

    const onEndConference = useCallback(() => {
        const _conference = state['features/base/conference'].conference;
        const roomId = _conference?.room?.cmeetMeetingId;

        // if (_isOwner && roomId) {
        if (roomId) {
            stopGstStream(roomId);
        }

        dispatch(endConference());
    }, [ dispatch ]);
        // console.log(_isOwner);
    return (<>
        { !_isInBreakoutRoom && _isLocalParticipantModerator && _isOwner && <HangupContextMenuItem
        // { !_isInBreakoutRoom && _isLocalParticipantModerator && <HangupContextMenuItem
            accessibilityLabel = { t('toolbar.accessibilityLabel.endConference') }
            buttonKey = { props.buttonKey }
            buttonType = { BUTTON_TYPES.DESTRUCTIVE }
            label = { t('toolbar.endConference') }
            notifyMode = { props.notifyMode }
            onClick = { onEndConference } /> }
    </>);
};
