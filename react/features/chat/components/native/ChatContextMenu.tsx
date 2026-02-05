import React, { useCallback } from 'react';
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../../app/types';
import Icon from '../../../base/icons/components/Icon';
import { IconCloseCircle, IconCopy, IconReply, IconTrash } from '../../../base/icons/svg';
import BottomSheet from '../../../base/dialog/components/native/BottomSheet';
import { translate } from '../../../base/i18n/functions';
import { WithTranslation } from 'react-i18next';
import { REACTIONS } from '../../../reactions/constants';
import { sendReaction, deleteMessage, setPrivateMessageRecipientById, setLobbyChatActiveState } from '../../actions.any';
import styles from './styles';
import { MESSAGE_TYPE_LOCAL } from '../../constants';
// @ts-ignore
import Clipboard from '@react-native-clipboard/clipboard';

interface IProps extends WithTranslation {
    message: any;
    onCancel: () => void;
}

const ChatContextMenu = ({ message, onCancel, t }: IProps) => {
    const dispatch = useDispatch();
    const _styles: any = useSelector((state: IReduxState) => state['features/base/color-scheme'].scheme);

    const onReactionSelect = useCallback((reaction: string) => {
        dispatch(sendReaction(reaction, message.messageId));
        onCancel();
    }, [dispatch, message, onCancel]);

    const onDelete = useCallback(() => {
        dispatch(deleteMessage(message.messageId));
        onCancel();
    }, [dispatch, message, onCancel]);

    const onCopy = useCallback(() => {
        Clipboard.setString(message.message);
        onCancel();
    }, [message, onCancel]);

    const onReply = useCallback(() => {
        // Todo: Implement private reply logic based on participantId
        // This is simplified, actual implementation depends on how Reply is handled in native
        onCancel();
    }, [dispatch, message, onCancel]);

    const isLocalMessage = message.messageType === MESSAGE_TYPE_LOCAL;

    return (
        <BottomSheet onCancel={onCancel}>
            <View style={styles.contextMenuContainer as ViewStyle}>
                {/* Reaction Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reactionRow as ViewStyle}>
                    {Object.keys(REACTIONS).map(key => (
                        <TouchableOpacity
                            key={key}
                            onPress={() => onReactionSelect(key)}
                            style={styles.reactionButton as ViewStyle}
                        >
                            <Text style={styles.reactionOption}>{REACTIONS[key].emoji}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.divider as ViewStyle} />

                {/* Actions */}
                <TouchableOpacity onPress={onCopy} style={styles.contextMenuItem as ViewStyle}>
                    <Icon src={IconCopy} size={24} />
                    <Text style={styles.contextMenuItemText as any}>{t('chat.copy')}</Text>
                </TouchableOpacity>

                {isLocalMessage && (
                    <TouchableOpacity onPress={onDelete} style={styles.contextMenuItem as ViewStyle}>
                        <Icon src={IconTrash} size={24} />
                        <Text style={styles.contextMenuItemText as any}>{t('chat.delete')}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity onPress={onCancel} style={styles.contextMenuItem as ViewStyle}>
                    <Icon src={IconCloseCircle} size={24} />
                    <Text style={styles.contextMenuItemText as any}>{t('dialog.Cancel')}</Text>
                </TouchableOpacity>
            </View>
        </BottomSheet>
    );
};

export default translate(ChatContextMenu);
