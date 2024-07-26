import { Cell, Cellloop, Stream, Unit } from "sodiumjs";

//ボタンのクリックのストリームを一つにまとめる
type const buttonClickedInput = {
  s_voilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

export const s_buttonClicked =(_: buttonClickedInput): Stream<Unit> => {
  return new Stream();
}

//ビープストリーム

//ビープの種類のenumを作りたい
type BEEPTYPE = `Long` | `Short`;
//ビープの種類と回数のタプル
const beepOut: [BEEPTYPE, number];

type beepInput = {
  s_error_temperature_too_hight: Stream<boolean>;
  s_error_temperature_not_increased: Stream<boolean>;
  s_timer: Stream<Unit>;
  s_mode: Stream<Mode>;
  s_bottunClicked: Stream<Unit>;
  s_tick: Stream<Unit>;
};

export const s_beep = (_: beepInput): Stream<beepOut> => {
  return new Stream<Short, 3>;
}

//水量を決めるストリーム
type hotWatterSupplyInput = {
  s_lockButtonClicked: Stream<Unit>;
  c_hotWaterSupplyButtonPushing: Cell<boolean>;
};

export const s_hotWaterSupply = (_: hotWatterSupplyInput): Stream<boolean> => {
  return new Stream<false>;
}

//熱量ストリーム
type heaterPowerInput = {
  s_waterLevelSencor: Stream<WaterLevel>;
  tareget_Temperature: Cell<number>;
};

export s_heaterPower = (_: heaterPowerInput): Stream<Number> => {
  return new Stream<100>;
}


