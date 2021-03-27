export type Time = string;
export interface EspCommand {
    command: string,
    data?: {
        [key: string]: any,
    } | any
} 