import { Box } from "./components/box";
import Button from "./components/button";
import { Meter } from "./components/meter";
import { ViewItem } from "./components/viewItem";
import { Timer } from "./timer";

export const app = (): ViewItem => {
  const addMinuteButton = new Button("+1 Minute");
  const s_add_minute = addMinuteButton.s_clicked.map(() => 60);

  const timer = new Timer(s_add_minute);

  timer.s_finished.listen(() => {
    alert("timer is finished!");
  });

  const buttons = new Box().appendChildren(addMinuteButton);
  const meter = new Meter(timer.c_seconds);
  const root = new Box().appendChildren(meter, buttons);

  return root;
};
