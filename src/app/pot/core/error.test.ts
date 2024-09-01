import { error_temperature_not_increased } from "./error";
import { Cell, StreamSink, Stream, Transaction, Unit } from "sodiumjs";
import { Time } from "@/util/time";
import { test, expect } from "vitest";
import { LidState } from "@/app/types";

test("temperature increased correctly", () => {
  const s_tick = new StreamSink<number>();
  const s_temperature = new StreamSink<number>();
  const c_targetTemp = new Cell(50);

  const out: Unit[] = [];
  const s_error = Transaction.run(() => {
    return error_temperature_not_increased({
      s_tick,
      s_temperature,
      c_targetTemp,
      s_lid: new Stream(),
    });
  });
  s_error.listen((u) => out.push(u));

  s_temperature.send(20);
  s_tick.send(Time.minute_to_ms(3));

  s_temperature.send(40);
  s_tick.send(Time.minute_to_ms(3));

  s_temperature.send(60);
  s_tick.send(Time.minute_to_ms(3));

  expect(out).toEqual([]);
});

test("temperature doesn't increased correctly", () => {
  const s_tick = new StreamSink<number>();
  const s_temperature = new StreamSink<number>();
  const c_targetTemp = new Cell(50);

  const out: Unit[] = [];
  const s_error = Transaction.run(() => {
    return error_temperature_not_increased({
      s_tick,
      s_temperature,
      c_targetTemp,
      s_lid: new Stream(),
    });
  });
  s_error.listen((u) => out.push(u));

  // まず10度で3分経過させる
  // この時点で温度は10度上がることになるのでエラーは起きない
  s_temperature.send(10);
  s_tick.send(Time.minute_to_ms(1));

  // その後温度を5度下げて3分待つ
  // このときはエラーが発生する
  s_temperature.send(5);
  s_tick.send(Time.minute_to_ms(1));

  expect(out).toEqual([Unit.UNIT]);
});

test("timer reseted while lid opening", () => {
  const s_tick = new StreamSink<number>();
  const s_temperature = new StreamSink<number>();
  const c_targetTemp = new Cell(50);
  const s_lid = new StreamSink<LidState>();

  const out: Unit[] = [];
  const s_error = Transaction.run(() => {
    return error_temperature_not_increased({
      s_tick,
      s_temperature,
      c_targetTemp,
      s_lid,
    });
  });
  s_error.listen((u) => out.push(u));

  // まず1分経過させる
  s_temperature.send(10);
  s_tick.send(Time.minute_to_ms(1));

  // 蓋を開ける
  // このときタイマはリセットされる
  s_lid.send("Open");

  // 蓋が開いているのでタイマは内部的に動かないはず
  // このとき温度が5度下がっているがエラーは発生しないはず
  s_temperature.send(5);
  s_tick.send(Time.minute_to_ms(10));

  // 蓋を閉じる
  // これでタイマが再開する
  s_lid.send("Close");

  // まず10度で1分経過させる
  // この時点で温度は上がることになるのでエラーは起きない
  s_temperature.send(10);
  s_tick.send(Time.minute_to_ms(1));

  // その後温度を5度下げて1分待つ
  // このときはエラーが発生する
  s_temperature.send(5);
  s_tick.send(Time.minute_to_ms(1));

  expect(out).toEqual([Unit.UNIT]);
});
