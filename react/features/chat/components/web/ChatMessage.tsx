import { Theme } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import { toArray } from 'react-emoji-render';
import { connect } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { getParticipantById, getParticipantDisplayName, isPrivateChatEnabled } from '../../../base/participants/functions';
import Popover from '../../../base/popover/components/Popover.web';
import Message from '../../../base/react/components/web/Message';
import { MESSAGE_TYPE_ERROR, MESSAGE_TYPE_LOCAL } from '../../constants';
import { getDisplayNameSuffix, getFormattedTimestamp, getMessageText, getPrivateNoticeMessage, isFileMessage } from '../../functions';
import { IChatMessageProps } from '../../types';

import FileMessage from './FileMessage';
import MessageMenu from './MessageMenu';
import ReactButton from './ReactButton';

interface IProps extends IChatMessageProps {
    className?: string;
    enablePrivateChat?: boolean;
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
            maxWidth: '100%'
        },
        chatMessage: {
            display: 'inline-flex',
            padding: '12px',
            backgroundColor: theme.palette.ui02,
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
                backgroundColor: theme.palette.support05
            },
            '&.local': {
                backgroundColor: theme.palette.ui04,
                borderRadius: '12px 4px 12px 12px',

                '&.privatemessage': {
                    backgroundColor: theme.palette.support05
                },
                '&.local': {
                    backgroundColor: theme.palette.ui04,
                    borderRadius: '12px 4px 12px 12px',

                    '&.privatemessage': {
                        backgroundColor: theme.palette.support05
                    }
                },

                '&.error': {
                    backgroundColor: theme.palette.ui02,
                    borderLeft: `3px solid ${theme.palette.textError}`,
                    borderRadius: '2px 12px 12px 12px',
                    paddingLeft: '9px'
                },

                '&.lobbymessage': {
                    backgroundColor: theme.palette.support05
                }
            },
            '&.error': {
                backgroundColor: theme.palette.ui02,
                borderLeft: `3px solid ${theme.palette.textError}`,
                borderRadius: '2px 12px 12px 12px',
                paddingLeft: '9px'
            },
            '&.lobbymessage': {
                backgroundColor: theme.palette.support05
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
            minHeight: '32px'
        },
        displayName: {
            ...theme.typography.labelBold,
            color: theme.palette.text02,
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            marginBottom: theme.spacing(1),
            maxWidth: '130px'
        },
        userMessage: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text01,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        },
        errorMessage: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.textError,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
        },
        privateMessageNotice: {
            ...theme.typography.labelRegular,
            color: theme.palette.text02,
            marginTop: theme.spacing(1)
        },
        timestamp: {
            ...theme.typography.labelRegular,
            color: theme.palette.text03,
            marginTop: theme.spacing(1),
            marginLeft: theme.spacing(1),
            whiteSpace: 'nowrap',
            flexShrink: 0
        },
        reactionsPopover: {
            padding: theme.spacing(2),
            backgroundColor: theme.palette.ui03,
            borderRadius: theme.shape.borderRadius,
            minWidth: '200px',
            maxWidth: '300px',
            maxHeight: '400px',
            overflowY: 'auto',
            color: theme.palette.text01,
            boxShadow: theme.shadows[5]
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
        }
    };
});

