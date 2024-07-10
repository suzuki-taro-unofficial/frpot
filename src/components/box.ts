import { ViewItem } from "./viewItem";

export class Box implements ViewItem<HTMLDivElement> {
  private element: HTMLDivElement;

  constructor() {
    this.element = document.createElement("div");
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
