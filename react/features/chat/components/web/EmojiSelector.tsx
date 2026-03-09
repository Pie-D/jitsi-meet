import { Theme } from '@mui/material';
import React, { useCallback } from 'react';
import { makeStyles } from 'tss-react/mui';

interface IProps {
    onSelect: (emoji: string) => void;
}

const useStyles = makeStyles()((theme: Theme) => {
    return {
        emojiGrid: {
            display: 'flex',
            flexDirection: 'row',
            borderRadius: '4px',
            backgroundColor: theme.palette.ui03
        },

        emojiButton: {
            cursor: 'pointer',
            padding: '5px',
            fontSize: '1.5em'
        }
    };
});

const EmojiSelector: React.FC<IProps> = ({ onSelect }) => {
    const { classes } = useStyles();

    // Match Rocket.Chat emoji order
    const emojiList = [
        { key: 'thumbsup', emoji: '👍' },      // Like
        { key: 'hearts', emoji: '💖' },        // Love
        { key: 'laughing', emoji: '😆' },     // Laugh
        { key: 'disappointed_relieved', emoji: '😢' }, // Sad
        { key: 'angry', emoji: '😠' },         // Angry
        { key: 'fire', emoji: '🔥' }          // Fire
    ];

    const handleSelect = useCallback(
        (emoji: string) => (event: React.MouseEvent<HTMLSpanElement>) => {
            event.preventDefault();
            onSelect(emoji);
        },
        [onSelect]
    );

    return (
        <div className={classes.emojiGrid}>
            {emojiList.map(item => (
                <span
                    className={classes.emojiButton}
                    key={item.key}
                    onClick={handleSelect(item.emoji)}>
                    {item.emoji}
                </span>
            ))}
        </div>
    );
};

export default EmojiSelector;
