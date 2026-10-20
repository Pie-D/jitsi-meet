import { UPDATE_CONFERENCE_METADATA } from '../base/conference/actionTypes';
import logger from './logger';
import { ILocalParticipant, IParticipant } from '../base/participants/types';
import ReducerRegistry from '../base/redux/ReducerRegistry';
import { ADD_FILE, _FILE_LIST_RECEIVED } from '../file-sharing/actionTypes';
import { IVisitorChatParticipant } from '../visitors/types';

import {
    ADD_MESSAGE,
    ADD_MESSAGE_REACTION,
    CLEAR_CHAT_SEARCH,
    CLEAR_CHAT_STATE,
    CLOSE_CHAT,
    DELETE_MESSAGE,
    EDIT_MESSAGE,
    MODERATE_MESSAGE,
    NOTIFY_PRIVATE_RECIPIENTS_CHANGED,
    OPEN_CHAT,
    PREPEND_MESSAGES,
    REMOVE_LOBBY_CHAT_PARTICIPANT,
    RETRACT_MESSAGE,
    SET_CHAT_IS_RESIZING,
    SET_CHAT_SEARCH_MATCH_INDEX,
    SET_CHAT_SEARCH_QUERY,
    SET_CHAT_WIDTH,
    SET_FOCUSED_TAB,
    SET_HISTORY_LOADED,
    SET_LOBBY_CHAT_ACTIVE_STATE,
    SET_LOBBY_CHAT_RECIPIENT,
    SET_MESSAGE_MODERATION_SUPPORTED,
    SET_PRIVATE_MESSAGE_RECIPIENT,
    SET_USER_CHAT_WIDTH,
    SET_ROCKET_CHAT_MESSAGES_LOADED
} from './actionTypes';
import { CHAT_SIZE, ChatTabs, MESSAGE_TYPE_LOCAL } from './constants';
import { addPendingEdit, createMessageId } from './functions';
import { IMessage, IPendingEditsMap } from './types';

const DEFAULT_STATE = {
    groupChatWithPermissions: false,
    isOpen: false,
    messageModerationSupported: false,
    messages: [],
    notifyPrivateRecipientsChangedTimestamp: undefined,
    pendingEdits: {},
    privateMessageRecipient: undefined,
    recentlySentMessages: new Map<string, number>(),
    searchMatchIndex: 0,
    searchQuery: '',
    shownMessages: new Set<string>(),
    unreadFilesCount: 0,
    unreadMessagesCount: 0,
    width: {
        current: CHAT_SIZE,
        userSet: null
    },
    isRocketChatMessagesLoaded: false,
    bufferedMessages: []
};

export interface IChatState {
    bufferedMessages?: any[];
    focusedTab?: ChatTabs;
    groupChatWithPermissions: boolean;
    isLobbyChatActive?: boolean;
    isOpen: boolean;
    isResizing?: boolean;
    isRocketChatMessagesLoaded?: boolean;
    lastReadMessage?: IMessage;
    lobbyMessageRecipient?: {
        id: string;
        name: string;
    } | ILocalParticipant;
    messageModerationSupported: boolean;
    messages: IMessage[];
    // nbUnreadMessages: number;
    recentlySentMessages: Map<string, number>;
    shownMessages: Set<string>;
    notifyPrivateRecipientsChangedTimestamp?: number;
    pendingEdits: IPendingEditsMap;
    privateMessageRecipient?: IParticipant | IVisitorChatParticipant;
    searchMatchIndex: number;
    searchQuery: string;
    unreadFilesCount: number;
    unreadMessagesCount: number;
    width: {
        current: number;
        userSet: number | null;
    };
}

