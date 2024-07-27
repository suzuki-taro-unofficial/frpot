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
    const c_previousTime = inputs.s_tick.hold(0);
    // 経過時間はマイナスの値を持つ
    const s_erapsed = inputs.s_tick.snapshot<number, number>(
      c_previousTime,
      (newTime, prevTime) => prevTime - newTime,
    );
    const s_add = inputs.s_timerButtonClicked.mapTo(60 * 1000);
    const c_remainigTime = new CellLoop<number>();
    const s_newTime = s_erapsed
      .merge(s_add, (a, b) => a + b)
      .snapshot(c_remainigTime, (delta, remaining) => {
        return Math.max(0, remaining - delta);
      });
    c_remainigTime.loop(s_newTime.hold(0));
    const s_beep = s_newTime
      .snapshot(c_remainigTime, (newTime, remaining) => {
        return { newTime, remaining };
      })
      .filter(({ newTime, remaining }) => newTime === 0 && remaining > 0) // 残り時間が0になった最初の論理的時刻のみ通す
      .mapTo(new Unit());
    return {
      c_remainigTime: c_remainigTime.map((time) => time / 1000 / 60),
      s_beep: s_beep,
    };
  });
};
