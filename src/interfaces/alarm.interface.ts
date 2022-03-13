import Leds from "src/interfaces/led.interface";
import CustomData from "./custom-data.interface";
import PartialLight from "./light.partial.interface";

export interface Alarm {
  name?: string;
  isOn: boolean;
  id: string;
  leds: Leds;
  custom_sequence: CustomData[],
  time: string;
  days: number[];
  lights: PartialLight[];
}
