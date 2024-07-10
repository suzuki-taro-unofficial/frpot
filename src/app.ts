import { Box } from "./components/box";
import Button from "./components/button";
import { Display } from "./components/display";
import { ViewItem } from "./components/viewItem";

export const app = (): ViewItem => {
  const okButton = new Button("ok");
  const cancelButton = new Button("cancel");

  let c_displayContent = okButton.s_clicked
    .map(() => "OK!")
    .orElse(cancelButton.s_clicked.map(() => "Not OK..."))
    .hold("Not OK...");

  const display = new Display(c_displayContent);

  const buttons = new Box().appendChildren(okButton, cancelButton);
  const root = new Box().appendChildren(display, buttons);

  return root;
};
