import React from "react";
import { makeStyles } from "tss-react/mui";

import { IDisplayProps } from "../ConferenceTimer";

const useStyles = makeStyles()((theme) => {
    return {
        timer: {
            ...theme.typography.labelRegular,
            color: theme.palette.text01,
            padding: "6px 8px",
            fontWeight: 600,
            backgroundColor: "#539cc7ff",
            boxSizing: "border-box",
            height: "28px",
            borderRadius: `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
            marginRight: "2px",
            borderLeft: `1px solid ${theme.palette.ui04}`,
            "@media (max-width: 300px)": {
                display: "none",
            },
        },
    };
});

/**
 * Returns web element to be rendered.
 *
 * @returns {ReactElement}
 */
export default function ConferenceTimerDisplay({ timerValue, textStyle: _textStyle }: IDisplayProps) {
    const { classes } = useStyles();

    return <span className={classes.timer}>{timerValue}</span>;
}
