import {
  Cell,
  CellLoop,
  Stream,
  StreamSink,
  Transaction,
  Unit,
} from "sodiumjs";

export class Timer {
  public c_seconds: Cell<number> = new Cell(0);
  public s_finished: Stream<Unit> = new Stream();

  constructor(s_add_seconds: Stream<number>) {
    const ssink_oneSecondPassed = new StreamSink<Unit>();

    Transaction.run(() => {
      const cloop_seconds = new CellLoop<number>();
      this.c_seconds = cloop_seconds;
      const cloop_working = new CellLoop<boolean>();
      const s_seconds_is_zero = ssink_oneSecondPassed.gate(
        this.c_seconds.map((s) => s === 0),
      );
      this.s_finished = s_seconds_is_zero.gate(cloop_working);

      cloop_seconds.loop(
        s_add_seconds
          .orElse(ssink_oneSecondPassed.map(() => -1))
          .snapshot(this.c_seconds, (a, b) => a + b)
          .filter((s) => s >= 0)
          .hold(0),
      );

      cloop_working.loop(
        this.s_finished
          .map(() => false)
          .orElse(s_add_seconds.map(() => true))
          .hold(false),
      );
    });

    setInterval(() => ssink_oneSecondPassed.send(Unit.UNIT), 1000);
  }
}
