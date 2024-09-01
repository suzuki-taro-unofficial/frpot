import { CellLoop, Stream, Unit } from "sodiumjs";

export class Time {
  static hour_to_ms(h: number): number {
    return h * 60 * 60 * 1000;
  }
  static minute_to_ms(m: number): number {
    return m * 60 * 1000;
  }
  static second_to_ms(s: number): number {
    return s * 1000;
  }
  static ms_to_second(ms: number): number {
    return ms / 1000;
  }
  static ms_to_minute(ms: number): number {
    return ms / 1000 / 60;
  }

  /**
   * 指定したミリ秒が経過する毎に発火するストリームを作る
   * @param ms ミリ秒の指定
   * @param s_tick 経過時間の入力
   * @param [s_forceReset=new Stream()]  経過時間をリセットする
   */
  static ms_passed(
    ms: number,
    s_tick: Stream<number>,
    s_forceReset: Stream<Unit> = new Stream(),
  ): Stream<Unit> {
    const cloop_accumTime = new CellLoop<number>();

    const s_updated = s_tick.snapshot(
      cloop_accumTime,
      (time, accumTime) => time + accumTime,
    );

    const s_msPassed = s_updated
      .filter((updated) => updated >= ms)
      .mapTo(Unit.UNIT);

    cloop_accumTime.loop(
      s_msPassed.orElse(s_forceReset).mapTo(0).orElse(s_updated).hold(0),
    );

    return s_msPassed;
  }
}
