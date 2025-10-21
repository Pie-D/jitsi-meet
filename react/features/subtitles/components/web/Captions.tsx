import { Theme } from '@mui/material';
import React, { ReactElement, useRef, useEffect } from 'react';
import { connect } from 'react-redux';
import { withStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { getVideospaceFloatingElementsBottomSpacing, pixelsToRem, remToPixels } from '../../../base/ui/functions.web';
import { getStageParticipantNameLabelHeight } from '../../../display-name/components/web/styles';
import { shouldDisplayStageParticipantBadge } from '../../../display-name/functions';
import {
    getTransitionParamsForElementsAboveToolbox,
    isToolboxVisible,
    toCSSTransitionValue
} from '../../../toolbox/functions.web';
import { calculateSubtitlesFontSize } from '../../functions.web';
import {
    AbstractCaptions,
    type IAbstractCaptionsProps,
    _abstractMapStateToProps
} from '../AbstractCaptions';
import LanguageSelector from './LanguageSelector';
interface IProps extends IAbstractCaptionsProps {

    /**
     * The height of the visible area.
     */
    _clientHeight?: number;

    /**
     * Whether the subtitles container is lifted above the invite box.
     */
    _isLifted: boolean | undefined;

    /**
     * Whether toolbar is shifted up or not.
     */
    _shiftUp: boolean;

    /**
     * Whether the toolbox is visible or not.
     */
    _toolboxVisible: boolean;

    /**
     * An object containing the CSS classes.
     */
    classes?: Partial<Record<keyof ReturnType<typeof styles>, string>>;
}


const styles = (theme: Theme, props: IProps) => {
    const { _isLifted = false, _clientHeight, _shiftUp = false, _toolboxVisible = false } = props;
    const fontSize = calculateSubtitlesFontSize(_clientHeight);

    // Normally we would use 0.2 * fontSize in order to cover the background gap from line-height: 1.2 but it seems
    // the current font is a little bit larger than it is supposed to be.
    const padding = 0.1 * fontSize;
    let bottom = getVideospaceFloatingElementsBottomSpacing(theme, _toolboxVisible);
    let marginBottom = 0;

    // This is the case where we display the onstage participant display name
    // below the subtitles.
    if (_isLifted) {
        // 10px is the space between the onstage participant display name label and subtitles. We also need
        // to add the padding of the subtitles because it will decrease the gap between the label and subtitles.
        bottom += remToPixels(getStageParticipantNameLabelHeight(theme, _clientHeight)) + 10 + padding;
    }

    if (_shiftUp) {
        // The toolbar is shifted up with 30px from the css.
        marginBottom += 30;
    }

    return {
        transcriptionSubtitles: {
            bottom: `${bottom}px`,
            marginBottom: `${marginBottom}px`,
            fontSize: pixelsToRem(fontSize),
            left: '50%',
            maxWidth: '50vw',
            maxHeight: '40vh', // Giới hạn chiều cao để có thể scroll
            pointerEvents: 'none' as const,
            position: 'absolute' as const,
            transform: 'translateX(-50%)',
            zIndex: 7, // The popups are with z-index 8. This z-index has to be lower.
            transition: `bottom ${toCSSTransitionValue(getTransitionParamsForElementsAboveToolbox(_toolboxVisible))}`
        },
        subtitlesScrollContainer: {
            maxHeight: '100%',
            overflowY: 'auto' as const,
            overflowX: 'hidden' as const,
            scrollBehavior: 'smooth' as const,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '4px'
        },
        subtitleMessage: {
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '4px',
            padding: `${padding}px 8px`,
            marginBottom: '2px',
            textShadow: `
                0px 0px 1px rgba(0,0,0,0.3),
                0px 1px 1px rgba(0,0,0,0.3),
                1px 0px 1px rgba(0,0,0,0.3),
                0px 0px 1px rgba(0,0,0,0.3)`,
            lineHeight: 1.2,
            overflowWrap: 'break-word' as const,

            span: {
                color: '#fff'
            }
        },
        speakerName: { // Thêm style cho tên người nói
            fontStyle: 'italic', 
            color: '#ccc', // Màu chữ nhẹ hơn để phân biệt
            fontWeight: 'bold' as const
        }
    };
};

/**
 * React {@code Component} which can display speech-to-text results from
 * Jigasi as subtitles.
 */
const Captions = (props: IProps) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { classes, _displaySubtitles, _requestingSubtitles, _transcripts, _subtitlesHistory } = props;

    // Auto-scroll to bottom when new subtitles are added
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [_subtitlesHistory, _transcripts]);

    if (!_requestingSubtitles || !_displaySubtitles) {
        return null;
    }

    // Chỉ sử dụng subtitlesHistory để hiển thị tuần tự như chat
    const dataToRender = _subtitlesHistory && _subtitlesHistory.length > 0 
        ? _subtitlesHistory 
        : null;

    if (!dataToRender || dataToRender.length === 0) {
        return null;
    }

    const paragraphs: ReactElement[] = [];

    // Xử lý subtitlesHistory, bao gồm cả interim subtitles
    for (const subtitle of dataToRender) {
        if (subtitle.isTranscription) {
            const text = `${subtitle.participantId}: ${subtitle.text}`;
            paragraphs.push(_renderParagraph(subtitle.id, text, classes));
        }
    }

    return (
        <div className = { classes?.transcriptionSubtitles || '' } >
            <LanguageSelector />
            <div 
                ref = { scrollContainerRef }
                className = { classes?.subtitlesScrollContainer || '' }>
                { paragraphs }
            </div>
        </div>
    );
};

/**
 * Renders the transcription text.
 *
 * @param {string} id - The ID of the transcript message from which the
 * {@code text} has been created.
 * @param {string} text - Subtitles text formatted with the participant's
 * name.
 * @param {Object} classes - CSS classes object.
 * @returns {ReactElement} - The React element which displays the text.
 */
function _renderParagraph(id: string, text: string, classes: any): ReactElement {
    // Tách tên người nói và nội dung phụ đề
    const parts = text.split(': ');
    const speaker = parts.length > 1 ? parts[0] : '';
    const subtitle = parts.length > 1 ? parts.slice(1).join(': ') : text;

    return (
        <div key = { id } className = { classes?.subtitleMessage || '' }>
            { speaker && <span className={ classes?.speakerName || '' }>{ speaker }: </span> }
            <span>{ subtitle }</span>
        </div>
    );
}

/**
 * Maps (parts of) the redux state to the associated {@code }'s
 * props.
 *
 * @param {Object} state - The redux state.
 * @private
 * @returns {Object}
 */
function mapStateToProps(state: IReduxState) {
    const { clientHeight } = state['features/base/responsive-ui'];

    return {
        ..._abstractMapStateToProps(state),
        _isLifted: shouldDisplayStageParticipantBadge(state),
        _clientHeight: clientHeight,
        _shiftUp: state['features/toolbox'].shiftUp,
        _toolboxVisible: isToolboxVisible(state)
    };
}

export default connect(mapStateToProps)(withStyles(Captions, styles));