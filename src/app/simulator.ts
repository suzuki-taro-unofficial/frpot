import { Cell, CellLoop, Stream } from "sodiumjs";
import { WaterLevel } from "./types";

// TODO:
// 水量や熱量などの単位をどうするか
// とりあえず水量はml

type Input = {
  c_waterIn: Cell<number>; // tick事に何mlの水が来るか
  s_tick: Stream<number>;
  c_heaterPower: Cell<number>; // ヒーターの熱量で単位はW
  c_hotWaterSupply: Cell<boolean>;
};

type Output = {
  s_temperatureSensor: Stream<number>;
  s_waterLevelSensor: Stream<WaterLevel>;
  s_waterOverflowSensor: Stream<boolean>;
};

export const simulator = ({
  c_waterIn,
  s_tick,
  c_heaterPower,
  c_hotWaterSupply,
}: Input): Output => {
  const capacity = 2000;
  const actualCapacity = capacity + 200;
  const emitPerSec = 10;

  const c_prevTime = s_tick.hold(Date.now());

  const c_amount = new CellLoop<number>();
  c_amount.loop(
    s_tick
      .snapshot5(
        c_prevTime,
        c_amount,
        c_waterIn,
        c_hotWaterSupply,
        (currTime, prevTime, amount, in_amount, should_out) => {
          return (
            amount +
            in_amount +
            (should_out ? -emitPerSec * (currTime - prevTime) : 0)
          );
        },
      )
      .filter((new_amount) => new_amount <= actualCapacity)
      .hold(0),
  );

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
          const joule = power * (currTime - prevTime);
          return temp + joule / 4.2 / amount;
        },
      )
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
    return amount > actualCapacity;
  });

  return {
    s_temperatureSensor,
    s_waterLevelSensor,
    s_waterOverflowSensor,
  };
};
