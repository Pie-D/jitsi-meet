/* global APP */
declare const APP: any;

import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import Avatar from '../../../../../base/avatar/components/Avatar';
import { isLocalParticipantModerator } from '../../../../../base/participants/functions';
import ContextMenu from '../../../../../base/ui/components/web/ContextMenu';
import ContextMenuItemGroup from '../../../../../base/ui/components/web/ContextMenuItemGroup';
import { getBreakoutRooms } from '../../../../../breakout-rooms/functions';
import { getParticipantMenuButtonsWithNotifyClick, showOverflowDrawer } from '../../../../../toolbox/functions.web';
import { NOTIFY_CLICK_MODE } from '../../../../../toolbox/types';
import SendToRoomButton from '../../../../../video-menu/components/web/SendToRoomButton';
import { PARTICIPANT_MENU_BUTTONS as BUTTONS } from '../../../../../video-menu/constants';
import { AVATAR_SIZE } from '../../../../constants';

interface IProps {

    /**
     * Participant context key reference (encodes room & participant).
     */
    participantKey?: string;

    /**
     * Target elements against which positioning calculations are made.
     */
    offsetTarget?: HTMLElement | null;

    /**
     * Callback for the mouse entering the component.
     */
    onEnter: () => void;

    /**
     * Callback for the mouse leaving the component.
     */
    onLeave: () => void;

    /**
     * Callback for making a selection in the menu.
     */
    onSelect: (force?: any) => void;
}

const useStyles = makeStyles()(theme => {
    return {
        text: {
            color: theme.palette.text02,
            padding: '10px 16px',
            height: '40px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            boxSizing: 'border-box'
        }
    };
});

export const RoomParticipantContextMenu = ({
    participantKey,
    offsetTarget,
    onEnter,
    onLeave,
    onSelect
}: IProps) => {
    const { classes: styles } = useStyles();
    const { t } = useTranslation();
    const isLocalModerator = useSelector(isLocalParticipantModerator);
    const lowerMenu = useCallback(() => onSelect(true), [ onSelect ]);
    const rooms: any = useSelector(getBreakoutRooms);
    const overflowDrawer = useSelector(showOverflowDrawer);
    const buttonsWithNotifyClick = useSelector(getParticipantMenuButtonsWithNotifyClick);

    const notifyClick = useCallback(
        (buttonKey: string, participantId?: string) => {
            const notifyMode = buttonsWithNotifyClick?.get(buttonKey);

            if (!notifyMode || typeof APP === 'undefined') {
                return;
            }

            APP.API.notifyParticipantMenuButtonClicked(
                buttonKey,
                participantId,
                notifyMode === NOTIFY_CLICK_MODE.PREVENT_AND_NOTIFY
            );
        }, [ buttonsWithNotifyClick ]);

    const {
        roomJid,
        participantJid,
        participantName
    } = useMemo(() => {
        if (!participantKey) {
            return {
                roomJid: undefined,
                participantJid: undefined,
                participantName: undefined
            };
        }

        const [ parsedRoomJid, parsedParticipantJid ] = participantKey.split('|');
        const room = rooms?.[parsedRoomJid];
        const participant = room?.participants?.[parsedParticipantJid];

        return {
            roomJid: parsedRoomJid,
            participantJid: parsedParticipantJid,
            participantName: participant?.displayName
        };
    }, [ participantKey, rooms ]);

    const breakoutRoomsButtons = useMemo(
        () => Object.values(rooms || {}).map((room: any) => {
            if (!participantJid || room.jid === roomJid) {
                return null;
            }

            return (<SendToRoomButton
                key = { room.id }
                // eslint-disable-next-line react/jsx-no-bind
                notifyClick = { () => notifyClick(BUTTONS.SEND_PARTICIPANT_TO_ROOM, participantJid) }
                notifyMode = { buttonsWithNotifyClick?.get(BUTTONS.SEND_PARTICIPANT_TO_ROOM) }
                onClick = { lowerMenu }
                participantID = { participantJid }
                room = { room } />);
        })
        .filter(Boolean),
        [ participantJid, roomJid, rooms, buttonsWithNotifyClick, lowerMenu, notifyClick ]
    );

    return isLocalModerator ? (
        <ContextMenu
            entity = { participantKey }
            isDrawerOpen = { Boolean(participantKey) }
            offsetTarget = { offsetTarget }
            onClick = { lowerMenu }
            onDrawerClose = { onSelect }
            onMouseEnter = { onEnter }
            onMouseLeave = { onLeave }>
            {overflowDrawer && participantJid && <ContextMenuItemGroup
                actions = { [ {
                    accessibilityLabel: participantName,
                    customIcon: <Avatar
                        displayName = { participantName }
                        size = { AVATAR_SIZE } />,
                    text: participantName
                } ] } />}

            <ContextMenuItemGroup>
                <div className = { styles.text }>
                    {t('breakoutRooms.actions.sendToBreakoutRoom')}
                </div>
                {breakoutRoomsButtons}
            </ContextMenuItemGroup>
        </ContextMenu>
    ) : null;
};
