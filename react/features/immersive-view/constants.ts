export const IMMERSIVE_ALLOWED_SLOT_COUNTS = [ 4, 8, 12, 16 ] as const;

export type ImmersiveSlotCount = typeof IMMERSIVE_ALLOWED_SLOT_COUNTS[number];

export const DEFAULT_IMMERSIVE_SLOT_COUNT: ImmersiveSlotCount = IMMERSIVE_ALLOWED_SLOT_COUNTS[0];


