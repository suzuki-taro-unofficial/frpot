import { Cell, CellLoop, Stream, Unit } from "sodiumjs";
import { LidState, WaterLevel } from "./types";

// TODO:
// 水量や熱量などの単位をどうするか
// とりあえず水量はml

type Input = {
  c_waterIn: Cell<boolean>; // 水を入れるかどうか
  s_tick: Stream<number>;
  c_heaterPower: Cell<number>; // ヒーターの熱量で単位はW
  c_hotWaterSupply: Cell<boolean>;
  s_lid: Stream<Unit>;
};

type Output = {
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<WaterLevel>;
  s_waterOverflowSensor: Stream<boolean>;
  s_lidStateSensor: Stream<LidState>;
};

const clamp = (v: number, l: number, r: number): number => {
  if (v < l) {
    return l;
  } else if (v > r) {
    return r;
  } else {
    return v;
  }
};

export const simulator = ({
  c_waterIn,
  s_lid,
  s_tick,
  c_heaterPower,
  c_hotWaterSupply,
}: Input): Output => {
  const capacity = 2000;
  const actualCapacity = capacity + 200;
  const emitPerSec = 100;
  const pourPerSec = 100;

  const c_lid = s_lid.accum<LidState>("Open", (_, state) =>
    state === "Open" ? "Close" : "Open",
  );
  const s_lidStateSensor = s_tick.snapshot1(c_lid);

  const cloop_amount = new CellLoop<number>();
  cloop_amount.loop(
    s_tick
      .snapshot5(
        cloop_amount,
        c_waterIn,
        c_hotWaterSupply,
        c_lid,
        (deltaTime, amount, should_in, should_out, lid) => {
          const in_amount =
            lid == "Open" && should_in ? pourPerSec * (deltaTime / 1000) : 0;
          const out_amount = should_out ? -emitPerSec * (deltaTime / 1000) : 0;
          return amount + in_amount + out_amount;
        },
      )
      .map((amount) => clamp(amount, 0, actualCapacity))
      .hold(0),
  );

  // 現在の水の温度で単位は°C
  const cloop_temp = new CellLoop<number>();
  cloop_temp.loop(
    s_tick
      .snapshot4(
        cloop_temp,
        cloop_amount,
        c_heaterPower,
        (deltaTime, temp, amount, power) => {
          temp -= 0.1 * (deltaTime / 1000);
          temp = Math.max(temp, 0);

          const joule = power * (deltaTime / 1000);
          if (amount <= 10) {
            // 水の量が極端に少ないなら異常加熱
            return { cond: true, temp: temp + joule }; // TODO: 良い感じの温度変化
          } else {
            return { cond: false, temp: temp + joule / 4.2 / amount };
          }
        },
      )
      .map(({ cond, temp }) => (cond ? temp : temp > 100 ? 100 : temp))
      .hold(80),
  );

  const s_temperatureSensor = s_tick.snapshot(cloop_temp, (_, temp) => {
    return temp;
  });

  const s_waterLevelSensor: Stream<WaterLevel> = s_tick.snapshot(
    cloop_amount,
    (_, amount) => {
      if (4 * amount < capacity) {
        return 0;
      } else if (4 * amount < 2 * capacity) {
        return 1;
      } else if (4 * amount < 3 * capacity) {
        return 2;
      } else if (amount < capacity) {
        return 3;
      } else {
        return 4;
      }
    },
  );

  const s_waterOverflowSensor = s_tick.snapshot(cloop_amount, (_, amount) => {
    return amount >= actualCapacity - 100;
  });

  return {
    s_temperatureSensor,
    s_waterLevelSensor,
    s_waterOverflowSensor,
    s_lidStateSensor,
  };
};
