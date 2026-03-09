/* eslint-disable require-jsdoc */
const events = new Map();

export const RocketChatEventEmitter = {
    on(event, callback) {
        if (!events.has(event)) {
            events.set(event, new Set());
        }
        events.get(event).add(callback);
    },

    off(event, callback) {
        if (events.has(event)) {
            events.get(event).delete(callback);
        }
    },

    emit(event, payload) {
        if (events.has(event)) {
            events.get(event).forEach(cb => cb(payload));
        }
    }
};
