import { createToolbarEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { IReduxState } from '../../../app/types';
import { IconRecord, IconStop } from '../../../base/icons/svg';
import { MEET_FEATURES } from '../../../base/jwt/constants';
import { isJwtFeatureEnabled } from '../../../base/jwt/functions';
import { JitsiRecordingConstants } from '../../../base/lib-jitsi-meet';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { maybeShowPremiumFeatureDialog } from '../../../jaas/actions';
import { canStopRecording, getRecordButtonProps } from '../../functions';

/**
 * The type of the React {@code Component} props of
 * {@link AbstractRecordButton}.
 */
export interface IProps extends AbstractButtonProps {

    /**
     * True if the button needs to be disabled.
     */
    _disabled: boolean;

    /**
     * True if there is a running active recording, false otherwise.
     */
    _isRecordingRunning: boolean;

    /**
     * The tooltip to display when hovering over the button.
     */
    _tooltip?: string;

    /**
     * True if the user only has the transcription feature enabled.
     */
    _isTranscriptionOnly?: boolean;
}

/**
 * An abstract implementation of a button for starting and stopping recording.
 */
export default class AbstractRecordButton<P extends IProps> extends AbstractButton<P> {
    override accessibilityLabel = 'dialog.startRecording';
    override toggledAccessibilityLabel = 'dialog.stopRecording';
    override icon = IconRecord;
    override label = 'dialog.startRecording';
    override toggledLabel = 'dialog.stopRecording';
    override toggledIcon = IconStop;

    /**
     * Returns the tooltip that should be displayed when the button is disabled.
     *
     * @private
     * @returns {string}
     */
    override _getTooltip() {
        if (this.props._isTranscriptionOnly) {
            return this._isToggled() ? 'transcribing.stop' : 'transcribing.start';
        }
        return this.props._tooltip ?? '';
    }

    /**
     * Gets the current label, taking the transcribing state into account.
     *
     * @override
     * @protected
     * @returns {string}
     */
    override _getLabel() {
        if (this.props._isTranscriptionOnly) {
            return this._isToggled() ? 'transcribing.stop' : 'transcribing.start';
        }
        return super._getLabel();
    }

    /**
     * Gets the current accessibility label, taking the transcribing state into account.
     *
     * @override
     * @protected
     * @returns {string}
     */
    override _getAccessibilityLabel() {
        if (this.props._isTranscriptionOnly) {
            return this._isToggled() ? 'transcribing.stop' : 'transcribing.start';
        }
        return super._getAccessibilityLabel();
    }

    /**
     * Helper function to be implemented by subclasses, which should be used
     * to handle the start recoding button being clicked / pressed.
     *
     * @protected
     * @returns {void}
     */
    _onHandleClick() {
        // To be implemented by subclass.
    }

    /**
     * Handles clicking / pressing the button.
     *
     * @override
     * @protected
     * @returns {void}
     */
    override _handleClick() {
        const { _isRecordingRunning, dispatch } = this.props;

        sendAnalytics(createToolbarEvent(
            'recording.button',
            {
                'is_recording': _isRecordingRunning,
                type: JitsiRecordingConstants.mode.FILE
            }));
        
        // Check both RECORDING (cloud) and LOCAL_RECORDING features
        // Only block if BOTH features are disabled
        const cloudRecordingBlocked = dispatch(maybeShowPremiumFeatureDialog(MEET_FEATURES.RECORDING));
        const localRecordingBlocked = dispatch(maybeShowPremiumFeatureDialog(MEET_FEATURES.LOCAL_RECORDING));

        if (cloudRecordingBlocked && localRecordingBlocked) {
            return;
        }

        this._onHandleClick();
    }

    /**
     * Helper function to be implemented by subclasses, which must return a
     * boolean value indicating if this button is disabled or not.
     *
     * @override
     * @protected
     * @returns {boolean}
     */
    override _isDisabled() {
        return this.props._disabled;
    }

    /**
     * Indicates whether this button is in toggled state or not.
     *
     * @override
     * @protected
     * @returns {boolean}
     */
    override _isToggled() {
        return this.props._isRecordingRunning;
    }
}

/**
 * Maps (parts of) the redux state to the associated props for the
 * {@code RecordButton} component.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {{
 *     _disabled: boolean,
 *     _isRecordingRunning: boolean,
 *     _tooltip: string,
 *     visible: boolean
 * }}
 */
export function _mapStateToProps(state: IReduxState) {
    const {
        disabled: _disabled,
        tooltip: _tooltip,
        visible
    } = getRecordButtonProps(state);

    const hasRecording = isJwtFeatureEnabled(state, MEET_FEATURES.RECORDING, false)
        || isJwtFeatureEnabled(state, MEET_FEATURES.LOCAL_RECORDING, false);
    const hasTranscription = isJwtFeatureEnabled(state, MEET_FEATURES.TRANSCRIPTION, false);

    return {
        _disabled,
        _isRecordingRunning: canStopRecording(state),
        _tooltip,
        _isTranscriptionOnly: !hasRecording && hasTranscription,
        visible
    };
}
