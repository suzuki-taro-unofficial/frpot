import Button from "@/components/button";
import { ViewItem } from "@/components/viewItem";
import { simulator } from "./simulator";
import { pot } from "./pot/pot";
import { CellLoop, Stream } from "sodiumjs";
import { Lamp } from "@/components/lamp";
import { Display } from "@/components/display";
import { Meter } from "@/components/meter";
import { Box } from "@/components/box";

export const app = (s_tick: Stream<number>): ViewItem => {
  const waterInButton = new Button("水追加");

  const cloop_heaterPower = new CellLoop<number>();
  const cloop_hotWaterSupply = new CellLoop<boolean>();

  const simulatorOut = simulator({
    s_tick,
    c_waterIn: waterInButton.c_pushing.map(() => 100),
    c_heaterPower: cloop_heaterPower,
    c_hotWaterSupply: cloop_hotWaterSupply,
  });

  const voilButton = new Button("沸騰");
  const timerButton = new Button("タイマー");
  const warmingConfigButton = new Button("保温設定");
  const lockButton = new Button("解除");
  const cover = new Button("ふた");
  const hotWaterSupplyButton = new Button("給湯");

  const potOut = pot({
    s_tick,
    ...simulatorOut,
    s_voilButtonClicked: voilButton.s_clicked,
    s_timerButtonClicked: timerButton.s_clicked,
    s_warmingConfigButtonClicked: warmingConfigButton.s_clicked,
    s_lockButtonClicked: lockButton.s_clicked,
    s_cover: cover.s_clicked,
    c_hotWarterSupplyButtonPushing: hotWaterSupplyButton.c_pushing,
  });

  cloop_heaterPower.loop(potOut.c_heaterPower);
  cloop_hotWaterSupply.loop(potOut.c_hotWaterSuply);

  const boilingModeLamp = new Lamp(potOut.c_isLitboilingModeLamp);
  const warmingModeLamp = new Lamp(potOut.c_isLitWarmingModeLamp);
  const warmHighLamp = new Lamp(potOut.c_isLitWarmHighLamp);
  const warmSavingLamp = new Lamp(potOut.c_isLitWarmSavingsLamp);
  const warmMilkLamp = new Lamp(potOut.c_isLitWarmMilkLamp);
  const temperatureLCD = new Display(potOut.c_temperatureLCD);
  const timerLCD = new Display(potOut.c_timerLCD);
  const waterLevelMeter = new Meter(potOut.c_waterLevelMeter);

  return new Box(
    new Box(boilingModeLamp, warmingModeLamp),
    new Box(
      temperatureLCD,
      new Box(warmHighLamp, warmMilkLamp, warmSavingLamp),
    ),
    timerLCD,
    waterLevelMeter,
  );
};
