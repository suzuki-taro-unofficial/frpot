import { Stream, Unit, CellLoop, Transaction } from "sodiumjs";
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
  - => フタを開けて水を入れたりした可能性もあるので、フタが閉まったら復旧
- 満水センサがONのとき
  - => 満水センサがOFFになれば復旧。停止状態のままだけだけど、他のイベントによって沸騰状態に移行する
- 水位が0のとき
  - => 水位が1以上に慣れば復旧。停止状態のままだけど、他のイベントによって沸騰状態に移行する

### 特殊な管理をしているもの
- フタが開いたとき
  - => フタが閉まれば復旧。同時に沸騰状態へ移行
  - 沸騰状態に入る条件の兼ね合いで、障害状態ではなくstatusで管理している

## 沸騰状態・保温状態について
- 沸騰ボタンを押したとき、または、ふたが閉じられたとき、障害状態でなければ沸騰状態になる
- 沸騰状態で100度に達してから3分間経ったら、保温状態に入る
- 障害状態がtrueのとき、必ず停止状態になる
*/

// 各種ストリームをこの更新用の型に変換する
// 更新しない場合はnullを入れる
type FailureStatusUpdate = {
  temperatureTooHigh: boolean | null;
  temperatureNotIncreased: boolean | null;
  waterOverflow: boolean | null;
  waterLevelTooLow: boolean | null;
};

const errorTemperatureTooHighUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_errorTemperatureTooHigh
    .mapTo<FailureStatusUpdate>({
      temperatureTooHigh: true,
      temperatureNotIncreased: null,
      waterOverflow: null,
      waterLevelTooLow: null,
    })
    .orElse(
      inputs.s_temperatureSensor
        .filter((temp) => temp < 100)
        .mapTo<FailureStatusUpdate>({
          temperatureTooHigh: false,
          temperatureNotIncreased: null,
          waterOverflow: null,
          waterLevelTooLow: null,
        }),
    );
};

const errorTemperatureNotIncreasedUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_errorTemperatureNotIncreased
    .mapTo<FailureStatusUpdate>({
      temperatureTooHigh: null,
      temperatureNotIncreased: true,
      waterOverflow: null,
      waterLevelTooLow: null,
    })
    .orElse(
      inputs.s_lid
        .filter((lid) => lid === "Close")
        .mapTo<FailureStatusUpdate>({
          temperatureTooHigh: null,
          temperatureNotIncreased: false,
          waterOverflow: null,
          waterLevelTooLow: null,
        }),
    );
};

const s_waterOverflowUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_waterOverflowSensor.map<FailureStatusUpdate>((cond) => {
    return {
      temperatureTooHigh: null,
      temperatureNotIncreased: null,
      waterOverflow: cond,
      waterLevelTooLow: null,
    };
  });
};

const s_waterLevelTooLowUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_waterLevelSensor
    .filter((level) => level === 0)
    .mapTo<FailureStatusUpdate>({
      temperatureTooHigh: null,
      temperatureNotIncreased: null,
      waterOverflow: null,
      waterLevelTooLow: true,
    })
    .orElse(
      inputs.s_waterLevelSensor
        .filter((level) => level > 0)
        .mapTo<FailureStatusUpdate>({
          temperatureTooHigh: null,
          temperatureNotIncreased: null,
          waterOverflow: null,
          waterLevelTooLow: false,
        }),
    );
};

// 今回は左辺でfalse, 右辺でtrueが来るようなことはないので、??演算子で十分
const mergeFailureStatusUpdate: (
  a: FailureStatusUpdate,
  b: FailureStatusUpdate,
) => FailureStatusUpdate = (a, b) => {
  return {
    temperatureTooHigh: a.temperatureTooHigh ?? b.temperatureTooHigh,
    temperatureNotIncreased:
      a.temperatureNotIncreased ?? b.temperatureNotIncreased,
    waterOverflow: a.waterOverflow ?? b.waterOverflow,
    waterLevelTooLow: a.waterLevelTooLow ?? b.waterLevelTooLow,
  };
};

