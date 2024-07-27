import { Cell, CellLoop, Stream, Transaction, Unit } from "sodiumjs";
import { LidState, WaterLevel } from "../types";
import { KeepWarmMode, Status } from "./types";

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
  s_lid: Stream<LidState>;
  c_hotWarterSupplyButtonPushing: Cell<boolean>;
};

type Output = {
  // for simulator
  c_heaterPower: Cell<number>;
  c_hotWaterSuply: Cell<boolean>;
  // for presenter
  c_status: Cell<Status>;
  c_timer: Cell<number>;
  c_temperature: Cell<number>;
  c_waterLevel: Cell<WaterLevel>;
  c_keepWarmMode: Cell<KeepWarmMode>;
  c_lock: Cell<boolean>;
};

export const core = ({}: Input): Output => {
  return {
    // for simulator
    c_heaterPower: new Cell(0),
    c_hotWaterSuply: new Cell(false),
    // for presenter
    c_status: new Cell<Status>("Stop"),
    c_keepWarmMode: new Cell<KeepWarmMode>("High"),
    c_temperature: new Cell(0),
    c_waterLevel: new Cell<WaterLevel>(0),
    c_timer: new Cell(0),
    c_lock: new Cell(true),
  };
};

type TargetTemperatureInput = {
  c_status: Cell<Status>;
  c_warmLevel: Cell<KeepWarmMode>;
};

