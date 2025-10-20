export interface IImmersiveTemplate {
    id: string;
    name: string;
    backgroundUrl: string;
}

export type ISlot = { x: number; y: number; w: number; h: number; highlight?: boolean; };

export const IMMERSIVE_TEMPLATES: Record<string, IImmersiveTemplate> = {
    cati: {
        id: 'cati',
        name: 'CATI',
        backgroundUrl: 'images/template-immersive/cmc-ati.png'
    },
    cati2: {
        id: 'cati2',
        name: 'CATI 2',
        backgroundUrl: 'images/template-immersive/cmc-ati2.png'
    },
    cati3: {
        id: 'cati3',
        name: 'CATI 3',
        backgroundUrl: 'images/template-immersive/cmc-ati3.png'
    }
};

/**
 * Generate simple grid slots with margins for the given count.
 * Columns are inferred from the configured allowed counts to keep layouts natural
 * for both 3-based and 4-based configurations.
 */
export function generateGridSlots(count: number, allowedCounts: number[]): ISlot[] {
    const minAllowed = Math.min(...allowedCounts);

    let cols: number;
    if (minAllowed === 3) {
        // 3,6,9,12,15 → 3 columns
        cols = count <= 3 ? count : 3;
    } else if (minAllowed === 4) {
        // 4,8,12,16 → 2x2 for 4, then 4 columns afterwards
        cols = count <= 4 ? Math.min(2, count) : 4;
    } else {
        // Fallback: choose a near-square layout
        const nearSqrt = Math.max(2, Math.min(count, Math.round(Math.sqrt(count))));
        cols = nearSqrt;
    }

    const rows = Math.ceil(count / Math.max(cols, 1));
    const margin = 5; // percent
    const usableW = 100 - margin * 2;
    const usableH = 100 - margin * 2;
    const cellW = usableW / Math.max(cols, 1);
    const cellH = usableH / Math.max(rows, 1);
    const pad = 5; // inner cell padding percent of cell size

    const slots: ISlot[] = [];
    for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const isLastRow = r === rows - 1;
        const itemsInLastRow = count - (rows - 1) * cols;
        const itemsInRow = isLastRow ? itemsInLastRow : cols;
        const xOffset = isLastRow && itemsInRow < cols
            ? ((cols - itemsInRow) * cellW) / 2
            : 0;

        slots.push({
            x: margin + xOffset + c * cellW + (pad / 100) * cellW,
            y: margin + r * cellH + (pad / 100) * cellH,
            w: cellW * (1 - 2 * pad / 100),
            h: cellH * (1 - 2 * pad / 100)
        });
    }

    return slots;
}

export function getTemplateSlots(templateId: string | undefined, count: number): ISlot[] {
    if (!templateId) {
        return [];
    }
    // Defer to constants for allowed counts and default
    // Imported lazily to avoid potential circular dependencies elsewhere.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const constants = require('./constants') as {
        IMMERSIVE_ALLOWED_SLOT_COUNTS: readonly number[];
        DEFAULT_IMMERSIVE_SLOT_COUNT: number;
    };

    const allowed = new Set(constants.IMMERSIVE_ALLOWED_SLOT_COUNTS as number[]);
    const c = allowed.has(count) ? count : constants.DEFAULT_IMMERSIVE_SLOT_COUNT;
    return generateGridSlots(c, constants.IMMERSIVE_ALLOWED_SLOT_COUNTS as number[]);
}


