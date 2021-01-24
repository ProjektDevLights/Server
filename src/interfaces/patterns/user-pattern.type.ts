export const USER_PATTERNS = ["plain", "gradient"] as const;
export type UserPattern = (typeof USER_PATTERNS)[number]