import { Cell, CellLoop, Stream, Transaction, Unit } from "sodiumjs";
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
  c_keepWarmMode: Cell<KeepWarmMode>;
};

export const core = ({}: Input): Output => {
  return {
    // for simulator
    c_heaterPower: new Cell(0),
    c_hotWaterSuply: new Cell(false),
    // for presenter
    c_mode: new Cell<Mode>("Stop"),
    c_keepWarmMode: new Cell<KeepWarmMode>("High"),
    c_temperature: new Cell(0),
    c_waterLevel: new Cell<WaterLevel>(0),
    c_timer: new Cell(0),
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
  return Transaction.run(() => {
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
  });
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
  s_tick: Stream<number>;
};

type TimerOutput = {
  c_remainigTime: Cell<number>; // 単位は分
  s_beep: Stream<Unit>;
};

export const timer = (inputs: TimerInput): TimerOutput => {
  return Transaction.run(() => {
    const c_previousTime = inputs.s_tick.hold(0);
    // 経過時間はマイナスの値を持つ
    const s_erapsed = inputs.s_tick.snapshot<number, number>(
      c_previousTime,
      (newTime, prevTime) => prevTime - newTime,
    );
    const s_add = inputs.s_timerButtonClicked.mapTo(60 * 1000);
    const c_remainigTime = new CellLoop<number>();
    const s_newTime = s_erapsed
      .merge(s_add, (a, b) => a + b)
      .snapshot(c_remainigTime, (delta, remaining) => {
        return Math.max(0, remaining - delta);
      });
    c_remainigTime.loop(s_newTime.hold(0));
    const s_beep = s_newTime
      .filter((time) => time === 0) // 残り時間が0かつ
      .snapshot(c_remainigTime, (_, time) => time)
      .filter((time) => time > 0) // 一つ前の論理的時刻の残り時間が0でない時
      .mapTo(new Unit());
    return {
      c_remainigTime: c_remainigTime.map((time) => time / 1000 / 60),
      s_beep: s_beep,
    };
  });
};

//ボタンのクリックのストリームを一つにまとめる
type buttonClickedInput = {
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

export const buttonClicked = ({
  s_voilButtonClicked,
  s_timerButtonClicked,
  s_warmingConfigButtonClicked,
  s_lockButtonClicked,
  s_hotWaterSupplyButtonClicked,
}: buttonClickedInput): Stream<Unit> => {
  return s_voilButtonClicked
    .mapTo(new Unit())
    .orElse(s_timerButtonClicked.mapTo(new Unit()))
    .orElse(s_warmingConfigButtonClicked.mapTo(new Unit()))
    .orElse(s_lockButtonClicked.mapTo(new Unit()))
    .orElse(s_hotWaterSupplyButtonClicked.mapTo(new Unit()));
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
  s_errorTemperatureTooHight: Stream<Unit>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_timer: Stream<Unit>;
  s_mode: Stream<Mode>;
  s_bottunClicked: Stream<Unit>;
  s_tick: Stream<Unit>;
};

export const s_beep = (_: beepInput): Stream<beepType> => {
  return new Stream<beepType>();
};

//ロック状態かどうかを保持するセル
//trueの時ロック状態
type lockStateInput = {
  s_lockButtonClicked: Stream<Unit>;
};

export const lockState = (s_lockButtonClicked): Cell<boolean> => {
  return Transaction.run(() => {
    const c_lockState = new CellLoop<boolean>();
    c_lockButtonClicked
      .snapshot(c_lockState, (_, lockState) => {
        return !lockState;
      })
      .hold(true);
  });
};

//給湯のON/OFFを決める
type hotWaterSupplyInput = {
  s_tick: Stream<number>;
  c_lockState: Cell<boolean>;
  c_hotWaterSupplyButtonPushing: Cell<boolean>;
};

export const hotWaterSupply = ({
  s_tick,
  c_lockState,
  c_hotWaterSupplyButtonPushing,
}): Cell<boolean> => {
  return s_tick.snapshot3(
    c_lockState,
    c_hotWaterSupplyButtonPushing,
    (_, lockState, hotWaterSupplyButtonPushing) => {
      return lockState && hotWaterSupplyButtonPushing;
    },
  );
};

//熱量ストリーム
type heaterPowerInput = {
  s_waterLevelSensor: Stream<WaterLevel>;
  c_taregetTemperature: Cell<number>;
};

export const heaterPower = (_: heaterPowerInput): Cell<number> => {
  return new Cell(100);
};
