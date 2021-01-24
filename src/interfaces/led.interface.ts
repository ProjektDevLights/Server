import { Pattern } from "./patterns/pattern.type";

export default interface Leds {
  colors: string[];
  pattern: Pattern;
}