import React, { Component, ReactElement } from 'react';

import { IReduxState } from '../../app/types';


/**
 * {@code AbstractCaptions} Properties.
 */
export interface IAbstractCaptionsProps {

    /**
     * Whether local participant is displaying subtitles.
     */
    _displaySubtitles: boolean;

    /**
     * Whether local participant is requesting subtitles.
     */
    _requestingSubtitles: boolean;

    /**
     * Transcript texts formatted with participant's name and final content.
     * Mapped by id just to have the keys for convenience during the rendering
     * process.
     */
    _transcripts?: Map<string, string>;
        /**
     * Array of all subtitle messages in chronological order.
     */
    _subtitlesHistory?: Array<any>;
}

/**
 * Abstract React {@code Component} which can display speech-to-text results
 * from Jigasi as subtitles.
 */
export class AbstractCaptions<P extends IAbstractCaptionsProps> extends Component<P> {

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render(): any {
    const { _displaySubtitles, _requestingSubtitles, _transcripts, _subtitlesHistory } = this.props;

    if (!_requestingSubtitles || !_displaySubtitles) {
        return null;
    }

    // Chỉ sử dụng subtitlesHistory để tránh hiển thị trùng lặp
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
            paragraphs.push(this._renderParagraph(subtitle.id, text));
        }
    }

    // @ts-ignore
    return this._renderSubtitlesContainer(paragraphs);
}
    /**
     * Renders the transcription text.
     *
     * @abstract
     * @param {string} _id - The ID of the transcript message from which the
     * {@code text} has been created.
     * @param {string} _text - Subtitles text formatted with the participant's
     * name.
     * @protected
     * @returns {ReactElement} - The React element which displays the text.
     */
    _renderParagraph(_id: string, _text: string) {
        return <></>;
    }

    /**
     * Renders the subtitles container.
     *
     * @abstract
     * @param {Array<ReactElement>} _el - An array of elements created
     * for each subtitle using the {@link _renderParagraph} method.
     * @protected
     * @returns {ReactElement} - The subtitles container.
     */
    _renderSubtitlesContainer(_el: Array<ReactElement>) {
        return <></>;
    }
}

/**
 * Formats the transcript messages into text by prefixing participant's name to
 * avoid duplicating the effort on platform specific component.
 *
 * @param {Object} state - The redux state.
 * @private
 * @returns {Map<string, string>} - Formatted transcript subtitles mapped by
 * transcript message IDs.
 */
function _constructTranscripts(state: IReduxState): Map<string, string> {
    const { _transcriptMessages } = state['features/subtitles'];
    const transcripts = new Map();

    for (const [ id, transcriptMessage ] of _transcriptMessages) {
        if (transcriptMessage) {
            let text = `${transcriptMessage.participant.name}: `;

            if (transcriptMessage.final) {
                text += transcriptMessage.final;
            } else {
                const stable = transcriptMessage.stable || '';
                const unstable = transcriptMessage.unstable || '';

                text += stable + unstable;
            }

            transcripts.set(id, text);
        }
    }

    return transcripts;
}

/**
 * Maps the transcriptionSubtitles in the redux state to the associated props of
 * {@code AbstractCaptions}.
 *
 * @param {Object} state - The redux state.
 * @private
 * @returns {{
 *     _requestingSubtitles: boolean,
 *     _transcripts: Map<string, string>,
 *    _subtitlesHistory: Array<any>
 * }}
 */
export function _abstractMapStateToProps(state: IReduxState) {
    const { _displaySubtitles, _requestingSubtitles, subtitlesHistory } = state['features/subtitles'];
    const transcripts = _constructTranscripts(state);

    return {
        _displaySubtitles,
        _requestingSubtitles,
        _transcripts: transcripts.size === 0 ? undefined : transcripts,
        _subtitlesHistory: subtitlesHistory
    };
}
