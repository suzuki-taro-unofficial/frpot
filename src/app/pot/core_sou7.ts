import { Cell, CellLoop, Stream, Unit } from "sodiumjs";

// Modeは一般的すぎるので、なんか具体的な名前に変えたいが思いつかない
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

type KeepWarmMode = 'High' | 'Economy' | 'Milk';

type KeepWarmInput = {
  s_warmingConfigButtonClicked: Stream<Unit>;
};

export const keep_warm = (input: KeepWarmInput): Cell<KeepWarmMode> => {
  const warm_level = new CellLoop<KeepWarmMode>();
  const new_phase = input.s_warmingConfigButtonClicked.snapshot<KeepWarmMode, KeepWarmMode>(warm_level, (_, prev) => {
    switch (prev) {
      case 'High':
        return 'Economy';
      case 'Economy':
        return 'Milk';
      case 'Milk':
        return 'High';
    }
  }
  );
  warm_level.loop(new_phase.hold('High'));
  return warm_level;
}

type TimerInput = {
  s_timerButtonClicked: Stream<Unit>;
  s_tick: Stream<Unit>; // ここのUnitは時刻を表すなにかに変更する
};

export const timer = (_: TimerInput): Stream<number> => {
  return new Stream();
}
