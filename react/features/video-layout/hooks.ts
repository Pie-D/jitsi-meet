import { useSelector } from 'react-redux';

import { IReduxState } from '../app/types';
import { TILE_VIEW_ENABLED } from '../base/flags/constants';
import { getFeatureFlag } from '../base/flags/functions';

import TileViewSettingsButton from '../toolbox/components/web/TileViewSettingsButton';
import MobileViewToggleButton from '../toolbox/components/web/MobileViewToggleButton';

const tileview = {
    key: 'tileview',
    Content: TileViewSettingsButton,
    group: 2
};

const mobileTileview = {
    key: 'tileview',
    Content: MobileViewToggleButton,
    group: 2
};

/**
 * A hook that returns the tile view button if it is enabled and undefined otherwise.
 *
 *  @returns {Object | undefined}
 */
export function useTileViewButton() {
    const tileViewEnabled = useSelector((state: IReduxState) => getFeatureFlag(state, TILE_VIEW_ENABLED, true));
    const isNarrowLayout = useSelector((state: IReduxState) => state['features/base/responsive-ui'].isNarrowLayout);

    if (tileViewEnabled) {
        // On narrow/mobile layout, use MobileViewToggleButton for direct toggle
        // On desktop layout, use TileViewSettingsButton for popup menu
        return isNarrowLayout ? mobileTileview : tileview;
    }
}
