import Leds from "./led.interface";

export default interface Light {
  name: string;
  id: string;
  leds: Leds;
  count: number;
  brightness: number;
  tags?: string[];
  isOn: boolean;
}
