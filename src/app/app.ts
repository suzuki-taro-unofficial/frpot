import { ViewItem } from "@/components/viewItem";
import { simulator } from "./simulator";
import { pot } from "./pot/pot";
import { CellLoop, Stream, Transaction } from "sodiumjs";
import { Box, Button, Display, Lamp, Meter } from "@/components";

export const app = (s_tick: Stream<number>): ViewItem => {
  // 入力のユーザインタフェース生成
  const waterInButton = new Button("水追加");
  const voilButton = new Button("沸騰");
  const timerButton = new Button("タイマー");
  const warmingConfigButton = new Button("保温設定");
  const lockButton = new Button("解除");
  const cover = new Button("ふた");
  const hotWaterSupplyButton = new Button("給湯");

  // ポットのネットワーク全体の構築
  const potOut = Transaction.run(() => {
    const cloop_heaterPower = new CellLoop<number>();
    const cloop_hotWaterSupply = new CellLoop<boolean>();

    const simulatorOut = simulator({
      s_tick,
      c_waterIn: waterInButton.c_pushing.map(() => 100),
      c_heaterPower: cloop_heaterPower,
      c_hotWaterSupply: cloop_hotWaterSupply,
    });

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

    return potOut;
  });

  // 出力のユーザインタフェース生成
  const boilingModeLamp = new Lamp(potOut.c_isLitBoilingLamp);
  const warmingModeLamp = new Lamp(potOut.c_isLitWarmingLamp);
  const warmHighLamp = new Lamp(potOut.c_isLitWarmHighLamp);
  const warmSavingLamp = new Lamp(potOut.c_isLitWarmEconomyLamp);
  const warmMilkLamp = new Lamp(potOut.c_isLitWarmMilkLamp);
  const temperatureLCD = new Display(potOut.c_temperatureLCD);
  const timerLCD = new Display(potOut.c_timerLCD);
  const waterLevelMeter = new Meter(potOut.c_waterLevelMeter);

  // ユーザインタフェースの構築
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
