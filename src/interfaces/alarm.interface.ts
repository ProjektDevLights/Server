import PartialLight from "./light.partial.interface";

export interface Alarm {
  name?: string;
  isOn: boolean;
  id: string;
  color: string;
  time: string;
  days: number[];
  lights: PartialLight[];
}
