import { Cell } from "sodiumjs";
import { WaterLevel } from "@/app/types";
import { KeepWarmMode, Status } from "./types";

type Input = {
  c_status: Cell<Status>;
  c_keepWarmMode: Cell<KeepWarmMode>;
  c_temperature: Cell<number>;
  c_waterLevel: Cell<WaterLevel>;
  c_timer: Cell<number>;
  c_lock: Cell<boolean>;
};

type Output = {
  c_isLitBoilingLamp: Cell<boolean>;
  c_isLitWarmingLamp: Cell<boolean>;
  c_isLitWarmHighLamp: Cell<boolean>;
  c_isLitWarmEconomyLamp: Cell<boolean>;
  c_isLitWarmMilkLamp: Cell<boolean>;
  c_temperatureLCD: Cell<string>;
  c_waterLevelMeter: Cell<WaterLevel>;
  c_timerLCD: Cell<string>;
  c_isLitLockLamp: Cell<boolean>;
};

export const presenter = ({
  c_status,
  c_keepWarmMode,
  c_temperature,
  c_waterLevel,
  c_timer,
  c_lock,
}: Input): Output => {
  return {
    c_isLitBoilingLamp: c_status.map((s) => s === "Boil"),
    c_isLitWarmingLamp: c_status.map((s) => s === "KeepWarm"),
    c_isLitWarmHighLamp: c_keepWarmMode.map((level) => level === "High"),
    c_isLitWarmEconomyLamp: c_keepWarmMode.map((level) => level === "Economy"),
    c_isLitWarmMilkLamp: c_keepWarmMode.map((level) => level === "Milk"),
    c_temperatureLCD: c_temperature.map((temp) => Math.floor(temp).toString()),
    c_timerLCD: c_timer.map((t) => t.toString()),
    c_waterLevelMeter: c_waterLevel,
    c_isLitLockLamp: c_lock,
  };
};
