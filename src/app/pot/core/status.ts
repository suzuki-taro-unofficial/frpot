import { Stream, Unit, Cell, CellLoop, Transaction } from "sodiumjs";
import { LidState, WaterLevel } from "../../types";
import { Status } from "../types";

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
    inputs.s_errorTemperatureTooHigh
      .mapTo(true)
      .orElse(
        inputs.s_temperatureSensor.filter((temp) => temp <= 90).mapTo(false),
      )
      .hold(false),
  );
  const c_temperatureNotIncreasedError = inputs.s_errorTemperatureNotIncreased
    .mapTo(true)
    .hold(false);
  const c_lidOpened = inputs.s_lid.map((lid) => lid === "Open").hold(true);
  const c_waterOverflow = inputs.s_waterOverflowSensor.hold(false);
  const c_waterLevelIsLow = inputs.s_waterLevelSensor
    .hold(0)
    .map((level) => level === 0);
  return c_highTemperatureError.lift5(
    c_temperatureNotIncreasedError,
    c_lidOpened,
    c_waterOverflow,
    c_waterLevelIsLow,
    (highTemp, notIncreased, lid, overflow, low) => {
      return highTemp || notIncreased || lid || overflow || low;
    },
  );
};

// 保温状態に入るタイミングを監視する
const keep_worm_status = (inputs: StatusInput): Stream<Unit> => {
  // 100度未満の状態->100度以上の状態になった時刻を持つ
  // その時刻から3分経ってない状態->3分経過した状態になったとき、戻り値のストリームを発火する
  const c_temperature = inputs.s_temperatureSensor.hold(0);
  const c_time = inputs.s_tick.hold(0);
  const c_100DegreeTime = inputs.s_temperatureSensor
    .snapshot(c_temperature, (newTemp, oldTemp) => {
      return { newTemp: newTemp, oldTemp: oldTemp };
    })
    .filter(({ newTemp, oldTemp }) => oldTemp < 100 && newTemp >= 100)
    .snapshot(c_time, (_, time) => time)
    .hold(0);
  const c_3MinutesPassed = inputs.s_tick
    .snapshot3<number, number, boolean>(
      c_time,
      c_100DegreeTime,
      (currTime, prevTime, degreeTime) => {
        const targetTime = degreeTime + 3 * 60 * 1000;
        return prevTime < targetTime && currTime >= targetTime;
      },
    )
    .filter((cond) => cond)
    .mapTo(new Unit());
  return c_3MinutesPassed;
};

export const status = (inputs: StatusInput): Cell<Status> => {
  return Transaction.run(() => {
    const c_failure = failure_status(inputs);
    const s_keepWarm = keep_worm_status(inputs);
    const c_status = new CellLoop<Status>();
    c_status.loop(
      inputs.s_boilButtonClicked
        .mapTo<Status>("Boil")
        .orElse(
          inputs.s_lid.filter((lid) => lid === "Close").mapTo<Status>("Boil"),
        )
        .orElse(s_keepWarm.mapTo<Status>("KeepWarm"))
        .snapshot<boolean, Status>(c_failure, (newStatus, failure) => {
          return failure ? "Stop" : newStatus;
        })
        .hold("Stop"),
    );
    return c_status;
  });
};
