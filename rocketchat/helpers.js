/* eslint-disable no-empty-function */
import { log } from 'console';
import { addMessage, deleteMessage, editMessage } from '../react/features/chat/actions.any';

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

                    // Xử lý tin nhắn bị xóa
                    if (message.t === 'rm') {
                        console.log('[RocketChat] Deleting message:', message._id);
                        store.dispatch(deleteMessage(message._id));
                        return;
                    }

                    // ignore other system messages
                    if (message.t) {
                        return;
                    }

                    // Xử lý tin nhắn đến (bao gồm cả tin nhắn của chính mình để xác nhận)
                    const newMessage = Utils.formatMessage(message, localParticipantName);

                    // Kiểm tra xem tin nhắn đã tồn tại bằng messageId chưa
                    const existingMessage = store.getState()['features/chat'].messages.find(
                        m => m.messageId === newMessage.messageId
                    );

                    if (existingMessage) {
                        // Deep compare reactions to avoid unnecessary updates
                        const reactionsChanged = JSON.stringify(newMessage.reactions) !== JSON.stringify(existingMessage.reactions);
                        console.log('[Reaction] Reactions changed:', JSON.stringify(newMessage.reactions), JSON.stringify(existingMessage.reactions));

                        if (reactionsChanged) {
                            console.log('[RocketChat Helpers] Updating reactions for message:', newMessage.messageId);
                            store.dispatch(editMessage({
                                ...existingMessage,
                                reactions: newMessage.reactions
                            }));
                        } else {
                            logger.debug('[RocketChat] Message exists with same reactions, skipping');
                        }
                        return;
                    }

                    // Dispatch new message
                    store.dispatch(addMessage({
                        ...newMessage,
                        hasRead: false
                    }));
                }

                // Nhận thông báo tin nhắn đã xóa từ stream-notify-room
                if (msg.collection === 'stream-notify-room') {
                    const eventName = msg.fields?.eventName;

                    if (eventName && eventName.endsWith('/deleteMessage')) {
                        const args = msg.fields.args;

                        if (args && args[0] && args[0]._id) {
                            const deletedMessageId = args[0]._id;

                            logger.log('[RocketChat] Received deleteMessage notification:', deletedMessageId);
                            store.dispatch(deleteMessage(deletedMessageId));
                        }
                    }
                }

                break;
            default:
                logger.debug('[Rocket.Chat] Unhandled message:', msg);

                break;
        }
    }
};
