import { WaterLevel } from "@/app/types";
import { Cell, Stream } from "sodiumjs";
import { Status } from "../types";

//熱量ストリーム
type heaterPowerInput = {
  s_waterLevelSensor: Stream<WaterLevel>;
  c_targetTemperature: Cell<number>;
  c_status: Cell<Status>;
  c_temperature: Cell<number>;
};

export const heaterPower = ({
  s_waterLevelSensor,
  c_targetTemperature,
  c_status,
  c_temperature,
}: heaterPowerInput): Cell<number> => {
  return s_waterLevelSensor
    .snapshot4(
      c_targetTemperature,
      c_status,
      c_temperature,
      (waterLevel, targetTemperature, status, temperature) => {
        switch (status) {
          case "Boil":
            return 5000;
          case "KeepWarm": {
            if (targetTemperature - temperature < 0) return 0;
            switch (waterLevel) {
              case 0:
                return 0;
              case 1:
                return (targetTemperature - temperature) ** 2 * 5;
              case 2:
                return (targetTemperature - temperature) ** 2 * 10;
              case 3:
                return (targetTemperature - temperature) ** 2 * 15;
              case 4:
                return (targetTemperature - temperature) ** 2 * 20;
              default:
                return 0;
            }
          }
          case "Stop":
            return 0;
        }
      },
    )
    .hold(0);
};
