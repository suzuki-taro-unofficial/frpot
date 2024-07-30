import { Stream, Unit, CellLoop, Transaction } from "sodiumjs";
import { LidState, WaterLevel } from "../../types";
import { Status } from "../types";
import { Time } from "@/util/time";

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
- フタが開いたとき
  - => フタが閉まれば復旧。同時に沸騰状態へ移行

## 沸騰状態・保温状態について
- 沸騰ボタンを押したとき、または、ふたが閉じられたとき、障害状態でなければ沸騰状態になる
- 沸騰状態で100度に達してから3分間経ったら、保温状態に入る
- 障害状態がtrueのとき、必ず停止状態になる
*/

// 各種ストリームをこの更新用の型に変換する
// 更新しない場合はnullを入れる
type FailureStatusUpdate = {
  temperatureTooHigh?: boolean;
  temperatureNotIncreased?: boolean;
  waterOverflow?: boolean;
  waterLevelTooLow?: boolean;
  lidOpen?: boolean;
};

const errorTemperatureTooHighUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_errorTemperatureTooHigh
    .mapTo<FailureStatusUpdate>({
      temperatureTooHigh: true,
    })
    .orElse(
      inputs.s_temperatureSensor
        .filter((temp) => temp < 100)
        .mapTo<FailureStatusUpdate>({
          temperatureTooHigh: false,
        }),
    );
};

const errorTemperatureNotIncreasedUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_errorTemperatureNotIncreased
    .mapTo<FailureStatusUpdate>({
      temperatureNotIncreased: true,
    })
    .orElse(
      inputs.s_lid
        .filter((lid) => lid === "Close")
        .mapTo<FailureStatusUpdate>({
          temperatureNotIncreased: false,
        }),
    );
};

const s_waterOverflowUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_waterOverflowSensor.map<FailureStatusUpdate>((cond) => {
    return {
      waterOverflow: cond,
    };
  });
};

const s_waterLevelTooLowUpdate = (
  inputs: StatusInput,
): Stream<FailureStatusUpdate> => {
  return inputs.s_waterLevelSensor
    .filter((level) => level === 0)
    .mapTo<FailureStatusUpdate>({
      waterLevelTooLow: true,
    })
    .orElse(
      inputs.s_waterLevelSensor
        .filter((level) => level > 0)
        .mapTo<FailureStatusUpdate>({
          waterLevelTooLow: false,
        }),
    );
};