const ChatMessage = ({
    className = '',
    message,
    state,
    showDisplayName,
    shouldDisplayMenuOnRight,
    enablePrivateChat,
    knocking,
    t
}: IProps) => {
    const { classes, cx } = useStyles();
    const [isHovered, setIsHovered] = useState(false);
    const [isReactionsOpen, setIsReactionsOpen] = useState(false);
    const systemMessageTitle = 'Tin nhắn hệ thống';

    const emojiList = [
        { key: ':thumbsup:', emoji: '👍' },      // Like
        { key: ':hearts:', emoji: '💖' },        // Love
        { key: ':laughing:', emoji: '😆' },     // Laugh
        { key: ':disappointed_relieved:', emoji: '😢' }, // Sad
        { key: ':angry:', emoji: '😠' },         // Angry
        { key: ':fire:', emoji: '🔥' }          // Fire
    ];

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
                            {Array.from(participants as Set<string>).map((participantName: string, idx) => (
                                <span
                                    className={classes.participant}
                                    key={`${participantName}-${idx}`}>
                                    {participantName === 'anonymous' ? t('chat.anonymous') : participantName}
                                </span>
                            ))}
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
    }, [message?.reactions, isHovered, isReactionsOpen]);

    return (
        <div
            className={cx(classes.chatMessageWrapper, className)}
            id={message.messageId}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            tabIndex={-1}>
            <div className={classes.sideBySideContainer}>
                {message.messageType === 'system' ? (
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
                            <div className={classes.optionsButtonContainer}>
                                {isHovered && <MessageMenu
                                    displayName={message.displayName}
                                    enablePrivateChat={Boolean(enablePrivateChat)}
                                    isFileMessage={isFileMessage(message)}
                                    isFromVisitor={message.isFromVisitor}
                                    isLobbyMessage={message.lobbyChat}
                                    message={message.message}
                                    messageId={message.messageId}
                                    messageType={message.messageType}
                                    participantId={message.participantId} />
                                }
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
                                isFileMessage(message) && 'file'
                            )}>
                            <div className={classes.replyWrapper}>
                                <div className={cx('messagecontent', classes.messageContent)}>
                                    {showDisplayName && _renderDisplayName()}
                                    <div className={cx(
                                        'usermessage',
                                        message.messageType === MESSAGE_TYPE_ERROR
                                            ? classes.errorMessage
                                            : classes.userMessage
                                    )}>
                                        {isFileMessage(message) ? (
                                            <FileMessage
                                                message={message}
                                                screenReaderHelpText={message.messageType === MESSAGE_TYPE_LOCAL
                                                    ? t<string>('chat.fileAccessibleTitleMe')
                                                    : t<string>('chat.fileAccessibleTitle', {
                                                        user: message.displayName
                                                    })
                                                } />
                                        ) : (
                                            <Message
                                                screenReaderHelpText={message.messageType === MESSAGE_TYPE_LOCAL
                                                    ? t<string>('chat.messageAccessibleTitleMe')
                                                    : t<string>('chat.messageAccessibleTitle', {
                                                        user: message.displayName
                                                    })}
                                                text={getMessageText(message)} />
                                        )}
                                        {((message.privateMessage && message.messageType !== MESSAGE_TYPE_LOCAL) || (message.lobbyChat && !knocking))
                                            && _renderPrivateNotice()}
                                        <div className={classes.chatMessageFooter}>
                                            <div className={classes.chatMessageFooterLeft}>
                                                {message.reactions && message.reactions.size > 0 && (
                                                    <>
                                                        {renderReactions}
                                                    </>
                                                )}
                                            </div>
                                            {_renderTimestamp()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {shouldDisplayMenuOnRight && (
                            <div className={classes.sideBySideContainer}>
                                {!message.privateMessage && !message.lobbyChat
                                    && !message.isReaction && <div>
                                        <div className={classes.optionsButtonContainer}>
                                            {isHovered && <ReactButton
                                                messageId={message.messageId}
                                                receiverId={''} />}
                                        </div>
                                    </div>}
                                <div>
                                    <div className={classes.optionsButtonContainer}>
                                        {isHovered && <MessageMenu
                                            displayName={message.displayName}
                                            enablePrivateChat={Boolean(enablePrivateChat)}
                                            isFileMessage={isFileMessage(message)}
                                            isFromVisitor={message.isFromVisitor}
                                            isLobbyMessage={message.lobbyChat}
                                            message={message.message}
                                            messageId={message.messageId}
                                            messageType={message.messageType}
                                            participantId={message.participantId} />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
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
        knocking,
        state
    };
}

export default translate(connect(_mapStateToProps)(ChatMessage));