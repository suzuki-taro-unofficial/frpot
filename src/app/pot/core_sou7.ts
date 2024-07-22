import { Cell, Stream, Unit } from "sodiumjs";

type Mode = 'Boil' | 'KeepWarm' | 'Stop';

type ModeInput = {
  s_temperatureSensor: Stream<number>;
  s_voilButtonClicked: Stream<Unit>;
  s_cover: Stream<Unit>;
  s_waterOverflowSensor: Stream<boolean>;
  s_waterLevelSensor: Stream<0 | 1 | 2 | 3 | 4>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_errorTemperatureTooHigh: Stream<Unit>;
};

export const mode = (_: ModeInput): Stream<Mode> => {
  return new Stream();
}

type KeepWarm = 'High' | 'Economy' | 'Milk';

type KeepWarmInput = {
  s_warmingConfigButtonClicked: Stream<Unit>;
};

export const keep_warm = (_: KeepWarmInput): Cell<KeepWarm> => {
  return new Cell<KeepWarm>('High');
}

type TimerInput = {
  s_timerButtonClicked: Stream<Unit>;
  s_tick: Stream<Unit>; // ここのUnitは時刻を表すなにかに変更する
};

export const timer = (_: TimerInput): Stream<number> => {
  return new Stream();
}
