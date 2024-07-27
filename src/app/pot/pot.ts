import { core } from "@/app/pot/core";
import { Cell, Stream, Unit } from "sodiumjs";
import { presenter } from "./presenter";
import { WaterLevel } from "../types";

type Input = {
  // from root
  s_tick: Stream<number>;
  // from simulator
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<0 | 1 | 2 | 3 | 4>;
  s_waterOverflowSensor: Stream<boolean>;
  // from ui
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_cover: Stream<Unit>;
  c_hotWarterSupplyButtonPushing: Cell<boolean>;
};

type Output = {
  // for simulator
  c_heaterPower: Cell<number>;
  c_hotWaterSuply: Cell<boolean>;
  // for ui
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

export const pot = (input: Input): Output => {
  const core_out = core(input);
  const presenter_out = presenter(core_out);

  return {
    ...core_out,
    ...presenter_out,
  };
};
