import { Time } from "@/util/time";
import { Cell, Stream, Unit } from "sodiumjs";

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
  const s_oneMinutesPassed = Time.ms_passed(Time.minute_to_ms(1), s_tick);

  const c_currTemp = s_temperature.hold(0);
  const c_prevTemp = s_oneMinutesPassed.snapshot1(c_currTemp).hold(0);

  const c_isTemperatureNotIncreased = c_currTemp.lift3(
    c_prevTemp,
    c_targetTemp,
    (currTemp, prevTemp, targetTemp) => {
      return currTemp + 5 <= targetTemp && prevTemp > currTemp;
    },
  );

  return s_oneMinutesPassed.gate(c_isTemperatureNotIncreased);
};

type ErrorTemperatureTooHighInput = {
  s_temperature: Stream<number>;
};

export const error_temperature_too_hight = ({
  s_temperature,
}: ErrorTemperatureTooHighInput): Stream<Unit> => {
  return s_temperature.filter((temp) => temp > 110).mapTo(Unit.UNIT);
};
