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
// import LanguageSelector from './LanguageSelector';
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
     * Whether to show subtitles on stage (only latest) or in ccTab (all history).
     */
    showSubtitlesOnStage?: boolean;

    /**
     * The selected language for subtitles.
     */
    _language?: string | null;

    /**
     * Whether bilingual mode is enabled for stage subtitles.
     */
    _isStageBilingualMode?: boolean;

    /**
     * An object containing the CSS classes.
     */
    classes?: Partial<Record<keyof ReturnType<typeof styles>, string>>;
}


const styles = (theme: Theme, props: IProps) => {
    const { _isLifted = false, _clientHeight, _shiftUp = false, _toolboxVisible = false, showSubtitlesOnStage = false } = props;
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

    // Styling khác nhau cho showSubtitlesOnStage và ccTab
    const containerStyles = showSubtitlesOnStage ? {
        // showSubtitlesOnStage: hiển thị ở dưới màn hình, không scroll
        bottom: `${bottom}px`,
        marginBottom: `${marginBottom}px`,
        fontSize: `20px`,
        left: '50%',
        maxWidth: '50vw',
        overflowWrap: 'break-word' as const,
        pointerEvents: 'none' as const,
        position: 'absolute' as const,
        textShadow: `
            0px 0px 1px rgba(0,0,0,0.3),
            0px 1px 1px rgba(0,0,0,0.3),
            1px 0px 1px rgba(0,0,0,0.3),
            0px 0px 1px rgba(0,0,0,0.3)`,
        transform: 'translateX(-50%)',
        zIndex: 7, // The popups are with z-index 8. This z-index has to be lower.
        lineHeight: 1.2,
        transition: `bottom ${toCSSTransitionValue(getTransitionParamsForElementsAboveToolbox(_toolboxVisible))}`,

        span: {
            color: '#fff',
            background: 'black',

            // without this when the text is wrapped on 2+ lines there will be a gap in the background:
            padding: `${padding}px 8px`,
            boxDecorationBreak: 'clone' as const
        }
    } : {
        // ccTab: hiển thị với scroll container
        bottom: `${bottom}px`,
        marginBottom: `${marginBottom}px`,
        fontSize: `20px`,
        left: '50%',
        maxWidth: '50vw',
        maxHeight: '40vh', // Giới hạn chiều cao để có thể scroll
        pointerEvents: 'none' as const,
        position: 'absolute' as const,
        transform: 'translateX(-50%)',
        zIndex: 7,
        transition: `bottom ${toCSSTransitionValue(getTransitionParamsForElementsAboveToolbox(_toolboxVisible))}`
    };

    const scrollContainerStyles = showSubtitlesOnStage ? {
        // showSubtitlesOnStage: không cần scroll container
        maxHeight: 'auto',
        overflowY: 'visible' as const,
        overflowX: 'hidden' as const,
        padding: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
    } : {
        // ccTab: cần scroll container
        maxHeight: '100%',
        overflowY: 'auto' as const,
        overflowX: 'hidden' as const,
        scrollBehavior: 'smooth' as const,
        padding: '8px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px'
    };

    return {
        transcriptionSubtitles: containerStyles,
        subtitlesScrollContainer: scrollContainerStyles,
        subtitleMessage: {
            fontSize: `20px`,
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
        speakerName: {
            ontSize: pixelsToRem(fontSize), // Thêm style cho tên người nói
            fontStyle: 'italic', 
            color: '#ccc', // Màu chữ nhẹ hơn để phân biệt
            fontWeight: 'bold' as const
        },
        bilingualContainer: {
            display: 'flex',
            flexDirection: 'column' as const,
            gap: '4px',
            marginTop: '4px'
        },
        bilingualLine: {
            display: 'grid',
            gridTemplateColumns: 'auto auto 1fr',
            columnGap: '6px',
            alignItems: 'baseline'
        },
        bilingualTag: {
            fontWeight: 'bold' as const,
            textTransform: 'uppercase' as const
        },
        bilingualSpeakerPlaceholder: {
            visibility: 'hidden' as const
        }
    };
};

/**
 * React {@code Component} which can display speech-to-text results from
 * Jigasi as subtitles.
 */
// const Captions = (props: IProps) => {
//     console.log('=== Captions component rendered ===');
//     const scrollContainerRef = useRef<HTMLDivElement>(null);
//     const { classes = {} } = withStyles.getClasses(props) as any || {};
//     const { _displaySubtitles, _requestingSubtitles, _transcripts, _subtitlesHistory, showSubtitlesOnStage } = props;

//     // Auto-scroll to bottom when new subtitles are added (chỉ cho ccTab)
//     useEffect(() => {
//         if (scrollContainerRef.current && !showSubtitlesOnStage) {
//             scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
//         }
//     }, [_subtitlesHistory, _transcripts, showSubtitlesOnStage]);

//     if (!_requestingSubtitles || !_displaySubtitles) {
//         return null;
//     }

//     // Debug: Log để kiểm tra dữ liệu
//     console.log('Captions debug:', {
//         _subtitlesHistory: _subtitlesHistory,
//         _subtitlesHistoryLength: _subtitlesHistory?.length,
//         _transcripts: _transcripts,
//         _transcriptsSize: _transcripts?.size,
//         showSubtitlesOnStage: showSubtitlesOnStage
//     });

//     // Chỉ sử dụng subtitlesHistory để hiển thị tuần tự như chat
//     const dataToRender = _subtitlesHistory && _subtitlesHistory.length > 0 
//         ? _subtitlesHistory 
//         : null;

//     if (!dataToRender || dataToRender.length === 0) {
//         return null;
//     }

//     const paragraphs: ReactElement[] = [];

//     if (showSubtitlesOnStage) {
//         // Chế độ showSubtitlesOnStage: chỉ hiển thị phụ đề mới nhất
//         const latestSubtitle = dataToRender
//             .filter(s => s.isTranscription)
//             .sort((a, b) => b.timestamp - a.timestamp)[0];
        
//         if (latestSubtitle) {
//             const text = `${latestSubtitle.participantId}: ${latestSubtitle.text}`;
//             paragraphs.push(_renderParagraph(latestSubtitle.id, text, classes));
//         }
//     } else {
//         // Chế độ ccTab: hiển thị tất cả phụ đề tuần tự
//         for (const subtitle of dataToRender) {
//             if (subtitle.isTranscription) {
//                 const text = `${subtitle.participantId}: ${subtitle.text}`;
//                 paragraphs.push(_renderParagraph(subtitle.id, text, classes));
//             }
//         }
//     }

//     return (
//         <div className = { classes.transcriptionSubtitles || '' } >
//             {/* <LanguageSelector /> */}
//             <div 
//                 ref = { scrollContainerRef }
//                 className = { classes.subtitlesScrollContainer || '' }>
//                 { paragraphs }
//             </div>
//         </div>
//     );
// };
/**
 * Parses text that might be JSON with vi/en structure
 * @param {string} text - The text to parse
 * @returns {Object} - Object with vi and en properties, or null if not JSON
 */
function parseMessageText(text: string): { vi?: string; en?: string } | null {
    try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null && ('vi' in parsed || 'en' in parsed)) {
            return parsed;
        }
    } catch (e) {
        // Not JSON, return null
    }
    return null;
}

