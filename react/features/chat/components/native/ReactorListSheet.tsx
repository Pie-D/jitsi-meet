import React, { useCallback } from 'react';
import { ScrollView, Text, View, ViewStyle } from 'react-native';
import { useDispatch } from 'react-redux';

import BottomSheet from '../../../base/dialog/components/native/BottomSheet';
import { hideSheet } from '../../../base/dialog/actions';
import styles from './styles';

interface IProps {
    /**
     * The emoji reaction.
     */
    reaction: string;

    /**
     * List of participants who reacted.
     */
    participants: Set<any>;
}

/**
 * Component that displays a list of participants who reacted with a specific emoji.
 *
 * @returns {ReactElement}
 */
const ReactorListSheet = ({ reaction, participants }: IProps) => {
    const dispatch = useDispatch();

    const closeSheet = useCallback(() => {
        dispatch(hideSheet());
    }, [dispatch]);

    return (
        <BottomSheet onCancel={closeSheet}>
            <View style={styles.reactorListContainer as ViewStyle}>
                <Text style={styles.reactorListTitle as any}>
                    {reaction} ({participants.size})
                </Text>
                <ScrollView showsVerticalScrollIndicator={true}>
                    {Array.from(participants).map((participant, index) => {
                        let displayName: string;

                        if (typeof participant === 'object' && participant !== null) {
                            displayName = participant.alias || participant.name || participant.username || 'Unknown';
                        } else {
                            displayName = String(participant);
                        }

                        return (
                            <View
                                key={`${displayName}-${index}`}
                                style={styles.reactorItem as ViewStyle}>
                                <Text style={styles.reactorName as any}>
                                    {displayName}
                                </Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </BottomSheet>
    );
};

export default ReactorListSheet;
