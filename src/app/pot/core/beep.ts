import { BeepType } from "@/app/types";
import { Stream, Unit } from "sodiumjs";

//ボタンのクリックのストリームを一つにまとめる
type buttonClickedInput = {
  s_boilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

const buttonClicked = ({
  s_boilButtonClicked,
  s_timerButtonClicked,
  s_warmingConfigButtonClicked,
  s_lockButtonClicked,
  s_hotWaterSupplyButtonClicked,
}: buttonClickedInput): Stream<Unit> => {
  return s_boilButtonClicked
    .orElse(s_timerButtonClicked)
    .orElse(s_warmingConfigButtonClicked)
    .orElse(s_lockButtonClicked)
    .orElse(s_hotWaterSupplyButtonClicked);
};

//ビープストリーム
//beepの実装は検討中
type beepInput = {
  s_errorTemperatureTooHigh: Stream<Unit>;
  s_errorTemperatureNotIncreased: Stream<Unit>;
  s_timer: Stream<Unit>;
  s_boiled: Stream<Unit>;
  s_boilButtonClicked: Stream<Unit>;
  s_timerButtonClicked: Stream<Unit>;
  s_warmingConfigButtonClicked: Stream<Unit>;
  s_lockButtonClicked: Stream<Unit>;
  s_hotWaterSupplyButtonClicked: Stream<Unit>;
};

export const beep = ({
  s_errorTemperatureTooHigh,
  s_errorTemperatureNotIncreased,
  s_timer,
  s_boilButtonClicked,
  s_timerButtonClicked,
  s_warmingConfigButtonClicked,
  s_lockButtonClicked,
  s_hotWaterSupplyButtonClicked,
  s_boiled,
}: beepInput): Stream<BeepType> => {
  const s_buttonClicked = buttonClicked({
    s_boilButtonClicked,
    s_timerButtonClicked,
    s_warmingConfigButtonClicked,
    s_lockButtonClicked,
    s_hotWaterSupplyButtonClicked,
  });

  return s_errorTemperatureNotIncreased
    .mapTo<BeepType>({ kind: "Long" })
    .orElse(s_errorTemperatureTooHigh.mapTo<BeepType>({ kind: "Long" }))
    .orElse(s_timer.mapTo<BeepType>({ kind: "Short", count: 3 }))
    .orElse(s_buttonClicked.mapTo<BeepType>({ kind: "Short", count: 1 }))
    .orElse(s_boiled.mapTo<BeepType>({ kind: "Short", count: 3 }));
};
