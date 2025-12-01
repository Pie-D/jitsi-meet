import {getLogger} from '../logging/functions';
import {getWhipLink} from "./cMeetUtils";
import {env} from "../../../../ENV";
import {CONNECT_GST_STREAM, DISCONNECT_GST_STREAM} from "../conference/actionTypes";
import {AnyAction} from "redux";
import { toast } from 'react-toastify';
import i18next from 'i18next';

const logger = getLogger(__filename);

/**
 * Action creator to indicate GST stream is connected.
 *
 * @returns {AnyAction} The redux action.
 */
export const connectGstStream = (): AnyAction => {
    return {
        type: CONNECT_GST_STREAM,
    };
};

/**
 * Action creator to indicate GST stream is disconnected.
 *
 * @returns {AnyAction} The redux action.
 */
export const disconnectGstStream = (): AnyAction => {
    return {
        type: DISCONNECT_GST_STREAM,
    };
};

/**
 * Checks if the GST stream is connected for a specific room.
 *
 * @param {Object} state - The Redux state.
 * @returns {boolean} Whether the GST stream is connected for the specified room.
 */
export const isGstStreamConnected = (state: any): boolean => {
    return Boolean(state['features/base/conference'].gstStreamConnected);
};


/**
 * Initializes and starts a GST stream for a given meeting.
 *
 * This function uses the provided store and authentication token to retrieve a WHIP link
 * associated with the specified meeting ID. It first checks if the stream is already connected
 * before attempting to start it.
 *
 * @param {IStore} store - The application data store containing state and configuration.
 * @param {string} token - The authentication token required to access the WHIP link.
 * @param {string} meetingId - The unique identifier of the meeting for which the GST stream needs to be started.
 * @throws Will log an error if unable to retrieve the WHIP link or start the GST stream.
 */
export const startGstStream = async (meetingId: string, whipLink: string): Promise<boolean> => {

    // if (isGstStreamConnected(store.getState())) {
    //     logger.warn('GST stream already connected for meeting:', meetingId);
    //     return;
    // }
    try {
        const response = await fetch(
            `${env.GST_STREAM_URL}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: meetingId,
                    domain: env.DOMAIN,
                    whipEndpoint: whipLink,
                    nickname: 'CMEET-BOT-RECORDING',
                    isRecord: true,
                    xmppDomain: env.XMPP_DOMAIN
                })
            });
    
        if (!response.ok) {
            logger.error('Error starting GST stream:', response);
            toast.error(i18next.t('notify.sttErrored'));
            return false;
        }

        // Parse JSON đồng bộ (await)
        const data = await response.json();

        // ---- Xử lý mã lỗi từ API ----
        if (data.code === 1206) {
            logger.info(`Cmeet-bot is already running for room: ${meetingId}`);
            toast.info(i18next.t('notify.sttExists'));
            return false;
        }

        if (data.code === 1500) {
            logger.error(`Cmeet-bot encountered an error for room: ${meetingId}`, data);
            toast.error(i18next.t('notify.sttErrored'));
            return false;
        }

        // Thành công
        toast.success(i18next.t('notify.sttEnabled'));
        return true;

    } catch (error) {
        logger.error('Error starting GST stream:', error);
        toast.error(i18next.t('notify.sttErrored'));
        return false;
    }
}


/**
 * Stops the GST (GStreamer) stream associated with the specified meeting ID.
 *
 * This asynchronous function sends a POST request to the GST Stream endpoint
 * to terminate the stream linked to the given meetingId. Once the request is
 * successfully executed, it dispatches an action to update the local store
 * and logs the stream termination. If an error occurs during the process,
 * it logs the error details.
 *
 * @param {string} meetingId - The ID of the meeting whose GST stream needs to be stopped.
 * @returns {Promise<void>} A promise that resolves when the GST stream is successfully stopped.
 */
export const stopGstStream = async (meetingId: string): Promise<void> => {
    try {
        await fetch(
            `${env.GST_STREAM_URL}/stop?roomId=${meetingId}_record`,
            {
                method: 'POST'
            });

        toast.success(i18next.t('notify.sttDisabled'));
    } catch (err) {
        logger.error('Could not stop gst stream: ', err);
    }
}
