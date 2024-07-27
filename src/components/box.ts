import { ViewItem } from "./viewItem";

export class Box implements ViewItem<HTMLDivElement> {
  private element: HTMLDivElement;

  constructor(...children: ViewItem[]) {
    this.element = document.createElement("div");
    this.appendChildren(...children);
  }

  getElement() {
    return this.element;
  }

  appendChildren(...c: ViewItem[]) {
    this.element.append(...c.map((c) => c.getElement()));
    return this;
  }

  render(t: Element) {
    t.append(this.element);
  }
}
