import { StreamSink } from "sodiumjs";
import { expect, test } from "vitest";
import { change } from "./change";

test("change", () => {
  const s_a = new StreamSink<number>();

  const s_change = change(s_a, 0);

  const out: number[] = [];
  s_change.listen((n) => out.push(n));

  s_a.send(1);
  s_a.send(1);
  s_a.send(1);
  s_a.send(2);
  s_a.send(2);
  s_a.send(1);
  s_a.send(0);

  expect(out).toEqual([1, 2, 1, 0]);
});
