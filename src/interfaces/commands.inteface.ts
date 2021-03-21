export const COMMANDS = ["leds", "fade", "blink", "brightness", "count", "reset", "restart", "on", "off",] as const;
export type Commands = (typeof COMMANDS)[number]
