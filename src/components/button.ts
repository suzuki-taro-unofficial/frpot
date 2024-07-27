import { Unit, Stream, StreamSink, Cell } from "sodiumjs";
import { ViewItem } from "./viewItem";

export class Button implements ViewItem<HTMLButtonElement> {
  private button: HTMLButtonElement;
  private ssink_clicked: StreamSink<Unit>;
  private ssink_released: StreamSink<Unit>;

  public s_clicked: Stream<Unit>;
  public s_released: Stream<Unit>;

  public c_pushing: Cell<boolean>;

  constructor(label: string) {
    this.button = document.createElement("button");
    this.button.textContent = label;

    this.ssink_clicked = new StreamSink<Unit>();
    this.s_clicked = this.ssink_clicked;
    this.ssink_released = new StreamSink<Unit>();
    this.s_released = this.ssink_released;

    this.c_pushing = this.s_clicked
      .map(() => true)
      .orElse(this.s_released.map(() => false))
      .hold(false);

    this.button.addEventListener("mousedown", () => {
      this.ssink_clicked.send(Unit.UNIT);
    });
    this.button.addEventListener("mouseup", () => {
      this.ssink_released.send(Unit.UNIT);
    });
  }

  getElement() {
    return this.button;
  }

  appendChildren(...cs: ViewItem[]) {
    this.button.append(...cs.map((c) => c.getElement()));
    return this;
  }

  render(t: Element) {
    t.appendChild(this.button);
    return this;
  }
}
