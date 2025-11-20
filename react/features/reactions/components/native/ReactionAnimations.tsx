import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';

import { getReactionsQueue, isReactionsEnabled, shouldDisplayReactionsButtons } from '../../functions.any';

import ReactionEmoji from './ReactionEmoji';

/**
 * Renders the reactions animations in the case when there is no buttons displayed.
 * React Native version
 *
 * @returns {ReactNode}
 */
export default function ReactionAnimations() {
    const reactionsQueue = useSelector(getReactionsQueue);
    const _shouldDisplayReactionsButtons = useSelector(shouldDisplayReactionsButtons);
    const reactionsEnabled = useSelector(isReactionsEnabled);

    if (reactionsEnabled && !_shouldDisplayReactionsButtons) {
        return (
            <View style={styles.container}>
                {reactionsQueue.map(({ reaction, uid }, index) => (
                    <ReactionEmoji
                        index={index}
                        key={uid}
                        reaction={reaction}
                        uid={uid} />
                ))}
            </View>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    }
});

