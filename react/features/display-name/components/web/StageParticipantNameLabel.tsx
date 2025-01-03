// import React, { useEffect, useRef, useState } from 'react';
// import { useSelector } from 'react-redux';
// import { makeStyles } from 'tss-react/mui';
// import Typed from 'typed.js';
// import SockJS from 'sockjs-client';
// import { Client } from '@stomp/stompjs';

// import { IReduxState } from '../../../app/types';
// import { getParticipantDisplayName, isScreenShareParticipant } from '../../../base/participants/functions';
// import { withPixelLineHeight } from '../../../base/styles/functions.web';
// import { getVideospaceFloatingElementsBottomSpacing } from '../../../base/ui/functions.web';
// import { getLargeVideoParticipant } from '../../../large-video/functions';
// import {
//     getTransitionParamsForElementsAboveToolbox,
//     isToolboxVisible,
//     toCSSTransitionValue
// } from '../../../toolbox/functions.web';
// import { isLayoutTileView } from '../../../video-layout/functions.any';
// import { shouldDisplayStageParticipantBadge } from '../../functions';
// import { CMEET_ENV } from '../../../chat/ENV';
// import DisplayNameBadge from './DisplayNameBadge';
// import {
//     getStageParticipantFontSizeRange,
//     getStageParticipantNameLabelLineHeight,
//     getStageParticipantTypography,
//     scaleFontProperty
// } from './styles';

// interface IOptions {
//     clientHeight?: number;
// }

// const useStyles = makeStyles<IOptions, 'screenSharing'>()((theme, options: IOptions = {}, classes) => {
//     const typography = {
//         ...getStageParticipantTypography(theme)
//     };
//     const { clientHeight } = options;

//     if (typeof clientHeight === 'number' && clientHeight > 0) {
//         // We want to show the fontSize and lineHeight configured in theme on a screen with height 1080px. In this case
//         // the clientHeight will be 960px if there are some titlebars, toolbars, addressbars, etc visible.For any other
//         // screen size we will decrease/increase the font size based on the screen size.

//         typography.fontSize = scaleFontProperty(clientHeight, getStageParticipantFontSizeRange(theme));
//         typography.lineHeight = getStageParticipantNameLabelLineHeight(theme, clientHeight);
//     }

//     const toolbarVisibleTransitionProps = getTransitionParamsForElementsAboveToolbox(true);
//     const toolbarHiddenTransitionProps = getTransitionParamsForElementsAboveToolbox(false);
//     const showTransitionDuration = toolbarVisibleTransitionProps.delay + toolbarVisibleTransitionProps.duration;
//     const hideTransitionDuration = toolbarHiddenTransitionProps.delay + toolbarHiddenTransitionProps.duration;
//     const showTransition = `opacity ${showTransitionDuration}s ${toolbarVisibleTransitionProps.easingFunction}`;
//     const hideTransition = `opacity ${hideTransitionDuration}s ${toolbarHiddenTransitionProps.easingFunction}`;
//     const moveUpTransition = `margin-bottom ${toCSSTransitionValue(toolbarVisibleTransitionProps)}`;
//     const moveDownTransition = `margin-bottom ${toCSSTransitionValue(toolbarHiddenTransitionProps)}`;

//     return {
//         badgeContainer: {
//             ...withPixelLineHeight(typography),
//             alignItems: 'center',
//             display: 'inline-flex',
//             justifyContent: 'center',
//             marginBottom: getVideospaceFloatingElementsBottomSpacing(theme, false),
//             transition: moveDownTransition,
//             pointerEvents: 'none',
//             position: 'absolute',
//             bottom: 0,
//             left: 0,
//             width: '100%',
//             zIndex: 1
//         },
//         containerElevated: {
//             marginBottom: getVideospaceFloatingElementsBottomSpacing(theme, true),
//             transition: moveUpTransition,
//             [`&.${classes.screenSharing}`]: {
//                 opacity: 1,
//                 transition: `${showTransition}, ${moveUpTransition}`
//             }
//         },
//         screenSharing: {
//             opacity: 0,
//             transition: `${hideTransition}, ${moveDownTransition}`
//         }
//     };
// });

