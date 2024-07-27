import { Cell, Operational, Transaction } from "sodiumjs";
import { ViewItem } from "./viewItem";
import { css } from "@emotion/css";

const meterStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const meterLevelBaseStyle = css`
  height: 50px;
  width: 20px;
  border: solid 1px #444444;
`;

const meterLevelLitStyle = css`
  background: rightblue;
`;

export class Meter implements ViewItem<HTMLDivElement> {
  private meter: HTMLDivElement;
  private meterLevel1: HTMLDivElement;
  private meterLevel2: HTMLDivElement;
  private meterLevel3: HTMLDivElement;
  private meterLevel4: HTMLDivElement;

  constructor(c_percentage: Cell<0 | 1 | 2 | 3 | 4>) {
    this.meter = document.createElement("div");
    this.meter.className = meterStyle;
    this.meterLevel1 = document.createElement("div");
    this.meterLevel2 = document.createElement("div");
    this.meterLevel3 = document.createElement("div");
    this.meterLevel4 = document.createElement("div");
    this.meterLevel1.classList.add(meterLevelBaseStyle);
    this.meterLevel2.classList.add(meterLevelBaseStyle);
    this.meterLevel3.classList.add(meterLevelBaseStyle);
    this.meterLevel4.classList.add(meterLevelBaseStyle);

    this.meter.append(
      this.meterLevel4,
      this.meterLevel3,
      this.meterLevel2,
      this.meterLevel1,
    );

    Transaction.run(() => {
      Operational.value(c_percentage).listen((percentage) => {
        this.changeMeter(percentage);
      });
    });
  }

  private changeMeter(level: 0 | 1 | 2 | 3 | 4) {
    level >= 1
      ? this.meterLevel1.classList.add(meterLevelLitStyle)
      : this.meterLevel1.classList.remove(meterLevelLitStyle);
    level >= 2
      ? this.meterLevel2.classList.add(meterLevelLitStyle)
      : this.meterLevel2.classList.remove(meterLevelLitStyle);
    level >= 3
      ? this.meterLevel3.classList.add(meterLevelLitStyle)
      : this.meterLevel3.classList.remove(meterLevelLitStyle);
    level === 4
      ? this.meterLevel4.classList.add(meterLevelLitStyle)
      : this.meterLevel4.classList.remove(meterLevelLitStyle);
  }

  getElement() {
    return this.meter;
  }

  appendChildren(...cs: ViewItem[]) {
    this.meter.append(...cs.map((c) => c.getElement()));
    return this;
  }

  render(t: Element) {
    t.appendChild(this.meter);
  }
}
