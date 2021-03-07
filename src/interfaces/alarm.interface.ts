import PartialLight from "./light.partial.interface";

export interface Alarm{
    id: string,
    color: string,
    date: string,
    days: number[],
    repeat: number,
    lights: PartialLight[], // ids
}