// /**
//  * Component that renders the dominant speaker's name as a badge above the toolbar in stage view.
//  *
//  * @returns {ReactElement|null}
//  */
// const StageParticipantNameLabel = () => {
//     const clientHeight = useSelector((state: IReduxState) => state['features/base/responsive-ui'].clientHeight);
//     const { classes, cx } = useStyles({ clientHeight });
//     const largeVideoParticipant = useSelector(getLargeVideoParticipant);
//     const selectedId = largeVideoParticipant?.id;
//     const nameToDisplay = useSelector((state: IReduxState) => getParticipantDisplayName(state, selectedId ?? ''));
//     const toolboxVisible: boolean = useSelector(isToolboxVisible);
//     const visible = useSelector(shouldDisplayStageParticipantBadge);
//     const isTileView = useSelector(isLayoutTileView);
//     const _isScreenShareParticipant = isScreenShareParticipant(largeVideoParticipant);
//     const typedElementRef = useRef(null);
//     const [stompClient, setStompClient] = useState<Client | null>(null);
//     const [meetingId, setMeetingId] = useState('');
//     const [typedStrings, setTypedStrings] = useState([""]);
//     const [username, setUsername] = useState("");
//     useEffect(() => {
//         const currentMeetingId = window.location.href.split('/').at(-1) || '';
//         setMeetingId(currentMeetingId);
//         const client = new Client({
//             webSocketFactory: () => new SockJS(CMEET_ENV.urlWS)
//         });
//         client.onConnect = () => {
//             client.subscribe(CMEET_ENV.subriceCaption + '/' + currentMeetingId, ({ body }) => {
//                 const data = JSON.parse(body);
//                 const { caption, username } = data;
//                 if (username) setUsername("Đại biểu : " + username)
//                 if (caption) {
//                     setTypedStrings(prevStrings => [...prevStrings, caption]);
//                     console.log("setTypedStrings", typedStrings)
//                 }
//             });
//         };
//         client.activate();
//         setStompClient(client);
//         return () => {
//             client.deactivate();
//         };
//     }, []);
//     useEffect(() => {
//         if (typedElementRef.current) {
//             const typed = new Typed(typedElementRef.current, {
//                 strings: typedStrings,
//                 typeSpeed: 30,
//             });
//             return () => {
//                 typed.destroy();
//             };
//         }
//     }, [typedStrings]);

//     if (typedStrings) {
//         return (
//             <div
//                 className={cx(
//                     'stage-participant-label',
//                     classes.badgeContainer,
//                     toolboxVisible && classes.containerElevated
//                 )}
//             >
//                 <DisplayNameBadge name={username} />
//                 <div ref={typedElementRef} />
//             </div>
//         );
//     }
//     if (visible || (_isScreenShareParticipant && !isTileView)) {
//         // For stage participant visibility is true only when the toolbar is visible but we need to keep the element
//         // in the DOM in order to make it disappear with an animation.
//         return (
//             <div
//                 className = { cx(
//                     classes.badgeContainer,
//                     toolboxVisible && classes.containerElevated,
//                     _isScreenShareParticipant && classes.screenSharing
//                 ) }
//                 data-testid = 'stage-display-name' >
//                 <DisplayNameBadge name = { nameToDisplay } />
//             </div>
//         );
//     }

//     return null;
// };

// export default StageParticipantNameLabel;
import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { isDisplayNameVisible } from '../../../base/config/functions.any';
import {
    getLocalParticipant,
    getParticipantDisplayName,
    isWhiteboardParticipant
} from '../../../base/participants/functions';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import { getLargeVideoParticipant } from '../../../large-video/functions';
import { isToolboxVisible } from '../../../toolbox/functions.web';
import { isLayoutTileView } from '../../../video-layout/functions.web';

import DisplayNameBadge from './DisplayNameBadge';

const useStyles = makeStyles()(theme => {
    return {
        badgeContainer: {
            ...withPixelLineHeight(theme.typography.bodyShortRegularLarge),
            alignItems: 'center',
            display: 'inline-flex',
            justifyContent: 'center',
            marginBottom: theme.spacing(7),
            transition: 'margin-bottom 0.3s',
            pointerEvents: 'none',
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            zIndex: 1
        },
        containerElevated: {
            marginBottom: theme.spacing(12)
        }
    };
});

/**
 * Component that renders the dominant speaker's name as a badge above the toolbar in stage view.
 *
 * @returns {ReactElement|null}
 */
const StageParticipantNameLabel = () => {
    const { classes, cx } = useStyles();
    const largeVideoParticipant = useSelector(getLargeVideoParticipant);
    const selectedId = largeVideoParticipant?.id;
    const nameToDisplay = useSelector((state: IReduxState) => getParticipantDisplayName(state, selectedId ?? ''));

    const localParticipant = useSelector(getLocalParticipant);
    const localId = localParticipant?.id;

    const isTileView = useSelector(isLayoutTileView);
    const toolboxVisible: boolean = useSelector(isToolboxVisible);
    const showDisplayName = useSelector(isDisplayNameVisible);

    if (showDisplayName
        && nameToDisplay
        && selectedId !== localId
        && !isTileView
        && !isWhiteboardParticipant(largeVideoParticipant)
    ) {
        return (
            <div
                className = { cx(
                    'stage-participant-label',
                    classes.badgeContainer,
                    toolboxVisible && classes.containerElevated
                ) }>
                <DisplayNameBadge name = { nameToDisplay } />
            </div>
        );
    }

    return null;
};

export default StageParticipantNameLabel;