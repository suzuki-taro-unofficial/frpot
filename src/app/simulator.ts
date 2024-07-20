import { Cell, Stream, Unit } from "sodiumjs";

type Input = {
  c_waterIn: Cell<number>;
  s_tick: Stream<Unit>;
  c_heaterValue: Cell<number>;
  c_hotWaterSupply: Cell<number>;
};

type Output = {
  s_temperatureSensorValue: Stream<number>;
  s_waterLevelSensorValue: Stream<number>;
};

export const simulator = ({
  c_waterIn: _c_waterIn,
  s_tick: _s_tick,
  c_heaterValue: _c_heaterValue,
  c_hotWaterSupply: _c_hotWaterSupply,
}: Input): Output => {
  return {
    s_temperatureSensorValue: new Stream(),
    s_waterLevelSensorValue: new Stream(),
  };
};
