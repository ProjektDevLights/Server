export const FAKE_PATTERNS = ["waking", "blinking"] as const;
export type FakePattern = (typeof FAKE_PATTERNS)[number]
