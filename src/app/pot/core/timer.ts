import { Time } from "@/util/time";
import { Cell, CellLoop, Stream, Transaction, Unit } from "sodiumjs";

type TimerInput = {
  s_timerButtonClicked: Stream<Unit>;
  s_tick: Stream<number>;
};

type TimerOutput = {
  c_remainigTime: Cell<number>; // 単位は分
  s_beep: Stream<Unit>;
};

export const timer = (inputs: TimerInput): TimerOutput => {
  return Transaction.run(() => {
    const s_add = inputs.s_timerButtonClicked.mapTo(Time.minute_to_ms(1));
    const c_remainigTime = new CellLoop<number>();
    const s_newTime = inputs.s_tick
      .merge(s_add, (elapsedTime, add) => add - elapsedTime)
      .snapshot(c_remainigTime, (delta, remaining) => {
        return Math.max(0, remaining + delta) % Time.hour_to_ms(1); // 最大1時間
      });
    c_remainigTime.loop(s_newTime.hold(0));
    const s_beep = s_newTime
      .snapshot(c_remainigTime, (newTime, remaining) => {
        return { newTime, remaining };
      })
      .filter(({ newTime, remaining }) => newTime === 0 && remaining > 0) // 残り時間が0になった最初の論理的時刻のみ通す
      .mapTo(new Unit());
    return {
      c_remainigTime: c_remainigTime.map((time) =>
        Math.ceil(Time.ms_to_minute(time)),
      ),
      s_beep: s_beep,
    };
  });
};
