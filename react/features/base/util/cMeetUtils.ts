import {getLogger} from '../logging/functions';
import {env} from "../../../../ENV";
import {IStore} from "../../app/types";

const logger = getLogger(__filename);

/**
 * Asynchronously fetches a WHIP link for speech-to-text processing and dispatches an action to update the state.
 *
 * This function interacts with a remote API to retrieve a WHIP (WebRTC-HTTP ingestion protocol) link related to
 * a specific meeting. Once the link is retrieved, it updates the application's state with the connection
 * status and logs the information. If the connection to the GST stream is already established, the function
 * returns early without making any request.
 *
 * @param {IStore} store
 * @param {string} token
 * @param {string} meetingId
 * @returns {Promise<string | undefined>}
 */
export const getWhipLink = async (store: IStore, token: string, meetingId: string): Promise<string | undefined> => {
    const state = store.getState();

    if (state['features/base/conference'].gstStreamConnected) {
        return;
    }

    try {
        const timeSheetId = await getTimeSheetId(meetingId);

        if (!timeSheetId) {
            logger.error('No valid timesheet found');
            return;
        }

        const response = await fetch(
            `${env.CMEET_WS_URL}/api/speech-to-text/${timeSheetId}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isVoiceSeparation: true
                })
            }
        );

        const data = await response.json();
        store.dispatch({type: 'CONNECT_GST_STREAM'});
        logger.info('Speech to text whip link: ', data.data);

        return data.data;
    } catch (err) {
        logger.error('Could not fetch whip link: ', err);
        return undefined;
    }
}

/**
 * Fetches the time sheet ID associated with the specified meeting ID.
 *
 * @param {string} meetingId
 * @return {Promise<string>}
 */
async function getTimeSheetId(meetingId: string): Promise<string> {
    try {
        const response = await fetch(
            `${env.CMEET_URL}/api/meeting-time-sheet/list-timeSheet/${meetingId}`,
            {
                method: 'GET',
            }
        );
        const data = await response.json();

        const filteredData = data.data.filter(item => item.status === 1);

        if (filteredData.length === 0) {
            logger.error('No timesheets running');
            return null;
        }

        return filteredData[0].id;
    } catch (err) {
        logger.error('Could not fetch time sheet id: ', err);
    }
}
