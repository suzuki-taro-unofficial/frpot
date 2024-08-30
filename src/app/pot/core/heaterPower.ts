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
  const s_whenBoil = s_waterLevelSensor
    .gate(c_status.map((s) => s === "Boil"))
    .mapTo(1000);

  const s_whenKeepWarm = s_waterLevelSensor
    .gate(c_status.map((s) => s === "KeepWarm"))
    .snapshot3(
      c_targetTemperature,
      c_temperature,
      (waterLevel, targetTemperature, temperature) => {
        if (targetTemperature - temperature < -0.5) return 0;
        switch (waterLevel) {
          case 0:
            return 0;
          case 1:
            return (targetTemperature - temperature + 0.5) ** 2 * 50;
          case 2:
            return (targetTemperature - temperature + 0.5) ** 2 * 100;
          case 3:
            return (targetTemperature - temperature + 0.5) ** 2 * 150;
          case 4:
            return (targetTemperature - temperature + 0.5) ** 2 * 200;
          default:
            return 0;
        }
      },
    )
    .map((power) => Math.min(power, 1000));

  const s_whenStop = s_waterLevelSensor
    .gate(c_status.map((s) => s === "Stop"))
    .mapTo(0);

  return s_whenBoil.orElse(s_whenKeepWarm).orElse(s_whenStop).hold(0);
};
