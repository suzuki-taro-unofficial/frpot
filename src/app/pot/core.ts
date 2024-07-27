import {
  Cell,
  CellLoop,
  Operational,
  Stream,
  Transaction,
  Unit,
} from "sodiumjs";
import { BeepType, LidState, WaterLevel } from "../types";
import { KeepWarmMode, Status } from "./types";
import { heaterPower } from "./core/heaterPower";
import { target_temperature } from "./core/target_temperature";
import { status } from "./core/status";
import {
  error_temperature_not_increased,
  error_temperature_too_hight,
} from "./core/error";
import { timer } from "./core/timer";

type Input = {
  // from root
  s_tick: Stream<number>;
  // from simulator
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<WaterLevel>;
  s_waterOverflowSensor: Stream<boolean>;
  s_lidStateSensor: Stream<LidState>;
  // from ui
  s_boilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  c_hotWaterSupplyButtonPushing: Cell<boolean>;
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
  s_beep: Stream<BeepType>;
};

export const core = ({
  s_tick,
  s_temperatureSensor,
  s_waterLevelSensor,
  s_waterOverflowSensor,
  s_lidStateSensor,
  s_boilButtonClicked,
  s_timerButtonClicked,
  s_warmingConfigButtonClicked,
  s_lockButtonClicked,
  c_hotWaterSupplyButtonPushing,
}: Input): Output => {
  const c_temperature = s_temperatureSensor.hold(0);
  const c_waterLevel = s_waterLevelSensor.hold(0);

  const c_warmLevel = keep_warm_mode({
    s_warmingConfigButtonClicked,
  });
  const s_errorTemperatureTooHigh = error_temperature_too_hight({
    s_temperature: s_temperatureSensor,
  });

  const cloop_status = new CellLoop<Status>();
  const c_status: Cell<Status> = cloop_status;

  const c_targetTemperature = target_temperature({
    c_status,
    c_warmLevel,
  });

  const s_errorTemperatureNotIncreased = error_temperature_not_increased({
    s_tick,
    s_temperature: s_temperatureSensor,
    c_targetTemp: c_targetTemperature,
  });

  cloop_status.loop(
    status({
      s_boilButtonClicked,
      s_tick,
      s_lid: s_lidStateSensor,
      s_waterLevelSensor,
      s_temperatureSensor,
      s_waterOverflowSensor,
      s_errorTemperatureTooHigh,
      s_errorTemperatureNotIncreased,
    }).hold("Stop"),
  );

  const c_heaterPower = heaterPower({
    s_waterLevelSensor,
    c_status,
    c_temperature,
    c_targetTemperature,
  });

  const c_lock = lockState({
    s_lockButtonClicked,
  });

  const { c_remainigTime, s_beep: s_timerZero } = timer({
    s_tick,
    s_timerButtonClicked,
  });

  const s_buttonClicked = buttonClicked({
    s_boilButtonClicked,
    s_timerButtonClicked,
    s_warmingConfigButtonClicked,
    s_lockButtonClicked,
    s_hotWaterSupplyButtonClicked: Operational.updates(
      c_hotWaterSupplyButtonPushing,
    )
      .filter((v) => v)
      .mapTo(Unit.UNIT),
  });

  const s_beep = beep({
    s_timer: s_timerZero,
    s_boiled: new Stream(),
    s_buttonClicked,
    s_errorTemperatureTooHigh,
    s_errorTemperatureNotIncreased,
  });

  return {
    // for simulator
    c_heaterPower,
    c_hotWaterSuply: hotWaterSupply({
      s_tick,
      c_lockState: c_lock,
      c_hotWaterSupplyButtonPushing,
    }),
    // for presenter
    c_status,
    c_keepWarmMode: c_warmLevel,
    c_temperature,
    c_waterLevel,
    c_timer: c_remainigTime,
    c_lock,
    s_beep,
  };
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

//ボタンのクリックのストリームを一つにまとめる
type buttonClickedInput = {
  s_boilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

export const buttonClicked = ({
  s_boilButtonClicked,
  s_timerButtonClicked,
  s_warmingConfigButtonClicked,
  s_lockButtonClicked,
  s_hotWaterSupplyButtonClicked,
}: buttonClickedInput): Stream<Unit> => {
  return s_boilButtonClicked
    .mapTo(new Unit())
    .orElse(s_timerButtonClicked.mapTo(new Unit()))
    .orElse(s_warmingConfigButtonClicked.mapTo(new Unit()))
    .orElse(s_lockButtonClicked.mapTo(new Unit()))
    .orElse(s_hotWaterSupplyButtonClicked.mapTo(new Unit()));
};

//ビープストリーム
//beepの実装は検討中
type beepInput = {
  s_errorTemperatureTooHigh: Stream<Unit>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_timer: Stream<Unit>;
  s_buttonClicked: Stream<Unit>;
  s_boiled: Stream<Unit>;
};

export const beep = ({
  s_errorTemperatureTooHigh,
  s_errorTemperatureNotIncreased,
  s_timer,
  s_buttonClicked,
  s_boiled,
}: beepInput): Stream<BeepType> => {
  return s_errorTemperatureNotIncreased
    .mapTo<BeepType>({ kind: "Long" })
    .orElse(s_errorTemperatureTooHigh.mapTo<BeepType>({ kind: "Long" }))
    .orElse(s_timer.mapTo<BeepType>({ kind: "Short", count: 3 }))
    .orElse(s_buttonClicked.mapTo<BeepType>({ kind: "Short", count: 1 }))
    .orElse(s_boiled.mapTo<BeepType>({ kind: "Short", count: 3 }));
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
    c_lockState.loop(
      s_lockButtonClicked
        .snapshot(c_lockState, (_, lockState) => {
          return !lockState;
        })
        .hold(true),
    );
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
