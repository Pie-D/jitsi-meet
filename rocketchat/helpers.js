/* eslint-disable require-jsdoc */
/* eslint-disable no-empty-function */
import { addMessage } from '../react/features/chat/actions.any';

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
            client.publish({ destination: '',
                body: JSON.stringify({ msg: 'pong' }) });

            break;
        case 'result':
            if (msg.id === 'login-1') {
                logger.log('WebSocket login successfully!');
            }

            break;
        case 'changed':
            if (msg.collection === 'stream-room-messages') {
                const message = msg.fields.args[0];

                if (!message.customFields?.fromJitsi && !message.t) {
                    const newMessage = this.formatMessage(message, localParticipantName);

                    store.dispatch(addMessage({
                        ...newMessage,
                        hadRead: false
                    }));
                }
            }

            break;
        default:
            logger.debug('[Rocket.Chat] Unhandled message:', msg);

            break;
        }
    },

    addMessageToStore(store, message, messageFilter) {
        const shownMessages = store.getState().features.chat.shownMessages;

        const alreadyShown = shownMessages && typeof shownMessages.has === 'function'
            ? shownMessages.has(message.messageId)
            : shownMessages && shownMessages[message.messageId];

        if (alreadyShown || messageFilter.has(message.messageId)) {
            return;
        }

        messageFilter.add(message.messageId);

        store.dispatch(addMessage({
            ...message,
            hasRead: false
        }));
    },

    createMessageFilter() {
        const shownMessages = new Set();

        return {
            add: messageId => shownMessages.add(messageId),
            has: messageId => shownMessages.has(messageId),
            clear: () => shownMessages.clear(),
            size: () => shownMessages.size
        };
    }
};