interface IBilingualLine {
    label: string;
    text: string;
}

function getBilingualLines(text: string): IBilingualLine[] {
    const parsedText = parseMessageText(text);

    if (parsedText === null) {
        return [];
    }

    const lines: IBilingualLine[] = [];

    if (parsedText.vi) {
        lines.push({
            label: 'vi',
            text: parsedText.vi
        });
    }

    if (parsedText.en) {
        lines.push({
            label: 'en',
            text: parsedText.en
        });
    }

    return lines;
}

/**
 * Gets the display text based on selected language
 * @param {string} text - The original text (might be JSON)
 * @param {string | null} selectedLanguage - The selected language code (e.g., 'en', 'vi', or null for original)
 * @returns {string} - The text to display
 */
function getDisplayText(text: string, selectedLanguage: string | null): string {
    const parsedText = parseMessageText(text);
    
    if (parsedText === null) {
        // Not JSON, return as is
        return text;
    }
    
    // If language is 'en' or starts with 'translation-languages:en', show English
    if (selectedLanguage === 'en' || selectedLanguage === 'translation-languages:en' || 
        (selectedLanguage && selectedLanguage.replace('translation-languages:', '') === 'en')) {
        return parsedText.en || parsedText.vi || text;
    }
    
    // Otherwise show Vietnamese (default)
    return parsedText.vi || parsedText.en || text;
}

