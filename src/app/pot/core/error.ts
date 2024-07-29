import { Cell, CellLoop, Stream, Unit } from "sodiumjs";

type ErrorTemperatureNotIncreasedInput = {
  s_tick: Stream<number>;
  s_temperature: Stream<number>;
  c_targetTemp: Cell<number>;
};

// FIXME: 壊れた実装かもしれない
export const error_temperature_not_increased = ({
  s_tick,
  s_temperature,
  c_targetTemp,
}: ErrorTemperatureNotIncreasedInput): Stream<Unit> => {
  const cloop_currAccTime = new CellLoop<number>();
  const s_timeManage = s_tick.snapshot(
    cloop_currAccTime,
    (deltaTime, currAccTime) => {
      if (deltaTime + currAccTime >= 60 * 1000) {
        return { cond: true, next_time: 0 };
      } else {
        return { cond: false, next_time: deltaTime + currAccTime };
      }
    },
  );
  const s_oneMinutesPassed = s_timeManage.filter(({ cond }) => cond);
  cloop_currAccTime.loop(
    s_timeManage.map(({ next_time }) => next_time).hold(0),
  );

  const c_currTemp = s_temperature.hold(0);
  const c_prevTemp = s_oneMinutesPassed.snapshot1(c_currTemp).hold(0);

  const c_isTemperatureNotIncreased = c_currTemp.lift3(
    c_prevTemp,
    c_targetTemp,
    (currTemp, prevTemp, targetTemp) => {
      return currTemp - 5 <= targetTemp && prevTemp > currTemp;
    },
  );

  return s_oneMinutesPassed.gate(c_isTemperatureNotIncreased).mapTo(Unit.UNIT);
};

type ErrorTemperatureTooHighInput = {
  s_temperature: Stream<number>;
};

export const error_temperature_too_hight = ({
  s_temperature,
}: ErrorTemperatureTooHighInput): Stream<Unit> => {
  return s_temperature.filter((temp) => temp > 110).mapTo(Unit.UNIT);
};
