import { Cell, Stream, Unit } from "sodiumjs";

type Input = {
  // from root
  s_tick: Stream<Unit>;
  // from simulator
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<0 | 1 | 2 | 3 | 4>;
  s_overflowSensor: Stream<boolean>;
  // from ui
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_cover: Stream<Unit>;
};

type Output = {
  // for simulator
  c_heaterPower: Cell<number>;
  c_hotWaterSuply: Cell<boolean>;
  // for presenter
};

export const core = ({}: Input): Output => {
  return {
    // for simulator
    c_heaterPower: new Cell(0),
    c_hotWaterSuply: new Cell(false),
    // for presenter
  };
};
