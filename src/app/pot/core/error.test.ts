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

  const s_error = Transaction.run(() => {
    return error_temperature_not_increased({
      s_tick,
      s_temperature,
      c_targetTemp,
    });
  });

  const c_error_happen = s_error.mapTo(true).hold(false);
  c_error_happen.listen((cond) => expect(!cond, "error happen").toBeTruthy());

  s_temperature.send(20);
  s_tick.send(s_to_ms(60));

  s_temperature.send(40);
  s_tick.send(s_to_ms(60));

  s_temperature.send(60);
  s_tick.send(s_to_ms(60));
});

test("temperature doesn't increased correctly", () => {
  const s_tick = new StreamSink<number>();
  const s_temperature = new StreamSink<number>();
  const c_targetTemp = new Cell(50);

  const s_error = Transaction.run(() => {
    return error_temperature_not_increased({
      s_tick,
      s_temperature,
      c_targetTemp,
    });
  });

  const s_check = new StreamSink<Unit>();
  const c_error_happen = s_error.mapTo(true).hold(false);
  s_check
    .snapshot1(c_error_happen)
    .listen((cond) => expect(cond, "error doesn't happen").toBeTruthy());

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

  s_check.send(Unit.UNIT);
});
