import { Theme } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toArray } from 'react-emoji-render';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { getParticipantById, getParticipantDisplayName, isPrivateChatEnabled } from '../../../base/participants/functions';
import Popover from '../../../base/popover/components/Popover.web';
import Message from '../../../base/react/components/web/Message';
import { MESSAGE_TYPE_ERROR, MESSAGE_TYPE_LOCAL } from '../../constants';
import {
    getActiveChatSearchMatch,
    getChatSearchQuery,
    getDisplayNameSuffix,
    getFormattedTimestamp,
    getMessageText,
    getPrivateNoticeMessage,
    isFileMessage
} from '../../functions';
import { IChatMessageProps } from '../../types';

import FileMessage from './FileMessage';
import MessageMenu from './MessageMenu';
import ReactButton from './ReactButton';

interface IProps extends IChatMessageProps {
    className?: string;
    enablePrivateChat?: boolean;
    isActiveSearchMatch?: boolean;
    isEditing?: boolean;
    onCancelEdit?: () => void;
    onEditMessage?: (message: IChatMessageProps['message']) => void;
    searchQuery?: string;
    shouldDisplayMenuOnRight?: boolean;
    state?: IReduxState;
}

const useStyles = makeStyles()((theme: Theme) => {
    return {
        chatMessageFooter: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: theme.spacing(1)
        },
        chatMessageFooterLeft: {
            display: 'flex',
            flexGrow: 1,
            overflow: 'hidden'
        },
        chatMessageWrapper: {
            maxWidth: '100%',
            '&:hover .action-buttons': {
                opacity: 1,
                visibility: 'visible'
            }
        },
        chatMessage: {
            display: 'inline-flex',
            padding: '12px',
            backgroundColor: theme.palette.chatMessageRemote,
            borderRadius: '4px 12px 12px 12px',
            maxWidth: '100%',
            marginTop: '4px',
            boxSizing: 'border-box' as const,

            '&.file': {
                display: 'flex',
                maxWidth: '100%',
                minWidth: 0,

                '& $replyWrapper': {
                    width: '100%',
                    minWidth: 0
                },

                '& $messageContent': {
                    width: '100%',
                    minWidth: 0
                }
            },

            '&.privatemessage': {
                backgroundColor: theme.palette.chatMessagePrivate
            },
            '&.local': {
                backgroundColor: theme.palette.chatMessageLocal,
                borderRadius: '12px 4px 12px 12px',

                '&.privatemessage': {
                    backgroundColor: theme.palette.chatMessagePrivate
                },

                '&.error': {
                    backgroundColor: theme.palette.ui02,
                    borderLeft: `3px solid ${theme.palette.textError}`,
                    borderRadius: '2px 12px 12px 12px',
                    paddingLeft: '9px'
                },

                '&.lobbymessage': {
                    backgroundColor: theme.palette.chatMessagePrivate
                }
            },
            '&.error': {
                backgroundColor: theme.palette.ui02,
                borderLeft: `3px solid ${theme.palette.textError}`,
                borderRadius: '2px 12px 12px 12px',
                paddingLeft: '9px'
            },
            '&.lobbymessage': {
                backgroundColor: theme.palette.chatMessagePrivate
            }
        },
        searchMatchActive: {
            outline: `2px solid ${theme.palette.action01}`,
            outlineOffset: '2px',
            animation: '$searchMatchFlash 1.4s ease-out'
        },

        '@keyframes searchMatchFlash': {
            '0%': {
                backgroundColor: theme.palette.warning01
            },
            '100%': {
                backgroundColor: 'transparent'
            }
        },
        sideBySideContainer: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'left',
            alignItems: 'center',
            marginLeft: theme.spacing(1)
        },
        reactionBox: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1),
            whiteSpace: 'nowrap',
            flexShrink: 0,
            backgroundColor: theme.palette.grey[800],
            borderRadius: theme.shape.borderRadius,
            padding: theme.spacing(0, 1),
            cursor: 'pointer'
        },
        reactionCountBadge: {
            fontSize: '0.8rem',
            color: theme.palette.grey[400]
        },
        replyButton: {
            padding: '2px'
        },
        replyWrapper: {
            display: 'flex',
            flexDirection: 'row' as const,
            alignItems: 'center',
            maxWidth: '100%'
        },
        messageContent: {
            maxWidth: '100%',
            overflow: 'hidden'
        },
        optionsButtonContainer: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing(1),
            minWidth: '32px',
            minHeight: '32px',
            opacity: 0,
            transition: 'opacity 0.2s',
            visibility: 'hidden'
        },
        displayName: {
            ...theme.typography.labelBold,
            color: theme.palette.chatSenderName,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            marginBottom: theme.spacing(1),
            maxWidth: '130px'
        },
        userMessage: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.chatMessageText,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',

            '& mark': {
                backgroundColor: theme.palette.warning01,
                color: theme.palette.text04,
                borderRadius: '2px',
                padding: '0 1px'
            }
        },
        deletedMessage: {
            fontStyle: 'italic',
            opacity: 0.7
        },
        errorMessage: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.textError,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        },
        privateMessageNotice: {
            ...theme.typography.labelRegular,
            color: theme.palette.chatPrivateNotice,
            marginTop: theme.spacing(1)
        },
        timestamp: {
            ...theme.typography.labelRegular,
            color: theme.palette.chatTimestamp,
            marginTop: theme.spacing(1),
            marginLeft: theme.spacing(1),
            whiteSpace: 'nowrap',
            flexShrink: 0
        },
        editedLabel: {
            ...theme.typography.labelRegular,
            color: theme.palette.chatTimestamp,
            marginLeft: theme.spacing(1),
            whiteSpace: 'nowrap'
        },
        reactionsPopover: {
            padding: theme.spacing(2),
            backgroundColor: theme.palette.chatInputBackground,
            borderRadius: theme.shape.borderRadius,
            minWidth: '200px',
            maxWidth: '300px',
            maxHeight: '400px',
            overflowY: 'auto',
            color: theme.palette.chatMessageText
        },
        reactionItem: {
            display: 'flex',
            flexDirection: 'column',
            marginBottom: theme.spacing(2),
            paddingBottom: theme.spacing(2),
            borderBottom: `1px solid ${theme.palette.ui04}`,
            '&:last-child': {
                borderBottom: 'none',
                paddingBottom: 0,
                marginBottom: 0
            }
        },
        reactionHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing(1),
            marginBottom: theme.spacing(1),
            fontSize: '1.2rem'
        },
        reactionEmoji: {
            fontSize: '1.5rem'
        },
        reactionCount: {
            fontSize: '0.9rem',
            color: theme.palette.text02,
            fontWeight: 'bold'
        },
        participantList: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing(0.5),
            marginTop: theme.spacing(1)
        },
        participant: {
            padding: theme.spacing(0.5, 1),
            backgroundColor: theme.palette.ui04,
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: theme.palette.text01,
            whiteSpace: 'nowrap'
        },
        chatMessageFooterSystem: {
            display: 'none',
        },
        timestampSystem: {
            display: 'none',
        },
        messageSystemTitle: {
            fontStyle: 'italic',
            fontWeight: 'bold',
        },
        systemMessageSign: {
            width: '4px',
            maxHeight: '100%',
            backgroundColor: '#007bff',
            marginRight: theme.spacing(2),
            borderRadius: '2px',
            display: 'inline-block'
        },
        editingNotice: {
            alignItems: 'center',
            borderTop: `1px solid ${theme.palette.chatInputBorder}`,
            color: theme.palette.chatMessageText,
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: theme.spacing(1),
            paddingTop: theme.spacing(1),
            width: '100%',
            ...theme.typography.labelRegular
        },
        cancelEdit: {
            cursor: 'pointer',
            color: theme.palette.link01
        }
    };
});

