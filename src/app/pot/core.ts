import { Cell, CellLoop, Stream, Unit } from "sodiumjs";
import { WaterLevel } from "../types";
import { KeepWarmMode, Mode } from "./types";

type Input = {
  // from root
  s_tick: Stream<number>;
  // from simulator
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<WaterLevel>;
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
  // for presenter
  c_mode: Cell<any>;
  c_timer: Cell<number>;
  c_temperature: Cell<number>;
  c_waterLevel: Cell<WaterLevel>;
  c_warmLevel: Cell<number>;
};

export const core = ({}: Input): Output => {
  return {
    // for simulator
    c_heaterPower: new Cell(0),
    c_hotWaterSuply: new Cell(false),
    // for presenter
  };
};

type TargetTemperatureInput = {
  c_mode: Cell<Mode>;
  c_warmLevel: Cell<KeepWarmMode>;
};

export const target_temperature = ({
  c_mode,
  c_warmLevel,
}: TargetTemperatureInput): Cell<number> => {
  return c_mode.lift(c_warmLevel, (mode, warmLevel): number => {
    switch (mode) {
      case "Boil":
        return 100;
      case "KeepWarm":
        switch (warmLevel) {
          case "High":
            return 98;
          case "Economy":
            return 90;
          case "Milk":
            return 60;
        }
      case "Stop":
        return 0; // TODO: 適切な温度は？
    }
  });
};

type ErrorTemperatureNotIncreasedInput = {
  s_tick: Stream<number>;
  s_temperature: Stream<number>;
  c_mode: Cell<Mode>;
  c_warmLevel: Cell<KeepWarmMode>;
};

// FIXME: 壊れた実装かもしれない
export const error_temperature_not_increased = ({
  s_tick,
  s_temperature,
  c_mode,
  c_warmLevel,
}: ErrorTemperatureNotIncreasedInput): Stream<Unit> => {
  const c_prevTime = new CellLoop<number>();
  const s_oneMinutesPassed = s_tick
    .snapshot(c_prevTime, (currTime, prevTime) => {
      if (currTime - prevTime >= 60 * 1000) {
        return currTime;
      } else {
        return null;
      }
    })
    .filterNotNull() as Stream<number>;
  c_prevTime.loop(s_oneMinutesPassed.hold(Date.now()));

  const c_targetTemp = target_temperature({ c_mode, c_warmLevel });
  const c_currTemp = s_temperature.hold(0);
  const c_prevTemp = s_oneMinutesPassed
    .snapshot(c_currTemp, (_, temp) => temp)
    .hold(0);

  return s_tick
    .snapshot4(
      c_currTemp,
      c_prevTemp,
      c_targetTemp,
      (_, currTemp, prevTemp, targetTemp) => {
        return currTemp - 5 <= targetTemp && prevTemp > currTemp;
      },
    )
    .filter((cond) => {
      return cond;
    })
    .mapTo(new Unit());
};

type ErrorTemperatureTooHighInput = {
  s_temperature: Stream<number>;
};

export const error_temperature_too_hight = ({
  s_temperature,
}: ErrorTemperatureTooHighInput): Stream<Unit> => {
  return s_temperature
    .filter((temp) => {
      return temp > 110;
    })
    .map((_) => {
      return new Unit();
    });
};

type ModeInput = {
  s_temperatureSensor: Stream<number>;
  s_voilButtonClicked: Stream<Unit>;
  s_cover: Stream<Unit>;
  s_waterOverflowSensor: Stream<boolean>;
  s_waterLevelSensor: Stream<WaterLevel>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_errorTemperatureTooHigh: Stream<Unit>;
};

export const mode = (_: ModeInput): Stream<Mode> => {
  return new Stream();
};

type KeepWarmModeInput = {
  s_warmingConfigButtonClicked: Stream<Unit>;
};

export const keep_warm_mode = (
  input: KeepWarmModeInput,
): Cell<KeepWarmMode> => {
  const warm_level = new CellLoop<KeepWarmMode>();
  const new_phase = input.s_warmingConfigButtonClicked.snapshot<
    KeepWarmMode,
    KeepWarmMode
  >(warm_level, (_, prev) => {
    switch (prev) {
      case "High":
        return "Economy";
      case "Economy":
        return "Milk";
      case "Milk":
        return "High";
    }
  });
  warm_level.loop(new_phase.hold("High"));
  return warm_level;
};

type TimerInput = {
  s_timerButtonClicked: Stream<Unit>;
  s_tick: Stream<Unit>; // ここのUnitは時刻を表すなにかに変更する
};

export const timer = (_: TimerInput): Stream<number> => {
  return new Stream();
};

//ボタンのクリックのストリームを一つにまとめる
type buttonClickedInput = {
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

export const s_buttonClicked = (_: buttonClickedInput): Stream<Unit> => {
  return new Stream();
};

//ビープストリーム

//beepの実装は検討中
type beepType = longBeep | shortBeep;

type longBeep = {
  kind: "Long";
};

type shortBeep = {
  kind: "Short";
  count: number;
};

type beepInput = {
  s_error_temperature_too_hight: Stream<boolean>;
  s_error_temperature_not_increased: Stream<boolean>;
  s_timer: Stream<Unit>;
  s_mode: Stream<Mode>;
  s_bottunClicked: Stream<Unit>;
  s_tick: Stream<Unit>;
};

export const s_beep = (_: beepInput): Stream<beepType> => {
  return new Stream<beepType>();
};

//ロック状態かどうかを保持するセル
//const c_lockState = new CellLoop<boolean>();
//c_lockState.loop(
//  s_lockButtonClicked.snapshot(
//  ).hold(true),
//);

//給湯のON/OFFを決める
type hotWaterSupplyInput = {
  s_tick: Stream<Unit>;
  c_lockState: Cell<boolean>;
  c_hotWaterSupplyButtonPushing: Cell<boolean>;
};

export const hotWaterSupply = (_: hotWaterSupplyInput): Cell<boolean> => {
  return new Cell(false);
};

//熱量ストリーム
type heaterPowerInput = {
  s_waterLevelSensor: Stream<WaterLevel>;
  tareget_Temperature: Cell<number>;
};

export const heaterPower = (_: heaterPowerInput): Cell<number> => {
  return new Cell(100);
};
