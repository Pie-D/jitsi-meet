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
        backgroundUrl: "images/template-immersive/cmc-ati.png",
    },
    cati2: {
        id: "cati2",
        name: "CATI 2",
        backgroundUrl: "images/template-immersive/cmc-ati2.png",
    },
    cati3: {
        id: "cati3",
        name: "CATI 3",
        backgroundUrl: "images/template-immersive/cmc-ati3.png",
    },
};

/**
 * Generate simple grid slots with margins for the given count.
 * Columns are inferred from the configured allowed counts to keep layouts natural
 * for both 3-based and 4-based configurations.
 */
export function generateGridSlots(count: number, allowedCounts: number[]): ISlot[] {
    const cols = Math.ceil(Math.sqrt(count));
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

        const w = cellW * scale - 5;
        const h = cellH * scale - 5;

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