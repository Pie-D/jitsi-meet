import {getLogger} from '../logging/functions';
import {getWhipLink} from "./cMeetUtils";
import {env} from "../../../../ENV";
import {CONNECT_GST_STREAM, DISCONNECT_GST_STREAM} from "../conference/actionTypes";
import {AnyAction} from "redux";
import { toast } from 'react-toastify';
import i18next from 'i18next';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const logger = getLogger(__filename);

// Map lưu STOMP clients theo roomId để quản lý lifecycle
const stompClients: Map<string, Client> = new Map();

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
        // Ngắt STOMP WebSocket trước khi gọi REST stop
        disconnectGstWebSocket(meetingId);

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

/**
 * Kết nối STOMP WebSocket đến gst-meet-whip để đăng ký session.
 * Khi client disconnect (đóng tab, mất mạng), server sẽ tự động dọn bot.
 *
 * @param {string} roomId - ID của phòng họp.
 */
export const connectGstWebSocket = (roomId: string): void => {
    if (!env.GST_STREAM_WS) {
        logger.warn('GST_STREAM_WS not configured, skipping STOMP connection');
        return;
    }

    // Nếu đã có connection cho room này, không tạo thêm
    if (stompClients.has(roomId)) {
        logger.info(`STOMP client already exists for room: ${roomId}`);
        return;
    }

    try {
        const client = new Client({
            webSocketFactory: () => new SockJS(env.GST_STREAM_WS),
            // Auto-reconnect mỗi 5s khi mất kết nối.
            // Server có grace period 30s trước khi kill bot, nên client có thời gian reconnect.
            reconnectDelay: 5000,
            onConnect: () => {
                logger.info(`STOMP connected for room: ${roomId}`);
                client.publish({
                    destination: `/app/conference/${roomId}`,
                    body: JSON.stringify({ roomId })
                });
            },
            onStompError: (frame) => {
                logger.error(`STOMP error for room ${roomId}:`, frame.headers['message']);
            },
            onWebSocketClose: () => {
                logger.info(`STOMP WebSocket closed for room: ${roomId}`);
                stompClients.delete(roomId);
            }
        });

        client.activate();
        stompClients.set(roomId, client);
        logger.info(`STOMP client created and activating for room: ${roomId}`);
    } catch (error) {
        logger.error(`Failed to create STOMP connection for room ${roomId}:`, error);
    }
};

/**
 * Ngắt kết nối STOMP WebSocket cho phòng họp.
 *
 * @param {string} roomId - ID của phòng họp.
 */
export const disconnectGstWebSocket = (roomId: string): void => {
    const client = stompClients.get(roomId);
    if (client) {
        client.deactivate()
            .then(() => logger.info(`STOMP disconnected for room: ${roomId}`))
            .catch((err: any) => logger.error(`STOMP deactivate failed for room ${roomId}:`, err));
        stompClients.delete(roomId);
    }
};
