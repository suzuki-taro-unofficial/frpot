import { Cell, CellLoop, Stream, Unit } from "sodiumjs";

type Input = {
  c_waterIn: Cell<number>;
  s_tick: Stream<Unit>;
  c_heaterPower: Cell<number>;
  c_hotWaterSupply: Cell<boolean>;
};

type WaterLevel = 0 | 1 | 2 | 3 | 4;

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
  const maxAmount: number = 2000;

  const c_amount: CellLoop<number> = new CellLoop();
  c_amount.loop(
    s_tick
      .snapshot4(
        c_amount,
        c_waterIn,
        c_hotWaterSupply,
        (_u, amount, in_amount, should_out) => {
          return amount + in_amount + (should_out ? -1 : 0);
        },
      )
      .hold(0),
  );

  const c_temp: CellLoop<number> = new CellLoop();
  c_temp.loop(
    s_tick
      .snapshot4(
        c_temp,
        c_amount,
        c_heaterPower,
        (_u, temp, _amount, power) => {
          return temp + power;
        },
      )
      .hold(0),
  );

  const s_temperatureSensor = s_tick.snapshot(c_temp, (_u, temp) => {
    return temp;
  });

  const s_waterLevelSensor: Stream<WaterLevel> = s_tick.snapshot(
    c_amount,
    (_u, amount) => {
      if (4 * amount < maxAmount) {
        return 0;
      } else if (4 * amount < 2 * maxAmount) {
        return 1;
      } else if (4 * amount < 3 * maxAmount) {
        return 2;
      } else if (amount < maxAmount) {
        return 3;
      } else {
        return 4;
      }
    },
  );

  const s_waterOverflowSensor = s_tick.snapshot(c_amount, (_u, amount) => {
    return amount > maxAmount + 100;
  });

  return {
    s_temperatureSensor,
    s_waterLevelSensor,
    s_waterOverflowSensor,
  };
};
