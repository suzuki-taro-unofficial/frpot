import { Cell } from "sodiumjs";
import { WaterLevel } from "@/app/types";

type Input = {
  // TODO: 型を決める
  c_mode: Cell<any>;
  c_warmLevel: Cell<any>;
  c_temperature: Cell<number>;
  c_waterLevel: Cell<WaterLevel>;
  c_timer: Cell<number>;
};

type Output = {
  c_isLitVoilingModeLamp: Cell<boolean>;
  c_isLitWarmingModeLamp: Cell<boolean>;
  c_isLitWarmHighLamp: Cell<boolean>;
  c_isLitWarmSavingsLamp: Cell<boolean>;
  c_isLitWarmMilkLamp: Cell<boolean>;
  c_temperatureLCD: Cell<string>;
  c_waterLevelMeter: Cell<WaterLevel>;
  c_timerLCD: Cell<string>;
};

export const presenter = ({
  c_mode,
  c_warmLevel,
  c_temperature,
  c_waterLevel,
  c_timer,
}: Input): Output => {
  return {
    c_isLitVoilingModeLamp: c_mode.map((mode) => mode === "VOILING"),
    c_isLitWarmingModeLamp: c_mode.map((mode) => mode === "WARMING"),
    c_isLitWarmHighLamp: c_warmLevel.map((level) => level === "HIGH"),
    c_isLitWarmSavingsLamp: c_warmLevel.map((level) => level === "SAVING"),
    c_isLitWarmMilkLamp: c_warmLevel.map((level) => level === "MILK"),
    c_temperatureLCD: c_temperature.map((temp) => temp.toString()),
    c_timerLCD: c_timer.map((t) => t.toString()),
    c_waterLevelMeter: c_waterLevel,
  };
};
