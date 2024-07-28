import { Stream, Unit, Cell, CellLoop, Transaction } from "sodiumjs";
import { LidState, WaterLevel } from "../../types";
import { Status } from "../types";
import { error_temperature_too_hight } from "./error";

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
const failure_status = (inputs: StatusInput): Stream<boolean> => {
  type FailureStatusUpdate = {
    temperatureTooHigh: boolean | null;
    temperatureNotIncreased: boolean | null;
    lidOpen: boolean | null;
    waterOverflow: boolean | null;
    waterLevelTooLow: boolean | null;
  };

  const s_errorTemperatureTooHigh = inputs.s_errorTemperatureTooHigh
    .mapTo<FailureStatusUpdate>({
      temperatureTooHigh: true,
      temperatureNotIncreased: null,
      lidOpen: null,
      waterOverflow: null,
      waterLevelTooLow: null,
    })
    .orElse(
      inputs.s_temperatureSensor
        .filter((temp) => temp < 100)
        .mapTo<FailureStatusUpdate>({
          temperatureTooHigh: false,
          temperatureNotIncreased: null,
          lidOpen: null,
          waterOverflow: null,
          waterLevelTooLow: null,
        }),
    );

  const s_errorTemperatureNotIncreased =
    inputs.s_errorTemperatureNotIncreased.mapTo<FailureStatusUpdate>({
      temperatureTooHigh: null,
      temperatureNotIncreased: true,
      lidOpen: null,
      waterOverflow: null,
      waterLevelTooLow: null,
    }); // 一度エラーが出たら復旧しない

  const s_lidOpen = inputs.s_lid.map<FailureStatusUpdate>((lid) => {
    return {
      temperatureTooHigh: null,
      temperatureNotIncreased: null,
      lidOpen: lid === "Open",
      waterOverflow: null,
      waterLevelTooLow: null,
    };
  });

  const s_waterOverflow = inputs.s_waterOverflowSensor.map<FailureStatusUpdate>(
    (cond) => {
      return {
        temperatureTooHigh: null,
        temperatureNotIncreased: null,
        lidOpen: null,
        waterOverflow: cond,
        waterLevelTooLow: null,
      };
    },
  );

  const s_waterLevelTooLow = inputs.s_waterLevelSensor
    .filter((level) => level === 0)
    .mapTo<FailureStatusUpdate>({
      temperatureTooHigh: null,
      temperatureNotIncreased: null,
      lidOpen: null,
      waterOverflow: null,
      waterLevelTooLow: true,
    })
    .orElse(
      inputs.s_waterLevelSensor
        .filter((level) => level > 0)
        .mapTo<FailureStatusUpdate>({
          temperatureTooHigh: null,
          temperatureNotIncreased: null,
          lidOpen: null,
          waterOverflow: null,
          waterLevelTooLow: false,
        }),
    );

  const c_failureStatus = new CellLoop<{
    temperatureTooHigh: boolean;
    temperatureNotIncreased: boolean;
    lidOpen: boolean;
    waterOverflow: boolean;
    waterLevelTooLow: boolean;
  }>();

  // 今回は左辺でfalse, 右辺でtrueが来るようなことはないので、??演算子で十分
  const mergeFunc: (
    a: FailureStatusUpdate,
    b: FailureStatusUpdate,
  ) => FailureStatusUpdate = (
    a: FailureStatusUpdate,
    b: FailureStatusUpdate,
  ) => {
    return {
      temperatureTooHigh: a.temperatureTooHigh ?? b.temperatureTooHigh,
      temperatureNotIncreased:
        a.temperatureNotIncreased ?? b.temperatureNotIncreased,
      lidOpen: a.lidOpen ?? b.lidOpen,
      waterOverflow: a.waterOverflow ?? b.waterOverflow,
      waterLevelTooLow: a.waterLevelTooLow ?? b.waterLevelTooLow,
    };
  };

  const s_newFailureStatus = s_errorTemperatureTooHigh
    .merge(s_errorTemperatureNotIncreased, mergeFunc)
    .merge(s_lidOpen, mergeFunc)
    .merge(s_waterOverflow, mergeFunc)
    .merge(s_waterLevelTooLow, mergeFunc);

  c_failureStatus.loop(
    s_newFailureStatus
      .snapshot(c_failureStatus, (newStatus, oldStatus) => {
        return {
          temperatureTooHigh:
            newStatus.temperatureTooHigh ?? oldStatus.temperatureTooHigh,
          temperatureNotIncreased:
            newStatus.temperatureNotIncreased ??
            oldStatus.temperatureNotIncreased,
          lidOpen: newStatus.lidOpen ?? oldStatus.lidOpen,
          waterOverflow: newStatus.waterOverflow ?? oldStatus.waterOverflow,
          waterLevelTooLow:
            newStatus.waterLevelTooLow ?? oldStatus.waterLevelTooLow,
        };
      })
      .hold({
        temperatureTooHigh: false,
        temperatureNotIncreased: false,
        lidOpen: false,
        waterOverflow: false,
        waterLevelTooLow: false,
      }),
  );

  // 変化があったときのみ発火するストリーム
  const s_filterdFailureStatus = s_newFailureStatus
    .snapshot(c_failureStatus, (newStatus, oldStatus) => {
      return {
        temperatureTooHighNew:
          newStatus.temperatureTooHigh ?? oldStatus.temperatureTooHigh,
        temperatureTooHighOld: oldStatus.temperatureTooHigh,
        temperatureNotIncreasedNew:
          newStatus.temperatureNotIncreased ??
          oldStatus.temperatureNotIncreased,
        temperatureNotIncreasedOld: oldStatus.temperatureNotIncreased,
        lidOpenNew: newStatus.lidOpen ?? oldStatus.lidOpen,
        lidOpenOld: oldStatus.lidOpen,
        waterOverflowNew: newStatus.waterOverflow ?? oldStatus.waterOverflow,
        waterOverflowOld: oldStatus.waterOverflow,
        waterLevelTooLowNew:
          newStatus.waterLevelTooLow ?? oldStatus.waterLevelTooLow,
        waterLevelTooLowOld: oldStatus.waterLevelTooLow,
      };
    })
    .filter(
      ({
        temperatureTooHighNew,
        temperatureTooHighOld,
        temperatureNotIncreasedNew,
        temperatureNotIncreasedOld,
        lidOpenNew,
        lidOpenOld,
        waterOverflowNew,
        waterOverflowOld,
        waterLevelTooLowNew,
        waterLevelTooLowOld,
      }) => {
        return (
          temperatureTooHighNew !== temperatureTooHighOld ||
          temperatureNotIncreasedNew !== temperatureNotIncreasedOld ||
          lidOpenNew !== lidOpenOld ||
          waterOverflowNew !== waterOverflowOld ||
          waterLevelTooLowNew !== waterLevelTooLowOld
        );
      },
    )
    .map(
      ({
        temperatureTooHighNew,
        temperatureNotIncreasedNew,
        lidOpenNew,
        waterOverflowNew,
        waterLevelTooLowNew,
      }) => {
        console.log({temperatureTooHigh: temperatureTooHighNew, temperatureNotIncreased: temperatureNotIncreasedNew, lidOpen: lidOpenNew, waterOverflow: waterOverflowNew, waterLevelTooLow: waterLevelTooLowNew});
        return (
          temperatureTooHighNew ||
          temperatureNotIncreasedNew ||
          lidOpenNew ||
          waterOverflowNew ||
          waterLevelTooLowNew
        );
      },
    );

  return s_filterdFailureStatus;
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

export const status = (inputs: StatusInput): Stream<Status> => {
  return Transaction.run(() => {
    const s_failure = failure_status(inputs);
    const s_keepWarm = keep_worm_status(inputs);
    const c_status = new CellLoop<Status>();
    const s_new_status = s_failure
      .mapTo<Status>("Stop")
      .orElse(inputs.s_boilButtonClicked.mapTo<Status>("Boil"))
      .orElse(
        inputs.s_lid.filter((lid) => lid === "Close").mapTo<Status>("Boil"),
      )
      .orElse(s_keepWarm.mapTo<Status>("KeepWarm"))
      .snapshot3(
        c_status,
        s_failure.hold(true),
        (newStatus, prevStatus, failure) => {
          return {
            newStatus: failure ? "Stop" : newStatus,
            prevStatus: prevStatus,
          };
        },
      )
      .filter(({ prevStatus, newStatus }) => prevStatus !== newStatus)
      .map(({ newStatus }) => newStatus);
    c_status.loop(s_new_status.hold("Stop"));
    return s_new_status;
  });
};
