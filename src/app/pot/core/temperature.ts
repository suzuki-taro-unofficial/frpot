import { Cell } from "sodiumjs";
import { KeepWarmMode, Status } from "../types";

type TargetTemperatureInput = {
  c_status: Cell<Status>;
  c_warmLevel: Cell<KeepWarmMode>;
};

export const target_temperature = ({
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
