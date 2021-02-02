export const USER_PATTERNS = ["plain", "gradient", "fading", "rainbow", "runner"] as const;
export type UserPattern = (typeof USER_PATTERNS)[number]