// statusの各種停止状態について、それぞれの停止状態の条件が復旧されたかどうかを監視する
// 障害状態と名付ける
const failureStatus = (inputs: StatusInput): Stream<boolean> => {
  const s_errorTemperatureTooHigh = errorTemperatureTooHighUpdate(inputs);
  const s_errorTemperatureNotIncreased =
    errorTemperatureNotIncreasedUpdate(inputs);
  const s_waterOverflow = s_waterOverflowUpdate(inputs);
  const s_waterLevelTooLow = s_waterLevelTooLowUpdate(inputs);

  const c_failureStatus = new CellLoop<{
    temperatureTooHigh: boolean;
    temperatureNotIncreased: boolean;
    waterOverflow: boolean;
    waterLevelTooLow: boolean;
  }>();

  const s_newFailureStatus = s_errorTemperatureTooHigh
    .merge(s_errorTemperatureNotIncreased, mergeFailureStatusUpdate)
    .merge(s_waterOverflow, mergeFailureStatusUpdate)
    .merge(s_waterLevelTooLow, mergeFailureStatusUpdate);

  c_failureStatus.loop(
    s_newFailureStatus
      .snapshot(c_failureStatus, (newStatus, oldStatus) => {
        return {
          temperatureTooHigh:
            newStatus.temperatureTooHigh ?? oldStatus.temperatureTooHigh,
          temperatureNotIncreased:
            newStatus.temperatureNotIncreased ??
            oldStatus.temperatureNotIncreased,
          waterOverflow: newStatus.waterOverflow ?? oldStatus.waterOverflow,
          waterLevelTooLow:
            newStatus.waterLevelTooLow ?? oldStatus.waterLevelTooLow,
        };
      })
      .hold({
        temperatureTooHigh: false,
        temperatureNotIncreased: false,
        waterOverflow: false,
        waterLevelTooLow: false,
      }),
  );

  // 変化があったときのみ発火するストリーム
  // 本当はストリームが発火するタイミングをもっと絞り込めるけれど、デバッグ出力との兼ね合いでこんな実装にした
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
        waterOverflowNew,
        waterOverflowOld,
        waterLevelTooLowNew,
        waterLevelTooLowOld,
      }) => {
        return (
          temperatureTooHighNew !== temperatureTooHighOld ||
          temperatureNotIncreasedNew !== temperatureNotIncreasedOld ||
          waterOverflowNew !== waterOverflowOld ||
          waterLevelTooLowNew !== waterLevelTooLowOld
        );
      },
    )
    .map(
      ({
        temperatureTooHighNew,
        temperatureNotIncreasedNew,
        waterOverflowNew,
        waterLevelTooLowNew,
      }) => {
        console.log({
          temperatureTooHigh: temperatureTooHighNew,
          temperatureNotIncreased: temperatureNotIncreasedNew,
          waterOverflow: waterOverflowNew,
          waterLevelTooLow: waterLevelTooLowNew,
        });
        return (
          temperatureTooHighNew ||
          temperatureNotIncreasedNew ||
          waterOverflowNew ||
          waterLevelTooLowNew
        );
      },
    );

  return s_filterdFailureStatus;
};

// 保温状態に入るタイミングを監視する
// 保温状態に切り替わるとき、一回だけ発火する
const turnOnKeepWarm = (inputs: StatusInput): Stream<Unit> => {
  // 100度に入った瞬間から時刻を計算し始める。
  const c_100DegreeTime = new CellLoop<number>();
  // もし100度以上なら可算をし、100度未満になったらリセットする
  c_100DegreeTime.loop(
    inputs.s_temperatureSensor
      .snapshot<number, number>(c_100DegreeTime, (temp, time) => {
        return temp >= 100 ? time : 0;
      })
      .merge(inputs.s_tick, (erapsedTime, deltaTime) => {
        return erapsedTime + deltaTime;
      })
      .hold(0),
  );

  // テストのため10秒にしている
  const threeMinutes = 10 * 1000;
  const s_turnOnWarmStatus = inputs.s_tick
    .snapshot(c_100DegreeTime, (deltaTime, erapsedTime) => {
      return { deltaTime, erapsedTime };
    })
    .filter(({ deltaTime, erapsedTime }) => {
      return (
        erapsedTime < threeMinutes && threeMinutes <= erapsedTime + deltaTime
      );
    })
    .mapTo<Unit>(new Unit());
  return s_turnOnWarmStatus;
};

export const status = (inputs: StatusInput): Stream<Status> => {
  return Transaction.run(() => {
    const s_failureStatus = failureStatus(inputs);
    const s_turnOnKeepWarm = turnOnKeepWarm(inputs);
    const c_lidClose = inputs.s_lid.map((lid) => lid === "Close").hold(false);
    const c_status = new CellLoop<Status>();
    const c_prevLid = inputs.s_lid.hold("Open");
    const s_lidClosed = inputs.s_lid
      .snapshot(c_prevLid, (newLid, prevLid) => {
        return newLid === "Close" && prevLid === "Open";
      })
      .filter((a) => a)
      .mapTo<Unit>(new Unit());
    const s_new_status = s_failureStatus
      .filter((failure) => failure)
      .mapTo<Status>("Stop")
      .orElse(
        inputs.s_lid.filter((lid) => lid === "Open").mapTo<Status>("Stop"),
      )
      .orElse(s_turnOnKeepWarm.gate(c_lidClose).mapTo<Status>("KeepWarm"))
      .orElse(inputs.s_boilButtonClicked.gate(c_lidClose).mapTo<Status>("Boil"))
      .orElse(s_lidClosed.mapTo<Status>("Boil"))
      .snapshot3(
        c_status,
        s_failureStatus.hold(true),
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