export const target_temperature = ({
  c_status,
  c_warmLevel,
}: TargetTemperatureInput): Cell<number> => {
  return c_status.lift(c_warmLevel, (status, warmLevel): number => {
    switch (status) {
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
  c_status: Cell<Status>;
  c_warmLevel: Cell<KeepWarmMode>;
};

// FIXME: 壊れた実装かもしれない
export const error_temperature_not_increased = ({
  s_tick,
  s_temperature,
  c_status,
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

    const c_targetTemp = target_temperature({ c_status, c_warmLevel });
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

type StatusInput = {
  s_temperatureSensor: Stream<number>;
  s_boilButtonClicked: Stream<Unit>;
  s_lid: Stream<LidState>;
  s_waterOverflowSensor: Stream<boolean>;
  s_waterLevelSensor: Stream<WaterLevel>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_errorTemperatureTooHigh: Stream<Unit>;
  s_tick: Stream<number>;
};

/*
# statusについて

## 仕様
- 沸騰ボタンを押したとき、温度制御可能な水位ならば沸騰状態になる
- ふたが閉じられたとき、温度制御可能な水位ならば沸騰状態になる
- 沸騰状態で100度に達してから3分間経ったら、保温状態に入る
  - => 目標温度は98度なので、単に100度以上の状態が3分間続くという条件では上手く行かない
- 高温エラー・温度上がらずエラーが出たたときには、停止状態になる
- フタが開いたとき、停止状態になる
- 満水センサがONのとき、停止状態になる

## 停止状態からの復旧について
- 高温エラーのとき
  - => 低温になれば良いので、s_temperatureSensorが一定値以下になったら復旧
- 温度上がらずエラーのとき
  - => 復旧しない
- フタが開いたとき
  - => フタが閉まれば復旧。同時に沸騰状態へ移行
- 満水センサがONのとき
  - => 満水センサがOFFになれば復旧。停止状態のままだけだけど、他のイベントによって沸騰状態に移行する
- 水位が0のとき
  - => 水位が1以上に慣れば復旧。停止状態のままだけど、他のイベントによって沸騰状態に移行する

## 沸騰状態・保温状態について
- 沸騰ボタンを押したとき、または、ふたが閉じられたとき、障害状態でなければ沸騰状態になる
- 沸騰状態で100度に達してから3分間経ったら、保温状態に入る
- 障害状態がtrueのとき、必ず停止状態になる
*/

// statusの各種停止状態について、それぞれの停止状態の条件が復旧されたかどうかを監視する
// 障害状態と名付ける
const failure_status = (inputs: StatusInput): Cell<boolean> => {
  const c_highTemperatureError = new CellLoop<boolean>();
  c_highTemperatureError.loop(
    inputs
      .s_errorTemperatureTooHigh
      .mapTo(true)
      .orElse(inputs.s_temperatureSensor.filter((temp) => temp <= 90).mapTo(false))
      .hold(false)
  );
  const c_temperatureNotIncreasedError = inputs.s_errorTemperatureNotIncreased.mapTo(true).hold(false);
  const c_lidOpened = inputs.s_lid.map((lid) => lid === "Open").hold(true);
  const c_waterOverflow = inputs.s_waterOverflowSensor.hold(false);
  const c_waterLevelIsLow = inputs.s_waterLevelSensor.hold(0).map((level) => level === 0);
  return c_highTemperatureError.lift5(c_temperatureNotIncreasedError, c_lidOpened, c_waterOverflow, c_waterLevelIsLow, (highTemp, notIncreased, lid, overflow, low) => {
    return highTemp || notIncreased || lid || overflow || low;
  });
}

// 保温状態に入るタイミングを監視する
const keep_worm_status = (inputs: StatusInput): Stream<Unit> => {
  const c_temperature = inputs.s_temperatureSensor.hold(0);
  // 100度に達した時刻を持つセル。かつ、c_100degreeTimeが3分以内の場合は更新しない
  const c_100degreeTime = new CellLoop<number>();
  c_100degreeTime.loop(inputs
    .s_tick
    .snapshot(c_temperature, (time, temp) => {return {time: time, temp: temp}})
    .filter(({time, temp}) => temp >= 100 && time - c_100degreeTime.sample() >= 3 * 60 * 1000)
    .map(({time}) => time)
    .hold(0)
  )
  const s_3minutesPassed = inputs
    .s_tick
    .snapshot(c_100degreeTime, (time, degreeTime) => time - degreeTime)
    .filter((time) => time >= 3 * 60 * 1000);
  return s_3minutesPassed.mapTo(new Unit());
}

export const status = (inputs: StatusInput): Cell<Status> => {
  const c_failure = failure_status(inputs);
  const s_keepWarm = keep_worm_status(inputs);
  const c_status = new CellLoop<Status>();
  c_status.loop(
    inputs
      .s_boilButtonClicked
      .mapTo<Status>("Boil")
      .orElse(inputs.s_lid.filter((lid) => lid === "Close").mapTo<Status>("Boil"))
      .orElse(s_keepWarm.mapTo<Status>("KeepWarm"))
      .snapshot<boolean, Status>(c_failure, (newStatus, failure) => {
        return failure ? "Stop" : newStatus;
      })
      .hold("Stop")
    );
  return c_status;
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
  s_errorTemperatureTooHigh: Stream<Unit>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_timer: Stream<Unit>;
  s_buttonClicked: Stream<Unit>;
  s_boiled: Stream<Unit>;
};

export const s_beep = ({
  s_errorTemperatureTooHigh,
  s_errorTemperatureNotIncreased,
  s_timer,
  s_buttonClicked,
  s_boiled,
}: beepInput): Stream<beepType> => {
  return s_errorTemperatureNotIncreased.mapTo<beepType>({kind: "Long"})
    .orElse(s_errorTemperatureTooHigh.mapTo<beepType>({kind: "Long"}))
    .orElse(s_timer.mapTo<beepType>({kind: "Short", count: 3}))
    .orElse(s_buttonClicked.mapTo<beepType>({kind: "Short", count: 1}))
    .orElse(s_boiled.mapTo<beepType>({kind: "Short", count: 1}));
};

//ロック状態かどうかを保持するセル
//trueの時ロック状態
type lockStateInput = {
  s_lockButtonClicked: Stream<Unit>;
};

export const lockState = ({
  s_lockButtonClicked,
}: lockStateInput): Cell<boolean> => {
  return Transaction.run(() => {
    const c_lockState = new CellLoop<boolean>();
    c_lockState.loop(s_lockButtonClicked
      .snapshot(c_lockState, (_, lockState) => {
        return !lockState;
      })
      .hold(true));
    return c_lockState;
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
}: hotWaterSupplyInput): Cell<boolean> => {
  return s_tick
    .snapshot3(
      c_lockState,
      c_hotWaterSupplyButtonPushing,
      (_, lockState, hotWaterSupplyButtonPushing) => {
        return lockState && hotWaterSupplyButtonPushing;
      },
    )
    .hold(false);
};

//熱量ストリーム
type heaterPowerInput = {
  s_waterLevelSensor: Stream<WaterLevel>;
  c_targetTemperature: Cell<number>;
  c_status: Cell<Status>;
  c_temperature: Cell<number>;
};

export const heaterPower = ({s_waterLevelSensor, c_targetTemperature, c_status, c_temperature}: heaterPowerInput): Cell<number> => {
  return s_waterLevelSensor.snapshot4(c_targetTemperature, c_status, c_temperature, (waterLevel, targetTemperature, status, temperature) => {
    switch(status){
      case "Boil": return 100;
      case "KeepWarm":{
        if((targetTemperature - temperature) < 0) return 0;
        switch(waterLevel){
          case 0: return 0;
          case 1: return (targetTemperature - temperature)**2 / 4;
          case 2: return (targetTemperature - temperature)**2 / 2;
          case 3: return (targetTemperature - temperature)**2 * 3 / 4;
          case 4: return (targetTemperature - temperature)**2;
          default: return 0;
        }
      }
      case "Stop": return 0;
    }
  })
};
