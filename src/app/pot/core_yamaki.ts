import { Cell, Cellloop, Stream, Unit } from "sodiumjs";

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
