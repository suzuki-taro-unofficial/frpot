import { Cell, Operational, Transaction } from "sodiumjs";
import { ViewItem } from "./viewItem";
import { css, injectGlobal } from "@emotion/css";

const meterStyle = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const meterLevelStyle = css`
  display: flex;
  align-items: end;
  height: 50px;
  width: 20px;
  background-color: #999999;
  border: solid 1px #444444;
`;

const meterLevelInnserStyle = css`
  height: attr(data-percentage %);
  width: 100%;
  background-color: #449944;
`;

injectGlobal`
[data-percentage="1"] {
  height: 4%;
}
[data-percentage="2"] {
  height: 8%;
}
[data-percentage="3"] {
  height: 12%;
}
[data-percentage="4"] {
  height: 16%;
}
[data-percentage="5"] {
  height: 20%;
}
[data-percentage="6"] {
  height: 24%;
}
[data-percentage="7"] {
  height: 28%;
}
[data-percentage="8"] {
  height: 32%;
}
[data-percentage="9"] {
  height: 36%;
}
[data-percentage="10"] {
  height: 40%;
}
[data-percentage="11"] {
  height: 44%;
}
[data-percentage="12"] {
  height: 48%;
}
[data-percentage="13"] {
  height: 52%;
}
[data-percentage="14"] {
  height: 56%;
}
[data-percentage="15"] {
  height: 60%;
}
[data-percentage="16"] {
  height: 64%;
}
[data-percentage="17"] {
  height: 68%;
}
[data-percentage="18"] {
  height: 72%;
}
[data-percentage="19"] {
  height: 76%;
}
[data-percentage="20"] {
  height: 80%;
}
[data-percentage="21"] {
  height: 84%;
}
[data-percentage="22"] {
  height: 88%;
}
[data-percentage="23"] {
  height: 92%;
}
[data-percentage="24"] {
  height: 96%;
}
[data-percentage="25"] {
  height: 100%;
}
`;

export class Meter implements ViewItem<HTMLDivElement> {
  private meter: HTMLDivElement;
  private meterLevel1: HTMLDivElement;
  private meterLevel2: HTMLDivElement;
  private meterLevel3: HTMLDivElement;
  private meterLevel4: HTMLDivElement;
  private meterLevel1Inner: HTMLDivElement;
  private meterLevel2Inner: HTMLDivElement;
  private meterLevel3Inner: HTMLDivElement;
  private meterLevel4Inner: HTMLDivElement;

  constructor(c_percentage: Cell<0 | 1 | 2 | 3 | 4>) {
    this.meter = document.createElement("div");
    this.meter.className = meterStyle;
    this.meterLevel1 = document.createElement("div");
    this.meterLevel2 = document.createElement("div");
    this.meterLevel3 = document.createElement("div");
    this.meterLevel4 = document.createElement("div");
    this.meterLevel1.className = meterLevelStyle;
    this.meterLevel2.className = meterLevelStyle;
    this.meterLevel3.className = meterLevelStyle;
    this.meterLevel4.className = meterLevelStyle;
    this.meterLevel1Inner = document.createElement("div");
    this.meterLevel2Inner = document.createElement("div");
    this.meterLevel3Inner = document.createElement("div");
    this.meterLevel4Inner = document.createElement("div");
    this.meterLevel1Inner.className = meterLevelInnserStyle;
    this.meterLevel2Inner.className = meterLevelInnserStyle;
    this.meterLevel3Inner.className = meterLevelInnserStyle;
    this.meterLevel4Inner.className = meterLevelInnserStyle;

    this.meter.append(
      this.meterLevel4,
      this.meterLevel3,
      this.meterLevel2,
      this.meterLevel1,
    );
    this.meterLevel1.append(this.meterLevel1Inner);
    this.meterLevel2.append(this.meterLevel2Inner);
    this.meterLevel3.append(this.meterLevel3Inner);
    this.meterLevel4.append(this.meterLevel4Inner);

    Transaction.run(() => {
      Operational.value(c_percentage).listen((percentage) => {
        this.changeMeter(percentage);
      });
    });
  }

  private changeMeter(percentage: number) {
    if (percentage < 0) {
      this.meterLevel1Inner.dataset.percentage = `${0}`;
      this.meterLevel2Inner.dataset.percentage = `${0}`;
      this.meterLevel3Inner.dataset.percentage = `${0}`;
      this.meterLevel4Inner.dataset.percentage = `${0}`;
    } else if (percentage < 25 * 1) {
      this.meterLevel1Inner.dataset.percentage = `${percentage - 25 * 0}`;
      this.meterLevel2Inner.dataset.percentage = `${0}`;
      this.meterLevel3Inner.dataset.percentage = `${0}`;
      this.meterLevel4Inner.dataset.percentage = `${0}`;
    } else if (percentage < 25 * 2) {
      this.meterLevel1Inner.dataset.percentage = `${25}`;
      this.meterLevel2Inner.dataset.percentage = `${percentage - 25 * 1}`;
      this.meterLevel3Inner.dataset.percentage = `${0}`;
      this.meterLevel4Inner.dataset.percentage = `${0}`;
    } else if (percentage < 25 * 3) {
      this.meterLevel1Inner.dataset.percentage = `${25}`;
      this.meterLevel2Inner.dataset.percentage = `${25}`;
      this.meterLevel3Inner.dataset.percentage = `${percentage - 25 * 2}`;
      this.meterLevel4Inner.dataset.percentage = `${0}`;
    } else if (percentage < 25 * 4) {
      this.meterLevel1Inner.dataset.percentage = `${25}`;
      this.meterLevel2Inner.dataset.percentage = `${25}`;
      this.meterLevel3Inner.dataset.percentage = `${25}`;
      this.meterLevel4Inner.dataset.percentage = `${percentage - 25 * 3}`;
    } else {
      this.meterLevel1Inner.dataset.percentage = `${25}`;
      this.meterLevel2Inner.dataset.percentage = `${25}`;
      this.meterLevel3Inner.dataset.percentage = `${25}`;
      this.meterLevel4Inner.dataset.percentage = `${25}`;
    }
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
