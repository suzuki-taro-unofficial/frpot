import { Box } from "./components/box";
import Button from "./components/button";
import { Meter } from "./components/meter";
import { ViewItem } from "./components/viewItem";

export const app = (): ViewItem => {
  const countUpButton = new Button("Count up");
  const countDownButton = new Button("Count down");

  const s_minus = countUpButton.s_clicked.map(() => 1);
  const s_plus = countDownButton.s_clicked.map(() => -1);
  const s_delta = s_minus.orElse(s_plus);

  const count = s_delta.accum(0, (a, b) => a + b);

  const buttons = new Box().appendChildren(countUpButton, countDownButton);
  const meter = new Meter(count);
  const root = new Box().appendChildren(meter, buttons);

  return root;
};
