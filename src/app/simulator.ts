import { Cell, CellLoop, Stream, Unit } from "sodiumjs";
import { Duration, Joule, LidState, Water, WaterLevel, Watt } from "./types";

// TODO:
// 水量や熱量などの単位をどうするか
// とりあえず水量はml

type Input = {
  c_waterIn: Cell<boolean>; // 水を入れるかどうか
  s_tick: Stream<Duration>;
  c_heaterPower: Cell<number>; // ヒーターの熱量で単位はW
  c_hotWaterSupply: Cell<boolean>;
  s_lid: Stream<Unit>;
};

type Output = {
  s_temperatureSensor: Stream<number>; // TODO: number -> Temperature
  s_waterLevelSensor: Stream<WaterLevel>;
  s_waterOverflowSensor: Stream<boolean>;
  s_lidStateSensor: Stream<LidState>;
};

export const simulator = ({
  c_waterIn,
  s_lid,
  s_tick,
  c_heaterPower: _c_heaterPower,
  c_hotWaterSupply,
}: Input): Output => {
  const capacity = 2000;
  const actualCapacity = capacity + 200;
  const emitPerSec = 100;
  const pourPerSec = 100;
  const decJoulePerSec = 0.005;
  const c_heaterPower = _c_heaterPower.map((w) =>
    Watt.fromWatt(w - decJoulePerSec),
  );

  const c_lid = s_lid.accum<LidState>("Open", (_, state) =>
    state === "Open" ? "Close" : "Open",
  );
  const s_lidStateSensor = s_tick.snapshot1(c_lid);

  const cloop_water = new CellLoop<Water>();

  const c_inWater = s_tick
    // 蓋があいてるときのみ入れられる
    .gate(c_lid.map((lid) => lid === "Open"))
    .gate(c_waterIn)
    .map((duration) => Water.fromMl(pourPerSec * duration.toSec()))
    // 蓋が開いていないもしくは水を入れていないときには0mLの水を入れる
    .orElse(s_tick.mapTo(Water.fromMl(0)))
    .hold(Water.fromMl(0));

  const c_outMl = s_tick
    .gate(c_hotWaterSupply)
    .map((duration) => emitPerSec * duration.toSec())
    .orElse(s_tick.mapTo(0))
    .hold(0);

  cloop_water.loop(
    s_tick
      .snapshot5(
        cloop_water,
        c_inWater,
        c_outMl,
        c_heaterPower,
        (duration, water, in_water, out_ml, heaterPower) => {
          return Water.merge(in_water, water.emitWater(out_ml))
            .addJoule(heaterPower.toJoule(duration))
            .subJoule(Joule.fromJoule(decJoulePerSec * duration.toSec()));
        },
      )
      .hold(Water.fromL(0)),
  );

  const s_temperatureSensor = s_tick.snapshot(cloop_water, (_, water) => {
    return water.toTemp();
  });

  const s_waterLevelSensor: Stream<WaterLevel> = s_tick.snapshot(
    cloop_water.map((water) => water.toMl()),
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

  const s_waterOverflowSensor = s_tick.snapshot(
    cloop_water.map((water) => water.toMl()),
    (_, amount) => {
      return amount >= actualCapacity - 100;
    },
  );

  return {
    s_temperatureSensor: s_temperatureSensor.map((temp) => temp.toCelsius()), // TODO: remove map
    s_waterLevelSensor,
    s_waterOverflowSensor,
    s_lidStateSensor,
  };
};
