/* eslint-disable require-jsdoc */

export const Utils = {
    async makeRequest(method, url, body = null, headers = {}) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);

        if (!res.ok) {
            const text = await res.text();

            throw new Error(`HTTP ${res.status}: ${text}`);
        }

        if (res.headers.get('content-type')?.includes('application/json')) {
            return res.json();
        }

        return res.text();
    },

    formatMessage(msg, localName) {
        const sender = msg.u || {};
        const displayName = msg.alias || sender.username || 'Anonymous User';
        const isSystem = sender.username === 'admin';
        const isLocal = displayName === localName;
        const timestamp = typeof msg.ts === 'string'
            ? new Date(msg.ts).getTime()
            : msg.ts && msg.ts.$date ? new Date(msg.ts.$date).getTime() : Date.now();

        const reactions = new Map();

        if (msg.reactions) {
            Object.entries(msg.reactions).forEach(([ k, v ]) => {
                if (v && v.usernames) {
                    reactions.set(k, new Set(v.usernames.map(u => u.name || u.username)));
                }
            });
        }

        return {
            displayName,
            participantId: msg.customFields?.participantId || sender._id || 'unknown',
            messageId: msg._id,
            messageType: isSystem ? 'system' : isLocal ? 'local' : 'remote',
            message: msg.msg,
            timestamp,
            reactions,
            privateMessage: false,
            lobbyChat: false,
            error: false,
            isReaction: false,
            hasRead: true
        };
    },

    decodeToken(token) {
        if (!token || typeof token !== 'string') {
            throw new Error('Invalid JWT token format');
        }

        const parts = token.split('.');

        if (parts.length !== 3) {
            throw new Error('Invalid JWT token format');
        }

        const decodedToken = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

        return decodedToken || null;
    }
};
