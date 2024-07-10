import { Cell, Stream, Unit } from "sodiumjs";

export type WaterLevel = 0 | 1 | 2 | 3 | 4;

export type Context = {
  button: {
    input: {
      s_keepWarmSettingButtonPushed: Stream<Unit>;
      s_boilingButtonPushed: Stream<Unit>;
      c_hotWaterButtonIsPushing: Cell<boolean>;
      s_releaseButtonPushed: Stream<Unit>;
      s_timerButtonPushed: Stream<Unit>;
    };
  };
  meter: {
    input: {
      c_waterLevelMeter: Cell<Number>;
    };
  };
  sensor: {
    input: {
      c_fullWaterSensorIsOn: Cell<boolean>;
      c_waterLevelSensor: Cell<WaterLevel>;
      c_waterTemperatureSensor: Cell<Number>;
      c_coverIsOpening: Cell<boolean>;
      c_coverIsClosing: Cell<boolean>;
    };
  };
};
