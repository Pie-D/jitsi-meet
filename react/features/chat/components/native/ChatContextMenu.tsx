import React, { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useDispatch } from 'react-redux';

import Icon from '../../../base/icons/components/Icon';
import { IconCloseCircle, IconCopy, IconTrash } from '../../../base/icons/svg';
import BottomSheet from '../../../base/dialog/components/native/BottomSheet';
import { hideSheet } from '../../../base/dialog/actions';
import { translate } from '../../../base/i18n/functions';
import { WithTranslation } from 'react-i18next';
import { REACTIONS } from '../../../reactions/constants';
import { sendReaction, deleteMessage } from '../../actions.any';
import styles from './styles';
import { MESSAGE_TYPE_LOCAL } from '../../constants';
// @ts-ignore
import Clipboard from '@react-native-clipboard/clipboard';

interface IProps extends WithTranslation {
    message: any;
}

const emojiList = [
    { key: 'thumbsup', emoji: '👍' },      // Like
    { key: 'hearts', emoji: '💖' },        // Love
    { key: 'laughing', emoji: '😆' },     // Laugh
    { key: 'disappointed_relieved', emoji: '😢' }, // Sad
    { key: 'angry', emoji: '😠' },         // Angry
    { key: 'fire', emoji: '🔥' }          // Fire
];

const ChatContextMenu = ({ message, t }: IProps) => {
    const dispatch = useDispatch();

    const closeSheet = useCallback(() => {
        dispatch(hideSheet());
    }, [dispatch]);

    const onReactionSelect = useCallback((reaction: string) => {
        dispatch(sendReaction(reaction, message.messageId));
        closeSheet();
    }, [dispatch, message, closeSheet]);

    const onDelete = useCallback(() => {
        dispatch(deleteMessage(message.messageId));
        closeSheet();
    }, [dispatch, message, closeSheet]);

    const onCopy = useCallback(() => {
        Clipboard.setString(message.message);
        closeSheet();
    }, [message, closeSheet]);

    const isLocalMessage = message.messageType === MESSAGE_TYPE_LOCAL;

    return (
        <BottomSheet onCancel={closeSheet}>
            <View style={styles.contextMenuContainer as ViewStyle}>
                {/* Reaction Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reactionRow as ViewStyle}>
                    {emojiList.map(item => (
                        <TouchableOpacity
                            key={item.key}
                            onPress={() => onReactionSelect(item.emoji)}
                            style={styles.reactionButton as ViewStyle}
                        >
                            <Text style={styles.reactionOption}>{item.emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.divider as ViewStyle} />

                {/* Actions */}
                <TouchableOpacity onPress={onCopy} style={styles.contextMenuItem as ViewStyle}>
                    <Icon src={IconCopy} size={24} />
                    <Text style={styles.contextMenuItemText as any}>{t('dialog.copy')}</Text>
                </TouchableOpacity>

                {isLocalMessage && (
                    <TouchableOpacity onPress={onDelete} style={styles.contextMenuItem as ViewStyle}>
                        <Icon src={IconTrash} size={24} />
                        <Text style={styles.contextMenuItemText as any}>{t('dialog.delete')}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={closeSheet} style={styles.contextMenuItem as ViewStyle}>
                    <Icon src={IconCloseCircle} size={24} />
                    <Text style={styles.contextMenuItemText as any}>{t('dialog.Cancel')}</Text>
                </TouchableOpacity>
            </View>
        </BottomSheet>
    );
};

export default translate(ChatContextMenu);
