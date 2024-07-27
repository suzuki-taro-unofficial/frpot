import { Cell, Operational, Transaction } from "sodiumjs";
import { ViewItem } from "./viewItem";
import { css } from "@emotion/css";

const lampBaseStyle = css`
  height: 32px;
  width: 32px;
  border-radius: 999px;
`;

const lampOnStyle = css`
  background: lightgreen;
`;

const lampOffStyle = css`
  background: gray;
`;

export class Lamp implements ViewItem<HTMLDivElement> {
  private lamp: HTMLDivElement;

  constructor(c_isOn: Cell<boolean>) {
    this.lamp = document.createElement("div");
    this.lamp.classList.add(lampBaseStyle);

    Transaction.run(() => {
      Operational.value(c_isOn).listen((on) => {
        on ? this.turnOn() : this.turnOff();
      });
    });
  }

  private turnOn() {
    this.lamp.classList.add(lampOnStyle);
    this.lamp.classList.remove(lampOffStyle);
  }

  private turnOff() {
    this.lamp.classList.remove(lampOnStyle);
    this.lamp.classList.add(lampOffStyle);
  }

  getElement() {
    return this.lamp;
  }

  appendChildren(...cs: ViewItem[]) {
    this.lamp.append(...cs.map((c) => c.getElement()));
    return this;
  }

  render(t: Element) {
    t.appendChild(this.lamp);
  }
}
