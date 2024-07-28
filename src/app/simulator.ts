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

  c_lid.listen((s) => console.log("lid: ", s));

  const c_prevTime = s_tick.hold(Date.now());

  const c_amount = new CellLoop<number>();
  c_amount.loop(
    s_tick
      .snapshot6(
        c_prevTime,
        c_amount,
        c_waterIn,
        c_hotWaterSupply,
        c_lid,
        (currTime, prevTime, amount, should_in, should_out, lid) => {
          const in_amount =
            lid == "Open" && should_in
              ? pourPerSec * ((currTime - prevTime) / 1000)
              : 0;
          const out_amount = should_out
            ? -emitPerSec * ((currTime - prevTime) / 1000)
            : 0;
          return amount + in_amount + out_amount;
        },
      )
      .map((amount) => clamp(amount, 0, actualCapacity))
      .hold(0),
  );

  c_amount.listen((amount) => console.log("amount ", amount));

  // 現在の水の温度で単位は°C
  const c_temp = new CellLoop<number>();
  c_temp.loop(
    s_tick
      .snapshot5(
        c_prevTime,
        c_temp,
        c_amount,
        c_heaterPower,
        (currTime, prevTime, temp, amount, power) => {
          const joule = power * ((currTime - prevTime) / 1000);
          if (amount <= 10) {
            // 水の量が極端に少ないなら異常加熱
            return { cond: true, temp: temp + joule }; // TODO: 良い感じの温度変化
          } else {
            return { cond: false, temp: temp + joule / 4.2 / amount };
          }
        },
      )
      .map(({ cond, temp }) => (cond ? temp : temp > 100 ? 100 : temp))
      .hold(0),
  );

  const s_temperatureSensor = s_tick.snapshot(c_temp, (_, temp) => {
    return temp;
  });

  const s_waterLevelSensor: Stream<WaterLevel> = s_tick.snapshot(
    c_amount,
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

  const s_waterOverflowSensor = s_tick.snapshot(c_amount, (_, amount) => {
    return amount >= actualCapacity - 100;
  });

  s_waterOverflowSensor.listen((cond) => console.log(cond));

  return {
    s_temperatureSensor,
    s_waterLevelSensor,
    s_waterOverflowSensor,
    s_lidStateSensor,
  };
};
