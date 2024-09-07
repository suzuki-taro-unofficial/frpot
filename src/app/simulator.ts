import { Cell, CellLoop, Stream, Unit } from "sodiumjs";
import { LidState, WaterLevel } from "./types";
import { clamp } from "@/util/util";
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
  const decJoulePerSec = 1 / 180;

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
            lid == "Open" && should_in
              ? pourPerSec * Time.ms_to_second(deltaTime)
              : 0;
          const out_amount = should_out
            ? -emitPerSec * Time.ms_to_second(deltaTime)
            : 0;
          return amount + in_amount + out_amount;
        },
      )
      .map((amount) => clamp(amount, 0, actualCapacity))
      .hold(0),
  );

  // 現在のポットの熱量
  const cloop_joule = new CellLoop<number>();
  cloop_joule.loop(
    s_tick
      .snapshot5(
        cloop_amount,
        cloop_joule,
        c_hotWaterSupply,
        c_heaterPower,
        (deltaTime, amount, joule, should_out, power) => {
          const maxJoule = amount * 100 * 4.2;
          joule -= decJoulePerSec * Time.ms_to_second(deltaTime);
          joule += power * Time.ms_to_second(deltaTime);
          joule = Math.min(joule, maxJoule);
          joule = Math.max(joule, 0);

          const out_amount = should_out
            ? emitPerSec * Time.ms_to_second(deltaTime)
            : 0;
          const out_joule = (joule * out_amount) / amount;
          if (!Number.isNaN(out_joule) && Number.isFinite(out_joule))
            joule -= (joule * out_amount) / amount;

          return joule;
        },
      )
      .hold(0),
  );

  const s_temperatureSensor = s_tick.snapshot3(
    cloop_joule,
    cloop_amount,
    (_, joule, amount) => {
      const temp = joule / 4.2 / amount;
      if (!Number.isFinite(temp) || Number.isNaN(temp)) {
        return 0;
      } else {
        return temp;
      }
    },
  );

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
