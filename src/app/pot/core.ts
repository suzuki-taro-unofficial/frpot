import { Cell, Stream, Unit } from "sodiumjs";

type Input = {
  // from root
  s_tick: Stream<Unit>;
  // from simulator
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<0 | 1 | 2 | 3 | 4>;
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
};

export const core = ({}: Input): Output => {
  return {
    // for simulator
    c_heaterPower: new Cell(0),
    c_hotWaterSuply: new Cell(false),
    // for presenter
  };
};

// TODO:
// anyを具体的な型に変更

type TargetTemperatureInput = {
  c_mode: Cell<any>;
  c_warmLevel: Cell<any>;
};

type ErrorTemperatureNotIncreasedInput = {
  s_tick: Stream<Unit>;
  s_temperature: Stream<number>;
  c_mode: Cell<any>;
};

type ErrorTemperatureTooHighInput = {
  s_temperature: Stream<number>;
};

export const target_temperature = (_: TargetTemperatureInput): Cell<number> => {
  return new Cell(0);
};

export const error_temperature_not_increased = (
  _: ErrorTemperatureNotIncreasedInput,
): Stream<Unit> => {
  return new Stream();
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

// Modeは一般的すぎるので、なんか具体的な名前に変えたいが思いつかない
type Mode = "Boil" | "KeepWarm" | "Stop";

type ModeInput = {
  s_temperatureSensor: Stream<number>;
  s_voilButtonClicked: Stream<Unit>;
  s_cover: Stream<Unit>;
  s_waterOverflowSensor: Stream<boolean>;
  s_waterLevelSensor: Stream<0 | 1 | 2 | 3 | 4>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_errorTemperatureTooHigh: Stream<Unit>;
};

export const mode = (_: ModeInput): Stream<Mode> => {
  return new Stream();
};

type KeepWarmMode = "High" | "Economy" | "Milk";

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
  s_tick: Stream<Unit>; // ここのUnitは時刻を表すなにかに変更する
};

export const timer = (_: TimerInput): Stream<number> => {
  return new Stream();
};

//ボタンのクリックのストリームを一つにまとめる
type buttonClickedInput = {
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

export const s_buttonClicked = (_: buttonClickedInput): Stream<Unit> => {
  return new Stream();
};

//ビープストリーム

//ビープの種類のenumを作りたい
type BEEPTYPE = `Long` | `Short`;

//ビープの種類と回数のタプル
const beepOut: [BEEPTYPE, number];

//beepの実装は検討中
type BeepType = LongBeep | ShortBeep;

type LongBeep = {
  kind: "Long";
};

type ShortBeep = {
  kind: "Short";
  count: number;
};

type beepInput = {
  s_error_temperature_too_hight: Stream<boolean>;
  s_error_temperature_not_increased: Stream<boolean>;
  s_timer: Stream<Unit>;
  s_mode: Stream<Mode>;
  s_bottunClicked: Stream<Unit>;
  s_tick: Stream<Unit>;
};

export const s_beep = (_: beepInput): Stream<beepOut> => {
  return new Stream<`Short`, 3>();
};

//ロック状態かどうかを保持するセル
//const c_lockState = new CellLoop<boolean>();
//c_lockState.loop(
//  s_lockButtonClicked.snapshot(
//  ).hold(true),
//);

//給湯のON/OFFを決める
type hotWaterSupplyInput = {
  s_tick: Stream<Unit>;
  c_lockState: Cell<boolean>;
  c_hotWaterSupplyButtonPushing: Cell<boolean>;
};

export const hotWaterSupply = (_: hotWaterSupplyInput): Cell<boolean> => {
  return new Stream<false>();
};

//熱量ストリーム
type heaterPowerInput = {
  s_waterLevelSencor: Stream<WaterLevel>;
  tareget_Temperature: Cell<number>;
};

export const heaterPower = (_: heaterPowerInput): Stream<Number> => {
  return new Stream<100>();
};