const s_lidOpenUpdate = (inputs: StatusInput): Stream<FailureStatusUpdate> => {
  return inputs.s_lid
    .filter((lid) => lid === "Open")
    .mapTo<FailureStatusUpdate>({
      lidOpen: true,
    })
    .orElse(
      inputs.s_lid
        .filter((lid) => lid === "Close")
        .mapTo<FailureStatusUpdate>({
          lidOpen: false,
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
    lidOpen: a.lidOpen ?? b.lidOpen,
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
  const s_lidOpen = s_lidOpenUpdate(inputs);

  const cloop_failureStatus = new CellLoop<{
    temperatureTooHigh: boolean;
    temperatureNotIncreased: boolean;
    waterOverflow: boolean;
    waterLevelTooLow: boolean;
    lidOpen: boolean;
  }>();

  const s_mergedFailureStatus = s_errorTemperatureTooHigh
    .merge(s_errorTemperatureNotIncreased, mergeFailureStatusUpdate)
    .merge(s_waterOverflow, mergeFailureStatusUpdate)
    .merge(s_waterLevelTooLow, mergeFailureStatusUpdate)
    .merge(s_lidOpen, mergeFailureStatusUpdate);

  const s_newFailureStatus = s_mergedFailureStatus.snapshot(
    cloop_failureStatus,
    (newStatus, oldStatus) => {
      return {
        temperatureTooHigh:
          newStatus.temperatureTooHigh ?? oldStatus.temperatureTooHigh,
        temperatureNotIncreased:
          newStatus.temperatureNotIncreased ??
          oldStatus.temperatureNotIncreased,
        waterOverflow: newStatus.waterOverflow ?? oldStatus.waterOverflow,
        waterLevelTooLow:
          newStatus.waterLevelTooLow ?? oldStatus.waterLevelTooLow,
        lidOpen: newStatus.lidOpen ?? oldStatus.lidOpen,
      };
    },
  );

  cloop_failureStatus.loop(
    s_newFailureStatus.hold({
      temperatureTooHigh: true,
      temperatureNotIncreased: false,
      waterOverflow: true,
      waterLevelTooLow: true,
      lidOpen: true,
    }),
  );

  return s_newFailureStatus.map((status) => {
    return (
      status.temperatureTooHigh ||
      status.temperatureNotIncreased ||
      status.waterOverflow ||
      status.waterLevelTooLow ||
      status.lidOpen
    );
  });
};

// 保温状態に入るタイミングを監視する
// 100度に到達した後、3分ごとに発火する
const turnOnKeepWarm = (inputs: StatusInput): Stream<Unit> => {
  const s_under100Degree = inputs.s_temperatureSensor
    .filter((t) => t < 100 - 1) // -1度の誤差を許容する
    .mapTo(Unit.UNIT);

  return Time.ms_passed(
    // テストのため10秒にしている
    Time.second_to_ms(10),
    inputs.s_tick,
    // 100度以下の時は計測をリセット
    s_under100Degree,
  );
};

// 他のストリームは常時更新されるが、statusは更新されるときだけ更新される
export const status = (inputs: StatusInput): Stream<Status> => {
  // デフォルト値にc_failureStatusを使いs_failureStatusが発火したときはs_failureStatusを使う
  const s_failureStatus = failureStatus(inputs);
  const c_failureStatus = s_failureStatus.hold(false);
  const s_turnOnKeepWarm = turnOnKeepWarm(inputs);
  const c_prevLid = inputs.s_lid.hold("Open");
  const s_lidClose = inputs.s_lid
    .snapshot(c_prevLid, (newLid, prevLid) => {
      return newLid === "Close" && prevLid === "Open";
    })
    .filter((v) => v)
    .mapTo(Unit.UNIT);
  const cloop_prevStatus = new CellLoop<Status>();

  type StatusUpdate = {
    status: Status;
    failure: boolean;
  };
  const s_boilButtonClickedStatus =
    inputs.s_boilButtonClicked.mapTo<Status>("Boil");
  const s_lidCloseStatus = s_lidClose.mapTo<Status>("Boil");
  const s_turnOnKeepWarmStatus = s_turnOnKeepWarm.mapTo<Status>("KeepWarm");
  // 沸騰・保温のストリームが発火したときは、新しいstatusと古いfailureStatusを使う
  const s_mergedUpdate = s_boilButtonClickedStatus
    .orElse(s_lidCloseStatus)
    .orElse(s_turnOnKeepWarmStatus)
    .snapshot<boolean, StatusUpdate>(c_failureStatus, (status, failure) => {
      return {
        status,
        failure,
      };
    });
  // failureStatusが発火したときは、前回のstatusと新しいfailureStatusを使う
  const s_failureStatusUpdate = s_failureStatus.snapshot<Status, StatusUpdate>(
    cloop_prevStatus,
    (failure, prevStatus) => {
      return {
        status: prevStatus,
        failure,
      };
    },
  );
  // 沸騰・保温のストリームとfailureStatusが同時に起こったとき(フタを閉めたときなど、よく発生する)は、新しい情報を使う
  const s_newStatus = s_mergedUpdate
    .merge(s_failureStatusUpdate, (other, failure) => {
      return {
        status: other.status,
        failure: failure.failure,
      };
    })
    .map(({ status, failure }) => {
      return failure ? "Stop" : status;
    });

  cloop_prevStatus.loop(s_newStatus.hold("Stop"));
  // このストリームは、statusが更新されたときだけ発火する
  return s_newStatus
    .snapshot(cloop_prevStatus, (newStatus, prevStatus) => {
      return {
        newStatus,
        prevStatus,
      };
    })
    .filter(({ newStatus, prevStatus }) => {
      return newStatus !== prevStatus;
    })
    .map(({ newStatus }) => {
      return newStatus;
    });
};