const ChatMessage = ({
    className = '',
    isEditing,
    message,
    state,
    showDisplayName,
    shouldDisplayMenuOnRight,
    isActiveSearchMatch,
    searchQuery,
    enablePrivateChat,
    knocking,
    onCancelEdit,
    onEditMessage,
    t
}: IProps) => {
    const { classes, cx } = useStyles();
    const [ isHovered, setIsHovered ] = useState(false);
    const [ isReactionsOpen, setIsReactionsOpen ] = useState(false);
    const messageRef = useRef<HTMLDivElement>(null);

    const systemMessageTitle = t('chat.systemDisplayName');

    const emojiList = [
        { key: ':thumbsup:', emoji: '👍' },      // Like
        { key: ':hearts:', emoji: '💖' },        // Love
        { key: ':laughing:', emoji: '😆' },     // Laugh
        { key: ':disappointed_relieved:', emoji: '😢' }, // Sad
        { key: ':angry:', emoji: '😠' },         // Angry
        { key: ':fire:', emoji: '🔥' }          // Fire
    ];

    useEffect(() => {
        if (!isActiveSearchMatch || !messageRef.current) {
            return;
        }

        const messageElement = messageRef.current;
        const container = messageElement.closest('#chatconversation') as HTMLElement | null;

        if (!container) {
            return;
        }

        const messageRect = messageElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const offset = messageRect.top
            - containerRect.top
            - (containerRect.height / 2)
            + (messageRect.height / 2);

        container.scrollTo({
            top: container.scrollTop + offset,
            behavior: 'smooth'
        });
    }, [ isActiveSearchMatch ]);

    const handleEditMessage = useCallback(() => {
        onEditMessage?.(message);
    }, [ message, onEditMessage ]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);



    const handleReactionsOpen = useCallback(() => {
        setIsReactionsOpen(true);
    }, []);

    const handleReactionsClose = useCallback(() => {
        setIsReactionsOpen(false);
    }, []);

    /**
     * Renders the display name of the sender.
     *
     * @returns {React$Element<*>}
     */
    function _renderDisplayName() {
        const { displayName } = message;

        return (
            <div
                aria-hidden={true}
                className={cx('display-name', classes.displayName)}>
                {`${displayName}${getDisplayNameSuffix(message)}`}
            </div>
        );
    }

    /**
     * Renders the message privacy notice.
     *
     * @returns {React$Element<*>}
     */
    function _renderPrivateNotice() {
        return (
            <div className={classes.privateMessageNotice}>
                {getPrivateNoticeMessage(message)}
            </div>
        );
    }

    /**
     * Renders the time at which the message was sent.
     *
     * @returns {React$Element<*>}
     */
    function _renderTimestamp() {
        return (
            <div className={cx('timestamp', classes.timestamp)}>
                <p>
                    {getFormattedTimestamp(message)}
                </p>
            </div>
        );
    }

    /**
     * Renders the editing notice for which message is edited.
     *
     * @returns {React$Element<*>}
     */
    function _renderEditingNotice() {
        return (
            <div className = { classes.editingNotice }>
                <span>{t('chat.editingMessage', 'Editing')}</span>
                <span
                    className = { classes.cancelEdit }
                    onClick = { onCancelEdit }>
                    {t('chat.cancel', 'Cancel')}
                </span>
            </div>
        );
    }

    /**
     * Renders the reactions for the message.
     *
     * @returns {React$Element<*>}
     */
    const renderReactions = useMemo(() => {
        if (!message.reactions || message.reactions.size === 0) {
            return null;
        }

        const reactionsArray = Array.from(message.reactions.entries())
            .map(([reaction, participants]) => {
                return {
                    reaction,
                    participants
                };
            })
            .sort((a, b) => b.participants.size - a.participants.size);

        const totalReactions = reactionsArray.reduce((sum, { participants }) => sum + participants.size, 0);
        const numReactionsDisplayed = 3;

        const reactionsContent = (
            <div className={classes.reactionsPopover}>
                {reactionsArray.map(({ reaction, participants }) => (
                    <div
                        className={classes.reactionItem}
                        key={reaction}>
                        <div className={classes.reactionHeader}>
                            <span className={classes.reactionEmoji}>{emojiList.find(e => e.key === reaction)?.emoji || reaction}</span>
                            <span className={classes.reactionCount}>{participants.size}</span>
                        </div>
                        <div className={classes.participantList}>
                            {Array.from(participants).map((participant: any, idx) => {
                                let displayName: string;

                                if (typeof participant === 'object' && participant !== null) {
                                    displayName = participant.alias || participant.name || participant.username || 'Unknown';
                                } else {
                                    displayName = String(participant);
                                }

                                return (
                                    <span
                                        className={classes.participant}
                                        key={`${displayName}-${idx}`}>
                                        {displayName}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );

        return (
            <Popover
                content={reactionsContent}
                onPopoverClose={handleReactionsClose}
                onPopoverOpen={handleReactionsOpen}
                position='auto'
                trigger='hover'
                visible={isReactionsOpen}>
                <div className={classes.reactionBox}>
                    {reactionsArray.slice(0, numReactionsDisplayed).map(({ reaction }, index) =>
                        <p key={index}>{toArray(reaction, { className: 'smiley' })}</p>
                    )}
                    {reactionsArray.length > numReactionsDisplayed && (
                        <p className={classes.reactionCountBadge}>
                            +{totalReactions - numReactionsDisplayed}
                        </p>
                    )}
                </div>
            </Popover>
        );
    }, [message?.reactions, isReactionsOpen]);

    const messageText = message.isDeleted
        ? (
            message.messageType === MESSAGE_TYPE_LOCAL
                ? t<string>('chat.deletedMessageByMe')
                : t<string>('chat.deletedMessage')
        )
        : message.isModerated
            ? t('chat.moderatedMessage')
            : getMessageText(message);

    const canEdit = message.messageType === MESSAGE_TYPE_LOCAL
        && !message.lobbyChat
        && !message.isReaction
        && !message.isFromVisitor
        && !isFileMessage(message);

    return (
        <div
            className={cx(classes.chatMessageWrapper, className)}
            id={message.messageId}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            tabIndex={-1}>
            <div className={classes.sideBySideContainer}>
                {message.messageType === 'system_chat_message' ? (
                    <div
                        className={cx(
                            'chatmessage',
                            classes.chatMessage,
                            'systemmessage'
                        )}>
                        <div className={classes.messageContent}>
                            <div
                                className={cx(
                                    'usermessage',
                                    classes.userMessage,
                                    'systemmessage'
                                )}>
                                <div className={classes.systemMessageSign} />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className={classes.messageSystemTitle}>
                                        {systemMessageTitle}
                                    </span>
                                    <Message text={getMessageText(message)} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {!shouldDisplayMenuOnRight && (
                            <div className={cx(classes.optionsButtonContainer, 'action-buttons')}>
                                {isHovered && !message.isModerated && (
                                    <MessageMenu
                                        canEdit={canEdit}
                                        displayName={message.displayName}
                                        enablePrivateChat={Boolean(enablePrivateChat)}
                                        isFileMessage={isFileMessage(message)}
                                        isFromVisitor={message.isFromVisitor}
                                        isLobbyMessage={message.lobbyChat}
                                        isModerated={message.isModerated}
                                        message={message}
                                        onEditMessage={handleEditMessage}
                                        participantId={message.participantId} />
                                )}
                            </div>
                        )}
                        <div
                            className={cx(
                                'chatmessage',
                                classes.chatMessage,
                                className,
                                message.messageType === MESSAGE_TYPE_ERROR && 'error',
                                (message.privateMessage && message.messageType !== MESSAGE_TYPE_LOCAL) && 'privatemessage',
                                message.lobbyChat && !knocking && 'lobbymessage',
                                isFileMessage(message) && 'file',
                                isActiveSearchMatch && classes.searchMatchActive
                            )}
                            ref={messageRef}>
                            <div className={classes.replyWrapper}>
                                <div className={cx('messagecontent', classes.messageContent)}>
                                    {showDisplayName && _renderDisplayName()}
                                    <div className={cx(
                                        'usermessage',
                                        message.messageType === MESSAGE_TYPE_ERROR
                                            ? classes.errorMessage
                                            : classes.userMessage,
                                        message.isDeleted && message.isModerated && classes.deletedMessage
                                    )}>
                                        {!message.isModerated && isFileMessage(message) ? (
                                            <FileMessage
                                                message={message}
                                                screenReaderHelpText={message.messageType === MESSAGE_TYPE_LOCAL
                                                    ? t<string>('chat.fileAccessibleTitleMe')
                                                    : t<string>('chat.fileAccessibleTitle', {
                                                        user: message.displayName
                                                    })} />
                                        ) : (
                                            <Message
                                                highlightQuery={searchQuery}
                                                screenReaderHelpText={message.messageType === MESSAGE_TYPE_LOCAL
                                                    ? t<string>('chat.messageAccessibleTitleMe')
                                                    : t<string>('chat.messageAccessibleTitle', {
                                                        user: message.displayName
                                                    })}
                                                text={messageText} />
                                        )}
                                        {message.isModerated && message.moderationReason && (
                                            <div className={classes.privateMessageNotice}>
                                                {t('chat.moderationReason', {
                                                    reason: message.moderationReason
                                                })}
                                            </div>
                                        )}
                                        {((message.privateMessage && message.messageType !== MESSAGE_TYPE_LOCAL) || (message.lobbyChat && !knocking))
                                            && _renderPrivateNotice()}
                                        <div className={classes.chatMessageFooter}>
                                            <div className={classes.chatMessageFooterLeft}>
                                                {!message.isDeleted && !message.isModerated && message.reactions && message.reactions.size > 0 && (
                                                    <>
                                                        {renderReactions}
                                                    </>
                                                )}
                                            </div>
                                            {message.isEdited && (
                                                <div className={classes.editedLabel}>
                                                    {t('chat.edited', '(edited)')}
                                                </div>
                                            )}
                                            {_renderTimestamp()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {shouldDisplayMenuOnRight && (
                            <div className={classes.sideBySideContainer}>
                                {!message.privateMessage && !message.lobbyChat
                                    && !message.isReaction && !message.isDeleted && !message.isModerated && (
                                    <div>
                                        <div className={cx(classes.optionsButtonContainer, 'action-buttons')}>
                                            {isHovered && <ReactButton
                                                messageId={message.messageId}
                                                receiverId={''} />}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className={cx(classes.optionsButtonContainer, 'action-buttons')}>
                                        {isHovered && !message.isDeleted && !message.isModerated && (
                                            <MessageMenu
                                                canEdit={canEdit}
                                                displayName={message.displayName}
                                                enablePrivateChat={Boolean(enablePrivateChat)}
                                                isFileMessage={isFileMessage(message)}
                                                isFromVisitor={message.isFromVisitor}
                                                isLobbyMessage={message.lobbyChat}
                                                isModerated={message.isModerated}
                                                message={message}
                                                onEditMessage={handleEditMessage}
                                                participantId={message.participantId} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            {isEditing && _renderEditingNotice()}
        </div>
    );
};

/**
 * Maps part of the Redux store to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {IProps}
 */
function _mapStateToProps(state: IReduxState, { message }: IProps) {
    const { knocking } = state['features/lobby'];

    const activeSearchMatch = getActiveChatSearchMatch(state);
    const isActiveSearchMatch = Boolean(activeSearchMatch && activeSearchMatch.messageId === message.messageId);

    const participant = getParticipantById(state, message.participantId);

    // For visitor private messages, participant will be undefined but we should still allow private chat
    // Create a visitor participant object for visitor messages to pass to isPrivateChatEnabled
    const participantForCheck = message.isFromVisitor
        ? { id: message.participantId, name: message.displayName, isVisitor: true as const }
        : participant;

    const enablePrivateChat = (!message.isFromVisitor || message.privateMessage)
        && isPrivateChatEnabled(participantForCheck, state);

    // Only the local messages appear on the right side of the chat therefore only for them the menu has to be on the
    // left side.
    const shouldDisplayMenuOnRight = message.messageType !== MESSAGE_TYPE_LOCAL;

    return {
        shouldDisplayMenuOnRight,
        enablePrivateChat,
        isActiveSearchMatch,
        searchQuery: getChatSearchQuery(state),
        knocking,
        state
    };
}

export default translate(connect(_mapStateToProps)(ChatMessage));