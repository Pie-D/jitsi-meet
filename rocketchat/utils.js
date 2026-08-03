/* eslint-disable require-jsdoc */

import { ROCKET_CHAT_TO_JITSI_REACTIONS } from './constants';
import jwtDecode from 'jwt-decode';

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
            Object.entries(msg.reactions).forEach(([rcCode, v]) => {
                if (v && Array.isArray(v.usernames)) {
                    // Map Rocket.Chat reaction code to Jitsi emoji
                    const emoji = ROCKET_CHAT_TO_JITSI_REACTIONS[rcCode] || rcCode;

                    const userObjectsSet = new Set(
                        v.usernames.map(u => ({
                            username: u.username || '',
                            name: u.name || '',
                            alias: u.alias || ''
                        }))
                    );

                    reactions.set(emoji, userObjectsSet);
                }
            });
        }

        let fileMetadata = undefined;
        if (msg.file) {
            let url = '';
            if (msg.attachments && msg.attachments.length > 0 && msg.attachments[0].title_link) {
                url = msg.attachments[0].title_link;
            }
            fileMetadata = {
                fileId: msg.file._id,
                fileName: msg.file.name,
                fileType: msg.file.type || msg.file.typeGroup || 'file',
                fileSize: msg.file.size || 0,
                authorParticipantId: msg.customFields?.participantId || sender._id,
                authorParticipantName: displayName,
                timestamp,
                isRocketChatFile: true,
                url
            };
        }

        return {
            displayName,
            participantId: msg.customFields?.participantId || sender._id || 'unknown',
            messageId: msg._id,
            messageType: isSystem ? 'system' : isLocal ? 'local' : 'remote',
            message: msg.msg,
            fileMetadata,
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

        try {
            return jwtDecode(token);
        } catch (e) {
            console.error('[Utils] Failed to decode token:', e);
            return null;
        }
    }
};
