import { StreamSink, Transaction, Unit } from "sodiumjs";
import { Time } from "@/util/time";
import { expect, test } from "vitest";

test("Time.ms_passed one time", () => {
  const s_tick = new StreamSink<number>();
  const s_forceReset = new StreamSink<Unit>();

  const out: Unit[] = [];

  Transaction.run(() => {
    const s_msPassed = Time.ms_passed(
      Time.minute_to_ms(3),
      s_tick,
      s_forceReset,
    );
    s_msPassed.listen((u) => out.push(u));
  });

  s_tick.send(Time.minute_to_ms(3));

  expect(out).toEqual([Unit.UNIT]);
});

test("Time.ms_passed multi time", () => {
  const s_tick = new StreamSink<number>();
  const s_forceReset = new StreamSink<Unit>();

  const out: Unit[] = [];

  Transaction.run(() => {
    const s_msPassed = Time.ms_passed(
      Time.minute_to_ms(3),
      s_tick,
      s_forceReset,
    );
    s_msPassed.listen((u) => out.push(u));
  });

  s_tick.send(Time.minute_to_ms(3));
  s_tick.send(Time.minute_to_ms(3));
  s_tick.send(Time.minute_to_ms(3));
  s_tick.send(Time.minute_to_ms(3));

  expect(out).toEqual([Unit.UNIT, Unit.UNIT, Unit.UNIT, Unit.UNIT]);
});

test("Time.ms_passed: フォースリセットが発火するとリセットされる", () => {
  const s_tick = new StreamSink<number>();
  const s_forceReset = new StreamSink<Unit>();

  const out: Unit[] = [];

  Transaction.run(() => {
    const s_msPassed = Time.ms_passed(
      Time.minute_to_ms(3),
      s_tick,
      s_forceReset,
    );
    s_msPassed.listen((u) => out.push(u));
  });

  s_tick.send(Time.minute_to_ms(2));
  s_forceReset.send(Unit.UNIT);
  s_tick.send(Time.minute_to_ms(1));

  expect(out).toEqual([]);
});

test("Time.ms_passed: フォースリセットが発火するとリセットされる2", () => {
  const s_tick = new StreamSink<number>();
  const s_forceReset = new StreamSink<Unit>();

  const out: Unit[] = [];

  Transaction.run(() => {
    const s_msPassed = Time.ms_passed(
      Time.minute_to_ms(3),
      s_tick,
      s_forceReset,
    );
    s_msPassed.listen((u) => out.push(u));
  });

  s_tick.send(Time.minute_to_ms(2));
  s_forceReset.send(Unit.UNIT);
  s_tick.send(Time.minute_to_ms(3));

  expect(out).toEqual([Unit.UNIT]);
});
