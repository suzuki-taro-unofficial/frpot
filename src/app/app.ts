import { ViewItem } from "@/components/viewItem";
import { simulator } from "./simulator";
import { pot } from "./pot/pot";
import { CellLoop, Stream, Transaction } from "sodiumjs";
import { Button, Display, HStack, Lamp, Meter, VStack } from "@/components";

export const app = (s_tick: Stream<number>): ViewItem => {
  // 入力のユーザインタフェース生成
  const waterInButton = new Button("水追加");
  const lidButtun = new Button("ふた");

  const voilButton = new Button("沸騰");
  const timerButton = new Button("タイマー");
  const warmingConfigButton = new Button("保温設定");
  const lockButton = new Button("解除");
  const lidButton = new Button("ふた");
  const hotWaterSupplyButton = new Button("給湯");

  // ポットのネットワーク全体の構築
  const potOut = Transaction.run(() => {
    const cloop_heaterPower = new CellLoop<number>();
    const cloop_hotWaterSupply = new CellLoop<boolean>();

    const simulatorOut = simulator({
      s_tick,
      c_waterIn: waterInButton.c_pushing.map<number>((cond) =>
        cond ? 100 : 0,
      ),
      c_heaterPower: cloop_heaterPower,
      c_hotWaterSupply: cloop_hotWaterSupply,
      s_lid: lidButtun.s_clicked,
    });

    const potOut = pot({
      s_tick,
      ...simulatorOut,
      s_voilButtonClicked: voilButton.s_clicked,
      s_timerButtonClicked: timerButton.s_clicked,
      s_warmingConfigButtonClicked: warmingConfigButton.s_clicked,
      s_lockButtonClicked: lockButton.s_clicked,
      s_cover: lidButton.s_clicked,
      c_hotWarterSupplyButtonPushing: hotWaterSupplyButton.c_pushing,
    });

    cloop_heaterPower.loop(potOut.c_heaterPower);
    cloop_hotWaterSupply.loop(potOut.c_hotWaterSuply);

    return potOut;
  });

  // 出力のユーザインタフェース生成
  const boilingModeLamp = new Lamp("沸騰", potOut.c_isLitBoilingLamp);
  const warmingModeLamp = new Lamp("保温", potOut.c_isLitWarmingLamp);
  const warmHighLamp = new Lamp("高温", potOut.c_isLitWarmHighLamp);
  const warmSavingLamp = new Lamp("節約", potOut.c_isLitWarmEconomyLamp);
  const warmMilkLamp = new Lamp("ミルク", potOut.c_isLitWarmMilkLamp);
  const temperatureLCD = new Display(potOut.c_temperatureLCD);
  const timerLCD = new Display(potOut.c_timerLCD);
  const waterLevelMeter = new Meter(potOut.c_waterLevelMeter);
  const lockLamp = new Lamp("ロック", potOut.c_isLitLockLamp);

  // ユーザインタフェースの構築
  return new HStack(
    new VStack(waterInButton, lidButtun),
    new VStack(voilButton, timerButton, timerLCD),
    new VStack(
      new HStack(boilingModeLamp, warmingModeLamp),
      new HStack(
        new VStack(
          temperatureLCD,
          new HStack(warmHighLamp, warmMilkLamp, warmSavingLamp),
          warmingConfigButton,
        ),
      ),
    ),
    waterLevelMeter,
    new VStack(hotWaterSupplyButton, lockButton, lockLamp),
  );
};
