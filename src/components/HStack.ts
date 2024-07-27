import { css } from "@emotion/css";
import { ViewItem } from "./viewItem";

const style = css`
  display: flex;
  flex-direction: row;
  gap: 40px;
`;

export class HStack implements ViewItem<HTMLDivElement> {
  private div: HTMLDivElement;

  constructor(...children: ViewItem[]) {
    this.div = document.createElement("div");
    this.div.classList.add(style);
    this.appendChildren(...children);
  }

  getElement() {
    return this.div;
  }

  appendChildren(...cs: ViewItem[]) {
    this.div.append(...cs.map((c) => c.getElement()));
    return this;
  }

  render(t: Element) {
    t.appendChild(this.div);
  }
}
