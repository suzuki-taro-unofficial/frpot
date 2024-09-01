import { Stream, Unit, CellLoop } from "sodiumjs";
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

// 各種ストリームをこの更新用の型に変換する
// 更新しない場合はnullを入れる
type ErrorStatusUpdate = {
  temperatureTooHigh?: boolean;
  temperatureNotIncreased?: boolean;
  waterOverflow?: boolean;
  waterLevelTooLow?: boolean;
};

const errorTemperatureTooHighUpdate = (
  inputs: StatusInput,
): Stream<ErrorStatusUpdate> => {
  return inputs.s_errorTemperatureTooHigh
    .mapTo<ErrorStatusUpdate>({
      temperatureTooHigh: true,
    })
    .orElse(
      inputs.s_temperatureSensor
        .filter((temp) => temp < 100)
        .mapTo<ErrorStatusUpdate>({
          temperatureTooHigh: false,
        }),
    );
};

const errorTemperatureNotIncreasedUpdate = (
  inputs: StatusInput,
): Stream<ErrorStatusUpdate> => {
  return inputs.s_errorTemperatureNotIncreased
    .mapTo<ErrorStatusUpdate>({
      temperatureNotIncreased: true,
    })
    .orElse(
      inputs.s_lid
        .filter((lid) => lid === "Close")
        .mapTo<ErrorStatusUpdate>({
          temperatureNotIncreased: false,
        }),
    );
};

const s_waterOverflowUpdate = (
  inputs: StatusInput,
): Stream<ErrorStatusUpdate> => {
  return inputs.s_waterOverflowSensor.map<ErrorStatusUpdate>((cond) => {
    return {
      waterOverflow: cond,
    };
  });
};

const s_waterLevelTooLowUpdate = (
  inputs: StatusInput,
): Stream<ErrorStatusUpdate> => {
  return inputs.s_waterLevelSensor
    .filter((level) => level === 0)
    .mapTo<ErrorStatusUpdate>({
      waterLevelTooLow: true,
    })
    .orElse(
      inputs.s_waterLevelSensor
        .filter((level) => level > 0)
        .mapTo<ErrorStatusUpdate>({
          waterLevelTooLow: false,
        }),
    );
};

