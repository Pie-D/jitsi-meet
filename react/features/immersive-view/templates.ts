import { touchRippleClasses } from "@mui/material";

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
        backgroundUrl: "images/template-immersive/cmc-ati2.png",
    },
    cati2: {
        id: "cati2",
        name: "CATI",
        backgroundUrl: "images/template-immersive/cmc-ati.png",
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
    // Tối ưu layout cho các số lượng slot cụ thể
    let cols: number, rows: number;
    
    if (count <= 4) {
        cols = 2;
        rows = 2;
    } else if (count <= 6) {
        cols = 3;
        rows = 2;
    } else if (count <= 8) {
        cols = 4;
        rows = 2;
    } else if (count <= 9) {
        cols = 3;
        rows = 3;
    } else if (count <= 12) {
        cols = 4;
        rows = 3;
    } else if (count <= 16) {
        cols = 4;
        rows = 4;
    } else {
        // Fallback cho số lượng lớn hơn
        cols = Math.ceil(Math.sqrt(count));
        rows = Math.ceil(count / cols);
    }

    // Kích thước slot dựa trên số lượng để cân đối
    let gap = 3; // % - khoảng cách ngang giữa các slot
    let verticalGap = 7; // % - khoảng cách dọc giữa các slot (lớn hơn để tagname hiển thị tốt)
    
    let slotWidth: number, slotHeight: number;
    
    if (count <= 4) {
        slotWidth = 26;
        slotHeight = 32; // Vuông vắn cho 4 slot
    } else if (count <= 6) {
        slotWidth = 25;
        slotHeight = 25; // Vuông vắn cho 6 slot
    } else if (count <= 8) {
        slotWidth = 18;
        slotHeight = 28;
    } else if (count <= 9) {
        slotWidth = 22;
        slotHeight = 22; // Vuông vắn cho 9 slot
    } else if (count <= 12) {
        slotWidth = 18;
        slotHeight = 18; // Vuông vắn cho 12 slot
    } else {
        slotWidth = 14;
        slotHeight = 14; // Vuông hơn cho layout 16 slot
    }

    // Tính toán kích thước tổng thể của khối slots
    const totalBlockWidth = cols * slotWidth + (cols - 1) * gap;
    const totalBlockHeight = rows * slotHeight + (rows - 1) * verticalGap;

    // Căn giữa khối slots trên màn hình với điều chỉnh tối ưu
    const blockStartX = (100 - totalBlockWidth) / 2;
    const blockStartY = (100 - totalBlockHeight) / 2 + 8; // Thụt xuống nhiều hơn để cân đối với header

    const slots: ISlot[] = [];
    for (let i = 0; i < count; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;

        // Tính vị trí slot trong khối
        const x = blockStartX + c * (slotWidth + gap);
        const y = blockStartY + r * (slotHeight + verticalGap);

        slots.push({ 
            x, 
            y, 
            w: slotWidth, 
            h: slotHeight 
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
    const constants = require("./constants") as {
        IMMERSIVE_ALLOWED_SLOT_COUNTS: readonly number[];
        DEFAULT_IMMERSIVE_SLOT_COUNT: number;
    };

    const allowed = new Set(constants.IMMERSIVE_ALLOWED_SLOT_COUNTS as number[]);
    const c = allowed.has(count) ? count : constants.DEFAULT_IMMERSIVE_SLOT_COUNT;
    return generateGridSlots(c, constants.IMMERSIVE_ALLOWED_SLOT_COUNTS as number[]);
}
