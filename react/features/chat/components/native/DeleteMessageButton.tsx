import { connect } from 'react-redux';

import { translate } from '../../../base/i18n/functions';
import { IconTrash } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { deleteMessage } from '../../actions.any';

export interface IProps extends AbstractButtonProps {

    /**
     * The ID of the message to delete.
     */
    messageID: string;
}

/**
 * Class to render a button that deletes a message.
 */
class DeleteMessageButton extends AbstractButton<IProps, any> {
    override accessibilityLabel = 'chat.delete';
    override icon = IconTrash;
    override label = 'chat.delete';

    /**
     * Handles clicking / pressing the button.
     *
     * @private
     * @returns {void}
     */
    override _handleClick() {
        this.props.dispatch(deleteMessage(this.props.messageID));
    }
}

export default translate(connect()(DeleteMessageButton));
