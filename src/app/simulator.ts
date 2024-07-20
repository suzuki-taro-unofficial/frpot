import { Cell, Stream, Unit } from "sodiumjs";

type Input = {
  c_waterIn: Cell<number>;
  s_tick: Stream<Unit>;
  c_heaterPower: Cell<number>;
  c_hotWaterSupply: Cell<boolean>;
};

type WaterLevel = 0 | 1 | 2 | 3 | 4;

type Output = {
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<WaterLevel>;
  s_waterOverflowSensor: Stream<boolean>;
};

export const simulator = ({
  c_waterIn: _c_waterIn,
  s_tick: _s_tick,
  c_heaterPower: _c_heaterValue,
  c_hotWaterSupply: _c_hotWaterSupply,
}: Input): Output => {
  return {
    s_temperatureSensor: new Stream(),
    s_waterLevelSensor: new Stream(),
    s_waterOverflowSensor: new Stream(),
  };
};
