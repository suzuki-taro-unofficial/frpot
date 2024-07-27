import { Cell } from "sodiumjs";
import { WaterLevel } from "@/app/types";
import { KeepWarmMode, Mode } from "./types";

type Input = {
  c_mode: Cell<Mode>;
  c_keepWarmMode: Cell<KeepWarmMode>;
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
  c_keepWarmMode,
  c_temperature,
  c_waterLevel,
  c_timer,
}: Input): Output => {
  return {
    c_isLitVoilingModeLamp: c_mode.map((mode) => mode === "Boil"),
    c_isLitWarmingModeLamp: c_mode.map((mode) => mode === "KeepWarm"),
    c_isLitWarmHighLamp: c_keepWarmMode.map((level) => level === "High"),
    c_isLitWarmSavingsLamp: c_keepWarmMode.map((level) => level === "Economy"),
    c_isLitWarmMilkLamp: c_keepWarmMode.map((level) => level === "Milk"),
    c_temperatureLCD: c_temperature.map((temp) => temp.toString()),
    c_timerLCD: c_timer.map((t) => t.toString()),
    c_waterLevelMeter: c_waterLevel,
  };
};
