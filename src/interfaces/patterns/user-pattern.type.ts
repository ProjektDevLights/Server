export const USER_PATTERNS = ["plain", "gradient", "fading"] as const;
export type UserPattern = (typeof USER_PATTERNS)[number]