const Captions = (props: IProps) => {
    // console.log('=== Captions component rendered ===');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { classes = {} } = props;  // Dùng trực tiếp prop classes từ props

    const {
        _displaySubtitles,
        _requestingSubtitles,
        _transcripts,
        _subtitlesHistory,
        showSubtitlesOnStage,
        _language,
        _isStageBilingualMode
    } = props;

    // Tự động cuộn xuống dưới khi có phụ đề mới (chỉ cho ccTab)
    useEffect(() => {
        if (scrollContainerRef.current && !showSubtitlesOnStage) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [_subtitlesHistory, _transcripts, showSubtitlesOnStage]);

    if (!_requestingSubtitles || !_displaySubtitles) {
        return null;
    }

    // Debug: Log để kiểm tra dữ liệu
    console.log('Captions debug:', {
        _subtitlesHistory: _subtitlesHistory,
        _subtitlesHistoryLength: _subtitlesHistory?.length,
        _transcripts: _transcripts,
        _transcriptsSize: _transcripts?.size,
        showSubtitlesOnStage: showSubtitlesOnStage,
        _language: _language
    });

    // Chỉ sử dụng subtitlesHistory để hiển thị tuần tự như chat
    const dataToRender = _subtitlesHistory && _subtitlesHistory.length > 0 
        ? _subtitlesHistory 
        : null;

    if (!dataToRender || dataToRender.length === 0) {
        return null;
    }

    const paragraphs: ReactElement[] = [];

    if (showSubtitlesOnStage) {
        
        // Chế độ showSubtitlesOnStage: chỉ hiển thị phụ đề mới nhất
        const latestSubtitle = dataToRender
            .filter(s => s.isTranscription)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        if (latestSubtitle) {
            // Hàm kiểm tra xem có phải là email không
        const isEmail = (str: string): boolean => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str);

        // Hàm xử lý tên để rút gọn
        const abbreviateName = (name: string): string => {
            // Chia tên thành các phần
            const nameParts = name.trim().split(' ');

            // Nếu tên có hơn 1 phần (họ + tên), lấy chữ cái đầu của mỗi phần
           const initials = nameParts
                        .slice(0, -1)
                        .map((word: string) => word[0].toUpperCase())
                        .join("");
                    const lastName = nameParts[nameParts.length - 1][0].toUpperCase() + nameParts[nameParts.length - 1].slice(1);
                    const shortName = `${initials}.${lastName}`;

            // Ghép các chữ cái đầu và tên đầy đủ lại thành tên viết tắt
            return shortName;
        };

        // Kiểm tra participantName và xử lý phù hợp
        let participantNameT = latestSubtitle.participantName ? latestSubtitle.participantName : 'CMC ATIer';

        if (isEmail(participantNameT)) {
            // Nếu là email, lấy phần trước dấu '@'
            participantNameT = participantNameT.split('@')[0];
        } else {
            // Nếu không phải email, rút gọn tên
            participantNameT = abbreviateName(participantNameT);
        }
            if (_isStageBilingualMode) {
                const lines = getBilingualLines(latestSubtitle.text);

                if (lines.length > 0) {
                    paragraphs.push(
                        _renderBilingualParagraph(
                            latestSubtitle.id,
                            latestSubtitle.participantName ? participantNameT : 'CMC ATIer',
                            lines,
                            classes
                        )
                    );
                } else {
                    const fallbackText = getDisplayText(latestSubtitle.text, _language ?? null);
                    const text = `${latestSubtitle.participantName ? participantNameT : "CMC ATIer"}: ${fallbackText}`;
                    paragraphs.push(_renderParagraph(latestSubtitle.id, text, classes));
                }
            } else {
                // Get display text based on selected language
                const displayText = getDisplayText(
                    latestSubtitle.text,
                    _language ?? null
                );
                const text = `${latestSubtitle.participantName ? participantNameT : "CMC ATIer"}: ${displayText}`;
                paragraphs.push(_renderParagraph(latestSubtitle.id, text, classes));
            }
        }
    } else {
        // Chế độ ccTab: hiển thị tất cả phụ đề tuần tự
        for (const subtitle of dataToRender) {
            if (subtitle.isTranscription) {
                const text = `${subtitle.participantId}: ${subtitle.text}`;
                paragraphs.push(_renderParagraph(subtitle.id, text, classes));
            }
        }
    }

    return (
        <div className={classes.transcriptionSubtitles || ''}>
            {/* <LanguageSelector /> */}
            <div 
                ref={scrollContainerRef}
                className={classes.subtitlesScrollContainer || ''}>
                {paragraphs}
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

    // Fallback styles khi classes undefined để đảm bảo phụ đề luôn hiển thị được
    const fallbackStyles = {
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '4px',
        padding: '8px',
        marginBottom: '2px',
        color: '#fff',
        lineHeight: 1.2,
        overflowWrap: 'break-word' as const,
        textShadow: '0px 0px 1px rgba(0,0,0,0.3), 0px 1px 1px rgba(0,0,0,0.3), 1px 0px 1px rgba(0,0,0,0.3)'
    };

    const speakerStyles = {
        fontStyle: 'italic',
        color: '#ccc',
        fontWeight: 'bold' as const
    };
    const speakerPlaceholderStyles = {
        visibility: 'hidden' as const,
        fontStyle: 'italic',
        color: '#ccc',
        fontWeight: 'bold' as const
    };

    return (
        <div 
            key = { id } 
            className = { classes?.subtitleMessage || '' }
            style = { !classes?.subtitleMessage ? fallbackStyles : undefined }>
            { speaker && (
                <span 
                    className={ classes?.speakerName || '' }
                    style = { !classes?.speakerName ? speakerStyles : undefined }>
                    { speaker }: 
                </span> 
            ) }
            <span>{ subtitle }</span>
        </div>
    );
}

function _renderBilingualParagraph(
        id: string,
        speaker: string,
        lines: IBilingualLine[],
        classes: any): ReactElement {
    const fallbackStyles = {
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '4px',
        padding: '8px',
        marginBottom: '2px',
        color: '#fff',
        lineHeight: 1.2,
        overflowWrap: 'break-word' as const,
        textShadow: '0px 0px 1px rgba(0,0,0,0.3), 0px 1px 1px rgba(0,0,0,0.3), 1px 0px 1px rgba(0,0,0,0.3)'
    };
    const speakerStyles = {
        fontStyle: 'italic',
        color: '#ccc',
        fontWeight: 'bold' as const
    };
    const speakerPlaceholderStyles = {
        visibility: 'hidden' as const,
        fontStyle: 'italic',
        color: '#ccc',
        fontWeight: 'bold' as const
    };
    const bilingualContainerStyles = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '4px',
        marginTop: '4px'
    };
    const bilingualLineStyles = {
        display: 'flex',
        gap: '6px',
        alignItems: 'baseline'
    };
    const bilingualTagStyles = {
        fontWeight: 'bold' as const,
        textTransform: 'uppercase' as const
    };

    const [ firstLine, ...remainingLines ] = lines;

    return (
        <div
            key = { id }
            className = { classes?.subtitleMessage || '' }
            style = { !classes?.subtitleMessage ? fallbackStyles : undefined }>
            {firstLine && (
                <div
                    className = { classes?.bilingualLine || '' }
                    style = { !classes?.bilingualLine ? bilingualLineStyles : undefined }>
                    <span
                        className = { classes?.speakerName || '' }
                        style = { !classes?.speakerName ? speakerStyles : undefined }>
                        { speaker }:
                    </span>
                    <span
                        className = { classes?.bilingualTag || '' }
                        style = { !classes?.bilingualTag ? bilingualTagStyles : undefined }>
                        [{ firstLine.label }]
                    </span>
                    <span>{ firstLine.text }</span>
                </div>
            )}
            {remainingLines.length > 0 && (
                <div
                    className = { classes?.bilingualContainer || '' }
                    style = { !classes?.bilingualContainer ? bilingualContainerStyles : undefined }>
                    {remainingLines.map(line => (
                        <div
                            key = { `${id}-${line.label}` }
                            className = { classes?.bilingualLine || '' }
                            style = { !classes?.bilingualLine ? bilingualLineStyles : undefined }>
                    <span
                        className = { classes?.bilingualSpeakerPlaceholder || '' }
                        style = { !classes?.bilingualSpeakerPlaceholder ? speakerPlaceholderStyles : undefined }>
                        { speaker }:
                    </span>
                    <span
                        className = { classes?.bilingualTag || '' }
                        style = { !classes?.bilingualTag ? bilingualTagStyles : undefined }>
                        [{ line.label }]
                    </span>
                            <span>{ line.text }</span>
                        </div>
                    ))}
                </div>
            )}
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
    const { showSubtitlesOnStage = true } = state['features/base/settings'];
    const { _language, _isStageBilingualMode } = state['features/subtitles'];

    return {
        ..._abstractMapStateToProps(state),
        _isLifted: shouldDisplayStageParticipantBadge(state),
        _clientHeight: clientHeight,
        _shiftUp: state['features/toolbox'].shiftUp,
        _toolboxVisible: isToolboxVisible(state),
        showSubtitlesOnStage,
        _language,
        _isStageBilingualMode
    };
}

export default connect(mapStateToProps)(withStyles(Captions, styles));