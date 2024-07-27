import { Cell, CellLoop, Stream, Transaction, Unit } from "sodiumjs";
import { KeepWarmMode, Status } from "../types";

type TargetTemperatureInput = {
  c_status: Cell<Status>;
  c_warmLevel: Cell<KeepWarmMode>;
};

const target_temperature = ({
  c_status,
  c_warmLevel,
}: TargetTemperatureInput): Cell<number> => {
  return c_status.lift(c_warmLevel, (status, warmLevel): number => {
    switch (status) {
      case "Boil":
        return 100;
      case "KeepWarm":
        switch (warmLevel) {
          case "High":
            return 98;
          case "Economy":
            return 90;
          case "Milk":
            return 60;
        }
      case "Stop":
        return 0; // TODO: 適切な温度は？
    }
  });
};

type ErrorTemperatureNotIncreasedInput = {
  s_tick: Stream<number>;
  s_temperature: Stream<number>;
  c_status: Cell<Status>;
  c_warmLevel: Cell<KeepWarmMode>;
};

// FIXME: 壊れた実装かもしれない
export const error_temperature_not_increased = ({
  s_tick,
  s_temperature,
  c_status,
  c_warmLevel,
}: ErrorTemperatureNotIncreasedInput): Stream<Unit> => {
  return Transaction.run(() => {
    const c_prevTime = new CellLoop<number>();
    const s_oneMinutesPassed = s_tick
      .snapshot(c_prevTime, (currTime, prevTime) => {
        if (currTime - prevTime >= 60 * 1000) {
          return currTime;
        } else {
          return null;
        }
      })
      .filterNotNull() as Stream<number>;
    c_prevTime.loop(s_oneMinutesPassed.hold(Date.now()));

    const c_targetTemp = target_temperature({ c_status, c_warmLevel });
    const c_currTemp = s_temperature.hold(0);
    const c_prevTemp = s_oneMinutesPassed
      .snapshot(c_currTemp, (_, temp) => temp)
      .hold(0);

    return s_tick
      .snapshot4(
        c_currTemp,
        c_prevTemp,
        c_targetTemp,
        (_, currTemp, prevTemp, targetTemp) => {
          return currTemp - 5 <= targetTemp && prevTemp > currTemp;
        },
      )
      .filter((cond) => {
        return cond;
      })
      .mapTo(new Unit());
  });
};

type ErrorTemperatureTooHighInput = {
  s_temperature: Stream<number>;
};

export const error_temperature_too_hight = ({
  s_temperature,
}: ErrorTemperatureTooHighInput): Stream<Unit> => {
  return s_temperature
    .filter((temp) => {
      return temp > 110;
    })
    .map((_) => {
      return new Unit();
    });
};
