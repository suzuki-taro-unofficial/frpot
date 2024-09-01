import { Stream, Unit, CellLoop } from "sodiumjs";
import { LidState, WaterLevel } from "../../types";
import { Status } from "../types";
import { Time } from "@/util/time";
import { change } from "@/util/change";

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
  s_errorTemperatureTooHigh: Stream<Unit>,
  s_temperatureSensor: Stream<number>,
): Stream<ErrorStatusUpdate> => {
  return s_errorTemperatureTooHigh
    .mapTo<ErrorStatusUpdate>({
      temperatureTooHigh: true,
    })
    .orElse(
      s_temperatureSensor
        .filter((temp) => temp < 100)
        .mapTo<ErrorStatusUpdate>({
          temperatureTooHigh: false,
        }),
    );
};

const errorTemperatureNotIncreasedUpdate = (
  s_errorTemperatureNotIncreased: Stream<Unit>,
  s_lid: Stream<LidState>,
): Stream<ErrorStatusUpdate> => {
  return s_errorTemperatureNotIncreased
    .mapTo<ErrorStatusUpdate>({
      temperatureNotIncreased: true,
    })
    .orElse(
      s_lid
        .filter((lid) => lid === "Close")
        .mapTo<ErrorStatusUpdate>({
          temperatureNotIncreased: false,
        }),
    );
};

const waterOverflowUpdate = (
  s_waterOverflowSensor: Stream<boolean>,
): Stream<ErrorStatusUpdate> => {
  return s_waterOverflowSensor.map<ErrorStatusUpdate>((cond) => ({
    waterOverflow: cond,
  }));
};

const waterLevelTooLowUpdate = (
  s_waterLevelSensor: Stream<WaterLevel>,
): Stream<ErrorStatusUpdate> => {
  return s_waterLevelSensor
    .filter((level) => level === 0)
    .mapTo<ErrorStatusUpdate>({
      waterLevelTooLow: true,
    })
    .orElse(
      s_waterLevelSensor
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

// エラーが発生した or 解消したときに発火するストリーム
const errorStatus = (
  s_errorTemperatureTooHigh: Stream<Unit>,
  s_errorTemperatureNotIncreased: Stream<Unit>,
  s_waterOverflowSensor: Stream<boolean>,
  s_waterLevelSensor: Stream<WaterLevel>,
  s_temperatureSensor: Stream<number>,
  s_lid: Stream<LidState>,
): Stream<boolean> => {
  const s_errorTemperatureTooHighUpdate = errorTemperatureTooHighUpdate(
    s_errorTemperatureTooHigh,
    s_temperatureSensor,
  );
  const s_errorTemperatureNotIncreasedUpdate =
    errorTemperatureNotIncreasedUpdate(s_errorTemperatureNotIncreased, s_lid);
  const s_waterOverflowUpdate = waterOverflowUpdate(s_waterOverflowSensor);
  const s_waterLevelTooLowUpdate = waterLevelTooLowUpdate(s_waterLevelSensor);

  const cloop_errorStatus = new CellLoop<{
    temperatureTooHigh: boolean;
    temperatureNotIncreased: boolean;
    waterOverflow: boolean;
    waterLevelTooLow: boolean;
  }>();

  const s_mergedErrorStatus = s_errorTemperatureTooHighUpdate
    .merge(s_errorTemperatureNotIncreasedUpdate, mergeErrorStatusUpdate)
    .merge(s_waterOverflowUpdate, mergeErrorStatusUpdate)
    .merge(s_waterLevelTooLowUpdate, mergeErrorStatusUpdate);

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
const turnOnKeepWarm = (
  s_temperatureSensor: Stream<number>,
  s_tick: Stream<number>,
): Stream<Unit> => {
  const s_under100Degree = s_temperatureSensor
    .filter((t) => t < 100 - 1) // 1度の誤差を許容する
    .mapTo(Unit.UNIT);

  return Time.ms_passed(
    // テストのため10秒にしている
    Time.second_to_ms(10),
    s_tick,
    // 100度以下の時は計測をリセット
    s_under100Degree,
  );
};

const boilButtonClickedAndLidClose = (
  lid: Stream<LidState>,
  boilButton: Stream<Unit>,
): Stream<Unit> => {
  return boilButton.gate(lid.hold("Open").map((lid) => lid === "Close"));
};

// statusのストリームは更新があるときだけ発火する。
export const status = (inputs: StatusInput): Stream<Status> => {
  type InnerStatus = "KeepWarm" | "Boil" | "NormalStop" | "ErrorStop";
  const cloop_prevInnnerStatus = new CellLoop<InnerStatus>();
  const s_errorStatus = errorStatus(
    inputs.s_errorTemperatureTooHigh,
    inputs.s_errorTemperatureNotIncreased,
    inputs.s_waterOverflowSensor,
    inputs.s_waterLevelSensor,
    inputs.s_temperatureSensor,
    inputs.s_lid,
  );
  const s_errorOccured = s_errorStatus
    .filter((s) => s)
    .mapTo<InnerStatus>("ErrorStop");
  const s_errorRecovered = s_errorStatus
    .filter((s) => !s)
    .snapshot1(cloop_prevInnnerStatus)
    .filter((s) => s === "ErrorStop")
    .mapTo<InnerStatus>("NormalStop");
  const s_lidChange = change(inputs.s_lid, "Open");
  const s_lidOpen = s_lidChange
    .filter((s) => s === "Open")
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
    .filter((s) => s === "Close")
    .snapshot1(cloop_prevInnnerStatus)
    .filter((s) => s === "NormalStop")
    .mapTo<InnerStatus>("Boil");
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
  const s_turnOnKeepWarm = turnOnKeepWarm(
    inputs.s_temperatureSensor,
    inputs.s_tick,
  )
    .snapshot1(cloop_prevInnnerStatus)
    .filter((v) => v === "Boil")
    .mapTo<InnerStatus>("KeepWarm");
  const s_newInnnerStatus = s_errorOccured
    .orElse(s_errorRecovered)
    .orElse(s_lidOpen)
    .orElse(s_lidClose)
    .orElse(s_boilButtonClickedAndLidClose)
    .orElse(s_turnOnKeepWarm);

  cloop_prevInnnerStatus.loop(s_newInnnerStatus.hold("NormalStop"));

  const s_newOuterStatus = change(
    s_newInnnerStatus.map<Status>((innerStatus) => {
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
    }),
    "Stop",
  );

  return s_newOuterStatus;
};
