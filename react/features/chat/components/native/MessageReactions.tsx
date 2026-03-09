import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useDispatch } from 'react-redux';

import { openSheet } from '../../../base/dialog/actions';

import ReactorListSheet from './ReactorListSheet';
import styles from './styles';

interface IProps {

    /**
     * The reactions for the message.
     */
    reactions: Map<string, Set<any>>;
}

/**
 * Renders the reactions for a chat message.
 *
 * @returns {React.ReactElement}
 */
const MessageReactions = ({ reactions }: IProps) => {
    const dispatch = useDispatch();

    if (!reactions || reactions.size === 0) {
        return null;
    }

    const emojiList: { [key: string]: string } = {
        ':thumbsup:': '👍',
        ':hearts:': '💖',
        ':laughing:': '😆',
        ':disappointed_relieved:': '😢',
        ':angry:': '😠',
        ':fire:': '🔥'
    };

    const reactionsArray = Array.from(reactions.entries())
        .map(([reaction, participants]) => {
            return {
                reaction,
                participants,
                count: participants.size
            };
        })
        .sort((a, b) => b.count - a.count);

    const onReactionClick = useCallback((reaction: string, participants: Set<any>) => {
        const emoji = emojiList[reaction] || reaction;

        dispatch(openSheet(ReactorListSheet, {
            reaction: emoji,
            participants
        }));
    }, [dispatch]);

    return (
        <View style={styles.reactionsContainer as ViewStyle}>
            {reactionsArray.map(({ reaction, participants, count }) => (
                <TouchableOpacity
                    key={reaction}
                    onPress={() => onReactionClick(reaction, participants)}
                    style={styles.reactionBubble as ViewStyle}>
                    <Text style={styles.reactionEmoji}>
                        {emojiList[reaction] || reaction}
                    </Text>
                    <Text style={styles.reactionCount}>
                        {count}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

export default MessageReactions;
