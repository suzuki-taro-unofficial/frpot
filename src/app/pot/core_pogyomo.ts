import { Cell, Stream, Unit } from "sodiumjs";

// TODO:
// anyを具体的な型に変更

type TargetTemperatureInput = {
  c_mode: Cell<any>;
  c_warmLevel: Cell<any>;
};

type ErrorTemperatureNotIncreasedInput = {
  s_tick: Stream<Unit>;
  s_temperature: Stream<Unit>;
  c_mode: Cell<any>;
};

type ErrorTemperatureTooHighInput = {
  s_temperature: Stream<number>;
};

export const target_temperature = (_: TargetTemperatureInput): Cell<number> => {
  return new Cell(0);
};

export const error_temperature_not_increased = (
  _: ErrorTemperatureNotIncreasedInput,
): Stream<Unit> => {
  return new Stream();
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
