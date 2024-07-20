import Button from "@/components/button";
import { ViewItem } from "@/components/viewItem";
import { simulator } from "./simulator";
import { pot } from "./pot/pot";
import { CellLoop, Stream, Unit } from "sodiumjs";

export const app = (): ViewItem => {
  const s_tick = new Stream<Unit>();

  const waterInButton = new Button("水追加");

  const cloop_heaterPower = new CellLoop<number>();
  const cloop_hotWaterSupply = new CellLoop<boolean>();

  const simulator_out = simulator({
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

  const pot_out = pot({
    s_tick,
    ...simulator_out,
    s_voilButtonClicked: voilButton.s_clicked,
    s_timerButtonClicked: timerButton.s_clicked,
    s_warmingConfigButtonClicked: warmingConfigButton.s_clicked,
    s_lockButtonClicked: lockButton.s_clicked,
    s_cover: cover.s_clicked,
    c_hotWarterSupplyButtonPushing: hotWaterSupplyButton.c_pushing,
  });

  cloop_heaterPower.loop(pot_out.c_heaterPower);
  cloop_hotWaterSupply.loop(pot_out.c_hotWaterSuply);

  return new Button("hoge");
};
