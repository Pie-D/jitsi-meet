/* eslint-disable no-empty-function */
import { addMessage, deleteMessage } from '../react/features/chat/actions.any';

import { Utils } from './utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logger = require('./logger').getLogger('RocketChat:Helpers');

export const Helpers = {
    handleRocketChatMessage(rawData, store, localParticipantName, client) {
        let msg;

        try {
            msg = JSON.parse(rawData);
        } catch (error) {
            logger.error('[Rocket.Chat] Invalid JSON message:', error);

            return;
        }

        switch (msg.msg) {
        case 'ping':
            client.send(JSON.stringify({ msg: 'pong' }));

            break;
        case 'result':
            if (msg.id === 'login-1') {
                logger.log('WebSocket login successfully!');
            }

            break;
        case 'changed':
            if (msg.collection === 'stream-room-messages') {
                const message = msg.fields.args[0];

                // Handle deletions
                if (message.t === 'rm') {
                    store.dispatch(deleteMessage({ messageId: message._id }));
                    return;
                }

                // ignore other system messages
                if (message.t) {
                    return;
                }

                // Handle incoming messages (including our own for confirmation)
                const newMessage = Utils.formatMessage(message, localParticipantName);
                store.dispatch(addMessage({
                    ...newMessage,
                    hasRead: false
                }));
            }

            break;
        default:
            logger.debug('[Rocket.Chat] Unhandled message:', msg);

            break;
        }
    }
};
