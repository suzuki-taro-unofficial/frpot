import { Cell, Operational, Transaction } from "sodiumjs";
import { ViewItem } from "./viewItem";
import { css } from "@emotion/css";

const lampStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const liteBaseStyle = css`
  height: 24px;
  width: 24px;
  border-radius: 999px;
`;

const liteOnStyle = css`
  background: lightgreen;
`;

const liteOffStyle = css`
  background: gray;
`;

export class Lamp implements ViewItem<HTMLDivElement> {
  private lamp: HTMLDivElement;
  private lite: HTMLDivElement;

  constructor(label: string, c_isOn: Cell<boolean>) {
    this.lamp = document.createElement("div");
    this.lite = document.createElement("div");

    this.lamp.classList.add(lampStyle);
    this.lite.classList.add(liteBaseStyle);

    this.lamp.append(this.lite, label);

    Transaction.run(() => {
      Operational.value(c_isOn).listen((on) => {
        on ? this.turnOn() : this.turnOff();
      });
    });
  }

  private turnOn() {
    this.lite.classList.add(liteOnStyle);
    this.lite.classList.remove(liteOffStyle);
  }

  private turnOff() {
    this.lite.classList.remove(liteOnStyle);
    this.lite.classList.add(liteOffStyle);
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
