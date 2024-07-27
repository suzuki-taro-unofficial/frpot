import { Cell } from "sodiumjs";

type Input = {
  // TODO: 型を決める
  c_mode: Cell<any>;
  c_warmLevel: Cell<any>;
  c_temperature: Cell<number>;
  c_waterLevel: Cell<0 | 1 | 2 | 3 | 4>;
};

type Output = {
  c_isLitVoilingModeLamp: Cell<boolean>;
  c_isLitWarmingModeLamp: Cell<boolean>;
  c_isLitWarmHighLamp: Cell<boolean>;
  c_isLitWarmSavingsLamp: Cell<boolean>;
  c_isLitWarmMilkLamp: Cell<boolean>;
  c_temperatureLCD: Cell<string>;
  c_waterLevelMeter: Cell<0 | 1 | 2 | 3 | 4>;
  c_timerLCD: Cell<string>;
};

export const presenter = ({
  c_mode,
  c_warmLevel,
  c_temperature,
  c_waterLevel,
}: Input): Output => {
  return {
    c_isLitVoilingModeLamp: c_mode.map((mode) => mode === "VOILING"),
    c_isLitWarmingModeLamp: c_mode.map((mode) => mode === "WARMING"),
    c_isLitWarmHighLamp: c_warmLevel.map((level) => level === "HIGH"),
    c_isLitWarmSavingsLamp: c_warmLevel.map((level) => level === "SAVING"),
    c_isLitWarmMilkLamp: c_warmLevel.map((level) => level === "MILK"),
    c_waterLevelMeter: c_warmLevel,
  };
};
