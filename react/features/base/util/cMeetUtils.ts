import {getLogger} from '../logging/functions';
import {env} from "../../../../ENV";
import { toast } from 'react-toastify';
import i18n from 'i18next';
const logger = getLogger(__filename);

/**
 * Asynchronously fetches a WHIP link for speech-to-text processing and dispatches an action to update the state.
 *
 * This function interacts with a remote API to retrieve a WHIP (WebRTC-HTTP ingestion protocol) link related to
 * a specific meeting. Once the link is retrieved, it updates the application's state with the connection
 * status and logs the information. If the connection to the GST stream is already established, the function
 * returns early without making any request.
 *
 * @param {string} token
 * @param {string} meetingId
 * @returns {Promise<string | undefined>}
 */
export const getWhipLink = async (token: string, meetingId: string): Promise<string | undefined> => {
    const response = await fetch(
        `${env.CMEET_WS_URL}/api/speech-to-text-meeting-online/${meetingId}`,
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

    if(!response.ok) {
        if(response.status === 401) {
            toast.error(i18n.t('notify.tokenExpired'));
        } else if(response.status === 400) {
            const code = data.code;
            const message = data.message;

            // code 39 là cần đợi sau bao nhiêu giây nữa
            if(code == 39) toast.error(`Vui lòng đợi ${message} giây`);

            // code 46 là đang có luồng bóc băng chưa kết thúc
            if(code == 46) toast.error(i18n.t('notify.speechContinued'));
        } else toast.error(i18n.t('notify.speechFailed'));
        return undefined;
    }
    console.log('Whip link:', data);
    return data.data;
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

        const filteredData = data.data.filter((item: { status: number; }) => item.status === 1);

        if (filteredData.length === 0) {
            logger.error('No timesheets running');
            return "";
        }

        return filteredData[0].id;
    } catch (err) {
        logger.error('Could not fetch time sheet id: ', err);
        return "";
    }
}
