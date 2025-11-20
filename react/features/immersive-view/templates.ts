export interface IImmersiveTemplate {
    id: string;
    name: string;
    backgroundUrl: string;
}

export type ISlot = { x: number; y: number; w: number; h: number; highlight?: boolean };

export const IMMERSIVE_TEMPLATES: Record<string, IImmersiveTemplate> = {
    cati: {
        id: "cati",
        name: "CATI",
        backgroundUrl: "local:cmc",
    },
    cati2: {
        id: "cati2",
        name: "CATI 2",
        backgroundUrl: "local:cmc",
    },
    cati3: {
        id: "cati3",
        name: "CATI 3",
        backgroundUrl: "local:cmc",
    },
};

/**
 * Generate simple grid slots with margins for the given count.
 * Columns are inferred from the configured allowed counts to keep layouts natural
 * for both 3-based and 4-based configurations.
 */
export function generateGridSlots(count: number, allowedCounts: number[]): ISlot[] {
    if (count === 5) {
        const marginX = 0; // tối đa bề ngang
        const gap = 0; // không khoảng cách giữa các khung
        const slots: ISlot[] = [];
        const slotW = (100 - marginX * 2 - gap * 4) / 5;
        const slotH = slotW; // square inside canvas
        const y = (100 - slotH) / 2;

        for (let i = 0; i < 5; i++) {
            const x = marginX + i * (slotW + gap);
            slots.push({ x, y, w: slotW, h: slotH });
        }
        return slots;
    }
    // Arrange primarily in a horizontal row (16:9 friendly). If too many, wrap to 2 rows.
    const maxPerRow = Math.max(3, Math.ceil(Math.sqrt(count + 1))); // bias horizontal
    const cols = Math.min(count, maxPerRow);
    const rows = Math.ceil(count / cols);

    const margin = 4; // khoảng cách lề ngoài (%)
    const gap = 2; // khoảng cách giữa các ô (%)

    const usableW = 100 - margin * 2 - (cols - 1) * gap;
    const usableH = 100 - margin * 2 - (rows - 1) * gap;
    const cellW = usableW / cols;
    const cellH = usableH / rows;

    const scale = 0.9;

    const verticalOffset = 8; // % - thụt xuống toàn bộ

    const slots: ISlot[] = [];
    for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;

        // Keep slot area wide; inner content will enforce 16:9
        const w = cellW * scale - 2;
        const h = cellH * scale - 6;

        const x = margin + c * (cellW + gap) + (cellW * (1 - scale)) / 2;
        const yBase = margin + r * (cellH + gap) + (cellH * (1 - scale)) / 2;

        // Thụt toàn bộ layout xuống
        const y = yBase + verticalOffset;

        slots.push({ x, y, w, h });
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
    const constants = require("./constants") as {
        IMMERSIVE_ALLOWED_SLOT_COUNTS: readonly number[];
        DEFAULT_IMMERSIVE_SLOT_COUNT: number;
    };

    const allowed = new Set(constants.IMMERSIVE_ALLOWED_SLOT_COUNTS as number[]);
    const c = allowed.has(count) ? count : constants.DEFAULT_IMMERSIVE_SLOT_COUNT;
    return generateGridSlots(c, constants.IMMERSIVE_ALLOWED_SLOT_COUNTS as number[]);
}
