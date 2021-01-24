import { FakePattern, FAKE_PATTERNS } from "./fake-pattern.type";
import { UserPattern, USER_PATTERNS } from "./user-pattern.type";
export const PATTERNS = [...FAKE_PATTERNS, ...USER_PATTERNS]
export type Pattern = FakePattern | UserPattern;
//export type Pattern = FakePattern | UserPattern;
