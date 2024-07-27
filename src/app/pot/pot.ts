import { core } from "@/app/pot/core";
import { Cell, Stream, Unit } from "sodiumjs";
import { presenter } from "./presenter";

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
};

export const pot = (input: Input): Output => {
  const core_out = core(input);
  const presenter_out = presenter(core_out);

  return {
    ...core_out,
    ...presenter_out,
  };
};
