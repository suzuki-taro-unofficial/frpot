import { Cell, CellLoop, Stream, Unit } from "sodiumjs";
import { LidState, WaterLevel } from "./types";
import { Time } from "@/util/time";

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

class Water {
  constructor(amount: number, joule: number = 0) {
    this.amount = amount;
    this.joule = joule;
  }

  setSelcius(celsius: number) {
    return new Water(this.amount, celsius * 4.2 * this.amount);
  }

  toTemp(): number {
    const temp = this.joule / 4.2 / this.amount;
    if (Number.isNaN(temp) || !Number.isFinite(temp)) return 0;
    else return temp;
  }

  emitWater(amount: number): Water {
    if (amount > this.amount) amount = this.amount;
    const emit_joule = (amount / this.amount) * this.joule;
    if (Number.isNaN(emit_joule) || !Number.isFinite(emit_joule)) {
      return new Water(this.amount - amount, this.joule);
    } else {
      return new Water(this.amount - amount, this.joule - emit_joule);
    }
  }

  incJoule(delta: number): Water {
    return new Water(
      this.amount,
      Math.min(this.joule + delta, this.amount * 4.2 * 100),
    );
  }

  decJoule(delta: number): Water {
    return new Water(this.amount, Math.max(this.joule - delta, 0));
  }

  getAmount(): number {
    return this.amount;
  }

  static merge(w1: Water, w2: Water): Water {
    return new Water(w1.amount + w2.amount, w1.joule + w2.joule);
  }

  private amount: number;
  private joule: number;
}

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
  const decJoulePerSec = 100;

  const c_lid = s_lid.accum<LidState>("Open", (_, state) =>
    state === "Open" ? "Close" : "Open",
  );
  const s_lidStateSensor = s_tick.snapshot1(c_lid);

  const cloop_water = new CellLoop<Water>();
  cloop_water.loop(
    s_tick
      .snapshot6(
        cloop_water,
        c_waterIn,
        c_hotWaterSupply,
        c_heaterPower,
        c_lid,
        (deltaTime, water, should_in, should_out, power, lid) => {
          const in_water =
            lid == "Open" && should_in
              ? new Water(
                  pourPerSec * Time.ms_to_second(deltaTime),
                  0,
                ).setSelcius(30)
              : new Water(0, 0);
          const out_amount = should_out
            ? emitPerSec * Time.ms_to_second(deltaTime)
            : 0;

          let newWater = Water.merge(water, in_water).emitWater(out_amount);
          newWater = newWater.decJoule(
            decJoulePerSec * Time.ms_to_second(deltaTime),
          );
          newWater = newWater.incJoule(power * Time.ms_to_second(deltaTime));
          return newWater;
        },
      )
      .map((water) => {
        if (water.getAmount() > actualCapacity) {
          return water.emitWater(water.getAmount() - actualCapacity);
        } else {
          return water;
        }
      })
      .hold(new Water(0, 0)),
  );

  const s_temperatureSensor = s_tick
    .snapshot1(cloop_water)
    .map((water) => water.toTemp());

  const s_waterLevelSensor: Stream<WaterLevel> = s_tick
    .snapshot1(cloop_water)
    .map((water) => water.getAmount())
    .map((amount) => {
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
    });

  const s_waterOverflowSensor = s_tick
    .snapshot1(cloop_water)
    .map((water) => water.getAmount())
    .map((amount) => amount >= actualCapacity - 100);

  return {
    s_temperatureSensor,
    s_waterLevelSensor,
    s_waterOverflowSensor,
    s_lidStateSensor,
  };
};