ReducerRegistry.register<IChatState>('features/chat', (state = DEFAULT_STATE, action): IChatState => {
    switch (action.type) {
    case ADD_MESSAGE: {
        const messageId = action.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Check if we need to buffer
        const isRocketChatMessage = action.isRocketChatHistory;

        if (state.isRocketChatMessagesLoaded === false && !isRocketChatMessage) {
            const bufferedMessages = state.bufferedMessages || [];

            return {
                ...state,
                bufferedMessages: [
                    ...bufferedMessages,
                    {
                        ...action,
                        messageId
                    }
                ]
            };
        }

        const specificMessageId = action.fileMetadata
            ? `${action.participantId}-${action.timestamp}-file-${action.fileMetadata.fileId || action.messageId}`
            : createMessageId(action.participantId, action.timestamp, action.message);

        if (state.shownMessages.has(specificMessageId)) {
            return state;
        }

        if (action.messageId && state.messages.some(m => m.messageId === action.messageId)) {
            return state;
        }

        // Create content-based hash (without timestamp) for duplicate detection
        const contentHash = action.fileMetadata
            ? `${action.participantId}-file-${action.fileMetadata.fileName}-${action.fileMetadata.fileSize}`
            : `${action.participantId}-${action.message}`;
        const now = Date.now();
        const DUPLICATE_WINDOW_MS = 5000; // 5 seconds

        // Clean up old entries from recentlySentMessages
        const newRecentlySentMessages = new Map(state.recentlySentMessages);

        for (const [ hash, timestamp ] of newRecentlySentMessages.entries()) {
            if (now - timestamp > DUPLICATE_WINDOW_MS) {
                newRecentlySentMessages.delete(hash);
            }
        }

        // Check if this message was recently sent (within 5 seconds)
        const recentSendTime = newRecentlySentMessages.get(contentHash);

        // Chỉ check duplicate nếu message không phải là history từ RC (vì RC history là source of truth)
        if (!isRocketChatMessage && recentSendTime && (now - recentSendTime) < DUPLICATE_WINDOW_MS) {
            logger.debug('Duplicate detected by content hash, skipping');
            // Remove from tracking since we found the echo
            newRecentlySentMessages.delete(contentHash);

            return {
                ...state,
                recentlySentMessages: newRecentlySentMessages
            };
        }

        const newMessage: IMessage = {
            displayName: action.displayName,
            editedAt: action.editedAt,
            error: action.error,
            fileMetadata: action.fileMetadata,
            isFromGuest: Boolean(action.isFromGuest),
            isFromVisitor: Boolean(action.isFromVisitor),
            participantId: action.participantId,
            isEdited: Boolean(action.isEdited),
            isReaction: action.isReaction,
            messageId,
            messageType: action.messageType,
            message: action.message,
            reactions: action.reactions,
            privateMessage: action.privateMessage,
            lobbyChat: action.lobbyChat,
            recipient: action.recipient,
            recipientId: action.recipientId,
            replyToMessageId: action.replyToMessageId,
            sentToVisitor: Boolean(action.sentToVisitor),
            timestamp: action.timestamp
        };

        state.shownMessages.add(specificMessageId);

        // Track local messages in recentlySentMessages to detect duplicates from RC echo
        if (action.messageType === MESSAGE_TYPE_LOCAL) {
            newRecentlySentMessages.set(contentHash, now);
        }

        const pendingEdit = action.messageId ? state.pendingEdits[action.messageId] : undefined;

        // only apply a cached pending edit if its claimed author matches
        // the author of the message that actually arrived. Prevents a forged/mismatched
        // edit that was queued for a not-yet-seen messageId from silently overwriting
        // someone else's message once it shows up.
        const pendingEditValid = pendingEdit?.participantId === action.participantId;

        const finalMessage = pendingEdit && pendingEditValid
            ? {
                ...newMessage,
                message: pendingEdit.message,
                isEdited: true,
                editedAt: pendingEdit.editedAt
            }
            : newMessage;

        // React native, unlike web, needs a reverse sorted message list.
        const messages = navigator.product === 'ReactNative'
            ? [
                finalMessage,
                ...state.messages
            ]
            : [
                ...state.messages,
                finalMessage
            ];

        const pendingEdits = { ...state.pendingEdits };

        if (pendingEdit && pendingEditValid && action.messageId) {
            delete pendingEdits[action.messageId];
        }

        return {
            ...state,
            lastReadMessage:
                action.hasRead ? finalMessage : state.lastReadMessage,
            unreadMessagesCount: state.focusedTab !== ChatTabs.CHAT && !action.isReaction
                ? state.unreadMessagesCount + 1
                : state.unreadMessagesCount,
            recentlySentMessages: newRecentlySentMessages,
            messages,
            pendingEdits
        };
    }

    case ADD_MESSAGE_REACTION: {
        const { participantId, displayName, reactionList, messageId } = action;

        const messages = state.messages.map(message => {
            if (messageId === message.messageId) {
                const newReactions = new Map(message.reactions);

                reactionList.forEach((reaction: string) => {
                    let participants = newReactions.get(reaction);

                    if (!participants) {
                        participants = new Set();
                        newReactions.set(reaction, participants);
                    }

                    participants.add(displayName || participantId);
                });

                return {
                    ...message,
                    reactions: newReactions,
                    hasRead: true
                };
            }

            return message;
        });

        return {
            ...state,
            messages
        };
    }

    case CLEAR_CHAT_SEARCH:
        return {
            ...state,
            searchQuery: '',
            searchMatchIndex: 0
        };

    case CLEAR_CHAT_STATE:
        return {
            ...DEFAULT_STATE,
            width: state.width
        };

    case EDIT_MESSAGE: {
        const newMessage = action.message;
        let messageExists = false;
        let applied = false;

        const messages = state.messages.map(m => {
            if (m.messageId === newMessage.messageId) {
                messageExists = true;

                if (!newMessage.participantId || newMessage.participantId !== m.participantId) {
                    return m;
                }

                applied = true;

                return {
                    ...m,
                    message: newMessage.message,
                    isEdited: true,
                    editedAt: newMessage.editedAt
                };
            }

            return m;
        });

        // Message hasn't arrived yet — cache it as a pending edit so it can be
        // applied later, once ADD_MESSAGE validates authorship.
        if (!messageExists) {
            return {
                ...state,
                pendingEdits: addPendingEdit(state.pendingEdits, newMessage.messageId, {
                    message: newMessage.message,
                    editedAt: newMessage.editedAt,
                    participantId: newMessage.participantId
                })
            };
        }

        if (!applied) {
            return state;
        }

        return {
            ...state,
            messages
        };
    }

    case MODERATE_MESSAGE: {
        const messages = state.messages.map(message => {
            if (message.messageId === action.messageId) {
                return {
                    ...message,
                    isModerated: true,
                    moderationReason: action.reason
                };
            }

            return message;
        });

        return {
            ...state,
            messages
        };
    }

    case RETRACT_MESSAGE: {
        const messages = state.messages.map(message => {
            if (message.messageId === action.messageId && message.participantId === action.retractedBy) {
                return {
                    ...message,
                    message: '',
                    isDeleted: true,
                    retractedBy: action.retractedBy
                };
            }

            return message;
        });

        return {
            ...state,
            messages
        };
    }

    case SET_MESSAGE_MODERATION_SUPPORTED:
        return {
            ...state,
            messageModerationSupported: action.supported
        };

    case SET_CHAT_SEARCH_MATCH_INDEX:
        return {
            ...state,
            searchMatchIndex: action.index
        };

    case SET_CHAT_SEARCH_QUERY:
        return {
            ...state,
            searchQuery: action.query,
            searchMatchIndex: 0
        };

    case DELETE_MESSAGE: {
        const messages = state.messages.filter(m => m.messageId !== action.messageId);

        return {
            ...state,
            messages
        };
    }

    case PREPEND_MESSAGES: {
        // Filter out any messages already in state (dedup by messageId)
        const existingIds = new Set(state.messages.map(m => m.messageId));
        const newOldMessages = (action.messages as any[])
            .filter(m => !existingIds.has(m.messageId));

        if (!newOldMessages.length) {
            return state;
        }

        // Merge and sort ascending by timestamp so older messages sit above newer ones
        const merged = [ ...newOldMessages, ...state.messages ]
            .sort((a, b) => a.timestamp - b.timestamp);

        // React Native wants reverse order
        const messages = navigator.product === 'ReactNative'
            ? [ ...merged ].reverse()
            : merged;

        return {
            ...state,
            messages
        };
    }

    case SET_PRIVATE_MESSAGE_RECIPIENT:
        return {
            ...state,
            privateMessageRecipient: action.participant
        };

    case OPEN_CHAT:
        return {
            ...state,
            isOpen: true,
            privateMessageRecipient: action.participant
        };

    case CLOSE_CHAT:
        return {
            ...state,
            isOpen: false,
            lastReadMessage: state.messages[
                navigator.product === 'ReactNative' ? 0 : state.messages.length - 1],
            privateMessageRecipient: action.participant,
            isLobbyChatActive: false,
            searchQuery: '',
            searchMatchIndex: 0
        };

    case SET_LOBBY_CHAT_RECIPIENT:
        return {
            ...state,
            isLobbyChatActive: true,
            lobbyMessageRecipient: action.participant,
            privateMessageRecipient: undefined,
            isOpen: action.open
        };
    case SET_LOBBY_CHAT_ACTIVE_STATE:
        return {
            ...state,
            isLobbyChatActive: action.payload,
            isOpen: action.payload || state.isOpen,
            privateMessageRecipient: undefined
        };
    case REMOVE_LOBBY_CHAT_PARTICIPANT:
        return {
            ...state,
            messages: state.messages.filter(m => {
                if (action.removeLobbyChatMessages) {
                    return !m.lobbyChat;
                }

                return true;
            }),
            isOpen: state.isOpen && state.isLobbyChatActive ? false : state.isOpen,
            isLobbyChatActive: false,
            lobbyMessageRecipient: undefined
        };
    case UPDATE_CONFERENCE_METADATA: {
        const { metadata } = action;

        if (metadata?.permissions) {
            return {
                ...state,
                groupChatWithPermissions: Boolean(metadata.permissions.groupChatRestricted)
            };
        }

        break;
    }
    case SET_FOCUSED_TAB:
        return {
            ...state,
            focusedTab: action.tabId,
            unreadMessagesCount: action.tabId === ChatTabs.CHAT ? 0 : state.unreadMessagesCount,
            unreadFilesCount: action.tabId === ChatTabs.FILE_SHARING ? 0 : state.unreadFilesCount
        };

    case SET_CHAT_WIDTH: {
        return {
            ...state,
            width: {
                ...state.width,
                current: action.width
            }
        };
    }

    case SET_USER_CHAT_WIDTH: {
        const { width } = action;

        return {
            ...state,
            width: {
                current: width,
                userSet: width
            }
        };
    }

    case SET_CHAT_IS_RESIZING: {
        return {
            ...state,
            isResizing: action.resizing
        };
    }
    case NOTIFY_PRIVATE_RECIPIENTS_CHANGED:
        return {
            ...state,
            notifyPrivateRecipientsChangedTimestamp: action.payload
        };

    case ADD_FILE:
        return {
            ...state,
            unreadFilesCount: action.shouldIncrementUnread ? state.unreadFilesCount + 1 : state.unreadFilesCount
        };

    case _FILE_LIST_RECEIVED: {
        const remoteFilesCount = Object.values(action.files).filter(
            (file: any) => file.authorParticipantId !== action.localParticipantId
        ).length;

        return {
            ...state,
            unreadFilesCount: remoteFilesCount
        };
    }

    case SET_ROCKET_CHAT_MESSAGES_LOADED: {
        const { loaded } = action;
        const newMessages = [...state.messages];
        const newRecentlySentMessages = new Map(state.recentlySentMessages);

        if (loaded && state.bufferedMessages?.length) {
            // Flush buffer
            state.bufferedMessages.forEach((msgAction: any) => {
                const messageId = msgAction.messageId;
                const specificMessageId = msgAction.fileMetadata
                    ? `${msgAction.participantId}-${msgAction.timestamp}-file-${msgAction.fileMetadata.fileId || msgAction.messageId}`
                    : createMessageId(msgAction.participantId, msgAction.timestamp, msgAction.message);

                if (state.shownMessages.has(specificMessageId)) {
                    return;
                }

                if (messageId && newMessages.some(m => m.messageId === messageId)) {
                    return;
                }

                const contentHash = msgAction.fileMetadata
                    ? `${msgAction.participantId}-file-${msgAction.fileMetadata.fileName}-${msgAction.fileMetadata.fileSize}`
                    : `${msgAction.participantId}-${msgAction.message}`;
                const DUPLICATE_WINDOW_MS = 5000;

                // Check duplicate against recentlySentMessages (local echo or fast replay)
                const recentSendTime = newRecentlySentMessages.get(contentHash);
                if (recentSendTime && (msgAction.timestamp - recentSendTime) < DUPLICATE_WINDOW_MS) {
                    return;
                }

                // Also check if any message in newMessages looks like this one (deduplicate against RC history by content)
                const isDuplicateContent = newMessages.some((m: any) =>
                    m.participantId === msgAction.participantId
                    && (msgAction.fileMetadata
                        ? m.fileMetadata && m.fileMetadata.fileName === msgAction.fileMetadata.fileName && m.fileMetadata.fileSize === msgAction.fileMetadata.fileSize
                        : m.message === msgAction.message && !m.fileMetadata)
                    && Math.abs(m.timestamp - msgAction.timestamp) < 5000
                );

                if (isDuplicateContent) {
                    return;
                }

                const newMessage: IMessage = {
                    displayName: msgAction.displayName,
                    error: msgAction.error,
                    fileMetadata: msgAction.fileMetadata,
                    isFromGuest: Boolean(msgAction.isFromGuest),
                    isFromVisitor: Boolean(msgAction.isFromVisitor),
                    participantId: msgAction.participantId,
                    isReaction: msgAction.isReaction,
                    messageId,
                    messageType: msgAction.messageType,
                    message: msgAction.message,
                    reactions: msgAction.reactions,
                    privateMessage: msgAction.privateMessage,
                    lobbyChat: msgAction.lobbyChat,
                    recipient: msgAction.recipient,
                    sentToVisitor: Boolean(msgAction.sentToVisitor),
                    timestamp: msgAction.timestamp
                };

                state.shownMessages.add(specificMessageId);
                if (msgAction.messageType === MESSAGE_TYPE_LOCAL) {
                    newRecentlySentMessages.set(contentHash, msgAction.timestamp);
                }

                newMessages.push(newMessage);
            });

            // Sort by timestamp
            newMessages.sort((a, b) => a.timestamp - b.timestamp);
            if (navigator.product === 'ReactNative') {
                newMessages.reverse();
            }
        }

        return {
            ...state,
            isRocketChatMessagesLoaded: loaded,
            bufferedMessages: [], // Clear buffer
            messages: newMessages,
            recentlySentMessages: newRecentlySentMessages
        };
    }
    }

    return state;
});
