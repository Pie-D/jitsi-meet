// import React, { useEffect, useRef, useState } from "react";
// import { useSelector } from "react-redux";
// import { makeStyles } from "tss-react/mui";
// import Typed from "typed.js";
// import SockJS from "sockjs-client";
// import { Client } from "@stomp/stompjs";

// import { IReduxState } from "../../../app/types";
// import { isDisplayNameVisible } from "../../../base/config/functions.any";
// import {
//     getLocalParticipant,
//     getParticipantDisplayName,
//     isWhiteboardParticipant,
// } from "../../../base/participants/functions";
// import { withPixelLineHeight } from "../../../base/styles/functions.web";
// import { getLargeVideoParticipant } from "../../../large-video/functions";
// import { isToolboxVisible } from "../../../toolbox/functions.web";
// import { isLayoutTileView } from "../../../video-layout/functions.web";

// import { CMEET_ENV } from "../../../chat/ENV";
// import DisplayNameBadge from "./DisplayNameBadge";

// const useStyles = makeStyles()((theme) => ({
//     badgeContainer: {
//         ...withPixelLineHeight(theme.typography.bodyShortRegularLarge),
//         alignItems: "center",
//         display: "inline-flex",
//         justifyContent: "center",
//         marginBottom: theme.spacing(7),
//         transition: "margin-bottom 0.3s",
//         pointerEvents: "none",
//         position: "absolute",
//         bottom: 0,
//         left: 0,
//         width: "100%",
//         zIndex: 1,
//     },
//     containerElevated: {
//         marginBottom: theme.spacing(12),
//     },
// }));

// const StageParticipantNameLabel = () => {
//     const { classes, cx } = useStyles();
//     const typedElementRef = useRef(null);
//     const [stompClient, setStompClient] = useState<Client | null>(null);
//     const [meetingId, setMeetingId] = useState("");

//     const largeVideoParticipant = useSelector(getLargeVideoParticipant);
//     const selectedId = largeVideoParticipant?.id;
//     const nameToDisplay = useSelector((state: IReduxState) => getParticipantDisplayName(state, selectedId ?? ""));

//     const localParticipant = useSelector(getLocalParticipant);
//     const localId = localParticipant?.id;

//     const isTileView = useSelector(isLayoutTileView);
//     const toolboxVisible = useSelector(isToolboxVisible);
//     const showDisplayName = useSelector(isDisplayNameVisible);
//     const [typedStrings, setTypedStrings] = useState([""]);
//     const [username, setUsername] = useState("");

//     useEffect(() => {
//         const currentMeetingId = window.location.href.split("/").at(-1) || "";
//         setMeetingId(currentMeetingId);
//         console.log("id", currentMeetingId);
//         const client = new Client({
//             // webSocketFactory: () => new SockJS(CMEET_ENV.urlWS),
//             webSocketFactory: () => new SockJS(CMEET_ENV.urlWSC_Meet),
//         });
//         client.onConnect = () => {
//             // client.subscribe(CMEET_ENV.subriceCaption + "/" + currentMeetingId, ({ body }) => {
//             //     const data = JSON.parse(body);
//             //     console.log("data", data);
//             //     const { caption, username } = data;
//             //     if (username) setUsername("Đại biểu : " + username);
//             //     if (caption) {
//             //         setTypedStrings((prevStrings) => [...prevStrings, caption]);
//             //         console.log("setTypedStrings", typedStrings);
//             //     }
//             // });
//             client.subscribe(`/topic/speech-to-text/predict-data/2dd4b550-14b1-42c3-9e93-d9867bdff8b8`, ({ body }) => {
//                 // chưa thay timeSheetId ở chỗ này, đang fix cứng
//                 const data = JSON.parse(body);
//                 setUsername("Đại biểu Test");
//                 if (data.data.predict_segment) {
//                     setTypedStrings((prevStrings) => [data.data.predict_segment]);
//                 }
//                 // const { caption, username } = data;
//                 // if (username) setUsername("Đại biểu : " + username);
//                 // if (caption) {
//                 //     setTypedStrings((prevStrings) => [...prevStrings, caption]);
//                 //     console.log("setTypedStrings", typedStrings);
//                 // }
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
//                     "stage-participant-label",
//                     classes.badgeContainer,
//                     toolboxVisible && classes.containerElevated
//                 )}
//             >
//                 <DisplayNameBadge name={username} />
//                 <div ref={typedElementRef} />
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