import {getLogger} from '../logging/functions';
import {IStore} from "../../app/types";
import {getWhipLink} from "./cMeetUtils";
import {env} from "../../../../ENV";

const logger = getLogger(__filename);

let localStore: IStore;

/**
 * Starts a GST stream for a specified meeting.
 *
 * This asynchronous function initializes and sends a request to start a GST stream
 * for a given meeting using provided parameters such as the store, authentication token,
 * and meeting ID. It retrieves the WHIP link required for streaming, constructs the
 * GST stream URL, and triggers the start of the stream by making a POST request.
 * If an error occurs during the process, it logs the relevant error message.
 *
 * @param {IStore} store - The store instance used for retrieving and managing application data.
 * @param {string} token - The authentication token required to retrieve the WHIP link.
 * @param {string} meetingId - The unique identifier for the meeting to associate with the GST stream.
 * @returns {Promise<void>} A promise that resolves when the request is complete.
 */
export const startGstStream = async (store: IStore, token: string, meetingId: string): Promise<void> => {
    localStore = store;
    const whipLink = await getWhipLink(store, token, meetingId);
    const domain = 'meet-dev.cmcati.vn';

    try {
        await fetch(
            `${env.GST_STREAM_URL}?roomId=${meetingId}&domain=${domain}&whipEndpoint=${whipLink}`,
            {
                method: 'POST'
            });
    } catch (err) {
        logger.error('Could not start gst stream: ', err);
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
            `${env.GST_STREAM_URL}/stop?roomId=${meetingId}`,
            {
                method: 'POST'
            });

        localStore.dispatch({type: 'DISCONNECT_GST_STREAM'});
        logger.info('Gst stream stopped');
    } catch (err) {
        logger.error('Could not stop gst stream: ', err);
    }
}
