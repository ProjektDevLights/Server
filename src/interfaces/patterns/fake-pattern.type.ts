export const FAKE_PATTERNS = ["waking", "blinking", "custom"] as const;
export type FakePattern = typeof FAKE_PATTERNS[number];
