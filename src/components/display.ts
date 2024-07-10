import { Cell, Operational, Transaction } from "sodiumjs";
import { ViewItem } from "./viewItem";

export class Display implements ViewItem<HTMLDivElement> {
  private display: HTMLDivElement;

  constructor(c_content: Cell<string>) {
    this.display = document.createElement("div");

    Transaction.run(() => {
      Operational.value(c_content).listen((content) => {
        this.display.textContent = content;
      });
    });
  }

  getElement() {
    return this.display;
  }

  appendChildren(...cs: ViewItem[]) {
    this.display.append(...cs.map((c) => c.getElement()));
    return this;
  }

  render(t: Element) {
    t.appendChild(this.display);
  }
}
