import { Cell, Operational } from "sodiumjs";
import { ViewItem } from "./viewItem";

export class Lamp implements ViewItem<HTMLDivElement> {
  private lamp: HTMLDivElement;

  constructor(c_isOn: Cell<boolean>) {
    this.lamp = document.createElement("div");

    Operational.value(c_isOn).listen((on) => {
      on ? this.on() : this.off();
    });
  }

  private on() {
    this.lamp.classList.add("lamp-on");
    this.lamp.classList.remove("lamp-off");
  }

  private off() {
    this.lamp.classList.remove("lamp-on");
    this.lamp.classList.add("lamp-off");
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
