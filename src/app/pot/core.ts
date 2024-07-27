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
  s_lidStateSensor: Stream<LidState>;
  // from ui
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
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
  return s_errorTemperatureNotIncreased
    .mapTo<beepType>({ kind: "Long" })
    .orElse(s_errorTemperatureTooHigh.mapTo<beepType>({ kind: "Long" }))
    .orElse(s_timer.mapTo<beepType>({ kind: "Short", count: 3 }))
    .orElse(s_buttonClicked.mapTo<beepType>({ kind: "Short", count: 1 }))
    .orElse(s_boiled.mapTo<beepType>({ kind: "Short", count: 3 }));
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
