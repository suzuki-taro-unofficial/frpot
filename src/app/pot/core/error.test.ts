import { expect, test } from "vitest";
import { error_temperature_not_increased } from "./error";
import { Cell, StreamSink, Transaction, Unit } from "sodiumjs";

const s_to_ms = (s: number): number => {
  return s * 1000;
};

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
    });
  });
  s_error.listen((u) => out.push(u));

  s_temperature.send(20);
  s_tick.send(s_to_ms(60));

  s_temperature.send(40);
  s_tick.send(s_to_ms(60));

  s_temperature.send(60);
  s_tick.send(s_to_ms(60));

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
    });
  });
  s_error.listen((u) => out.push(u));

  // まず10度で3分経過させる
  // この時点で温度は10度上がることになるのでエラーは起きない
  s_temperature.send(10);
  s_tick.send(s_to_ms(60));
  s_temperature.send(10);
  s_tick.send(s_to_ms(60));
  s_temperature.send(10);
  s_tick.send(s_to_ms(60));

  // その後温度を5度下げて3分待つ
  // このときはエラーが発生する
  s_temperature.send(5);
  s_tick.send(s_to_ms(60));
  s_temperature.send(5);
  s_tick.send(s_to_ms(60));
  s_temperature.send(5);
  s_tick.send(s_to_ms(60));

  expect(out).toEqual([Unit.UNIT]);
});