// 今回は左辺でfalse, 右辺でtrueが来るようなことはないので、??演算子で十分
const mergeErrorStatusUpdate: (
  a: ErrorStatusUpdate,
  b: ErrorStatusUpdate,
) => ErrorStatusUpdate = (a, b) => {
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
const errorStatus = (inputs: StatusInput): Stream<boolean> => {
  const s_errorTemperatureTooHigh = errorTemperatureTooHighUpdate(inputs);
  const s_errorTemperatureNotIncreased =
    errorTemperatureNotIncreasedUpdate(inputs);
  const s_waterOverflow = s_waterOverflowUpdate(inputs);
  const s_waterLevelTooLow = s_waterLevelTooLowUpdate(inputs);

  const cloop_errorStatus = new CellLoop<{
    temperatureTooHigh: boolean;
    temperatureNotIncreased: boolean;
    waterOverflow: boolean;
    waterLevelTooLow: boolean;
  }>();

  const s_mergedErrorStatus = s_errorTemperatureTooHigh
    .merge(s_errorTemperatureNotIncreased, mergeErrorStatusUpdate)
    .merge(s_waterOverflow, mergeErrorStatusUpdate)
    .merge(s_waterLevelTooLow, mergeErrorStatusUpdate);

  const s_newErrorStatus = s_mergedErrorStatus.snapshot(
    cloop_errorStatus,
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
      };
    },
  );

  cloop_errorStatus.loop(
    s_newErrorStatus.hold({
      temperatureTooHigh: true,
      temperatureNotIncreased: false,
      waterOverflow: true,
      waterLevelTooLow: true,
    }),
  );

  return s_newErrorStatus.map((status) => {
    return (
      status.temperatureTooHigh ||
      status.temperatureNotIncreased ||
      status.waterOverflow ||
      status.waterLevelTooLow
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

const lidChange = (lid: Stream<LidState>): Stream<LidState> => {
  const c_prevLid = lid.hold("Open");
  return lid
    .snapshot(c_prevLid, (newLid, prevLid) => {
      return { newLid: newLid, change: newLid !== prevLid };
    })
    .filter((v) => v.change)
    .map((v) => v.newLid);
};

const boilButtonClickedAndLidClose = (
  lid: Stream<LidState>,
  boilButton: Stream<Unit>,
): Stream<Unit> => {
  const c_prevLid = lid.hold("Open");
  return boilButton
    .snapshot(c_prevLid, (boilButton, prevLid) => {
      return boilButton === Unit.UNIT && prevLid === "Close";
    })
    .filter((v) => v)
    .mapTo(Unit.UNIT);
};

// statusのストリームは更新があるときだけ発火する。
export const status = (inputs: StatusInput): Stream<Status> => {
  type InnerStatus = "KeepWarm" | "Boil" | "NormalStop" | "ErrorStop";
  const cloop_prevInnnerStatus = new CellLoop<InnerStatus>();
  const s_errorOccured = errorStatus(inputs)
    .filter((v) => v)
    .mapTo<InnerStatus>("ErrorStop");
  const s_errorRecovered = errorStatus(inputs)
    .filter((v) => !v)
    .mapTo<InnerStatus>("NormalStop");
  const s_lidChange = lidChange(inputs.s_lid);
  const s_lidOpen = s_lidChange
    .filter((v) => v === "Open")
    .snapshot<InnerStatus, InnerStatus>(
      cloop_prevInnnerStatus,
      (_, prevStatus) => {
        switch (prevStatus) {
          case "KeepWarm":
            return "NormalStop";
          case "Boil":
            return "NormalStop";
          case "NormalStop":
            return "NormalStop";
          case "ErrorStop":
            return "ErrorStop";
        }
      },
    );
  const s_lidClose = s_lidChange
    .filter((v) => v === "Close")
    .snapshot<InnerStatus, InnerStatus>(
      cloop_prevInnnerStatus,
      (_, prevStatus) => {
        switch (prevStatus) {
          case "NormalStop":
            return "Boil";
          case "ErrorStop":
            return "ErrorStop";
          default:
            throw new Error("Invalid status");
        }
      },
    );
  const s_boilButtonClickedAndLidClose = boilButtonClickedAndLidClose(
    inputs.s_lid,
    inputs.s_boilButtonClicked,
  ).snapshot<InnerStatus, InnerStatus>(
    cloop_prevInnnerStatus,
    (_, prevStatus) => {
      switch (prevStatus) {
        case "NormalStop":
          return "Boil";
        case "Boil":
          return "Boil";
        case "KeepWarm":
          return "Boil";
        case "ErrorStop":
          return "ErrorStop";
      }
    },
  );
  const s_newInnnerStatus = s_errorOccured
    .orElse(s_errorRecovered)
    .orElse(s_lidOpen)
    .orElse(s_lidClose)
    .orElse(s_boilButtonClickedAndLidClose);

  cloop_prevInnnerStatus.loop(s_newInnnerStatus.hold("NormalStop"));

  const cloop_prevOuterStatus = new CellLoop<Status>();
  const s_newOuterStatus = s_newInnnerStatus
    .map<Status>((innerStatus) => {
      switch (innerStatus) {
        case "KeepWarm":
          return "KeepWarm";
        case "Boil":
          return "Boil";
        case "NormalStop":
          return "Stop";
        case "ErrorStop":
          return "Stop";
      }
    })
    .snapshot(cloop_prevOuterStatus, (newStatus, prevStatus) => {
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
  cloop_prevOuterStatus.loop(s_newOuterStatus.hold("Stop"));
  return s_newOuterStatus;
};
