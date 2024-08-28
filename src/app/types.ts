export type WaterLevel = 0 | 1 | 2 | 3 | 4;
export type LidState = "Open" | "Close";

type longBeep = {
  kind: "Long";
};

type shortBeep = {
  kind: "Short";
  count: number;
};

export type BeepType = longBeep | shortBeep;

export class Duration {
  constructor(ms: number) {
    this._type = "Duration";
    this.ms = ms;
  }
  static fromSec(s: number): Duration {
    return new Duration(s * 1000);
  }
  static fromMs(ms: number): Duration {
    return new Duration(ms);
  }
  static fromMinutes(m: number): Duration {
    return Duration.fromSec(m * 60);
  }
  toSec(): number {
    return this.ms / 1000;
  }
  toMs(): number {
    return this.ms;
  }
  toMinutes(): number {
    return this.toSec() / 60;
  }

  _type: "Duration";
  private ms: number;
}

export class Watt {
  constructor(watt: number) {
    this._type = "Watt";
    this.watt = watt;
  }
  static fromWatt(watt: number): Watt {
    return new Watt(watt);
  }
  toJoule(duration: Duration): Joule {
    return Joule.fromJoule(duration.toSec() * this.watt);
  }
  asNumber(): number {
    return this.watt;
  }

  _type: "Watt";
  private watt: number;
}

export class Water {
  constructor(ml: number, joule: Joule) {
    this._type = "Water";
    this.ml = ml;
    this.joule = joule;
  }
  static fromMl(ml: number, joule: Joule = Joule.fromJoule(0)) {
    return new Water(ml, joule);
  }
  static fromL(l: number, joule: Joule = Joule.fromJoule(0)) {
    return new Water(l * 1000, joule);
  }
  static merge(w1: Water, w2: Water): Water {
    const newJoule = Joule.fromJoule(w1.joule.asNumber() + w2.joule.asNumber());
    return new Water(w1.ml + w2.ml, newJoule);
  }
  emitWater(ml: number): Water {
    const newJoule = Joule.fromJoule(
      (this.joule.asNumber() / this.ml) * (this.ml - ml),
    );
    return Water.fromMl(this.ml - ml, newJoule);
  }
  addJoule(joule: Joule): Water {
    return Water.fromMl(
      this.ml,
      Joule.fromJoule(this.joule.asNumber() + joule.asNumber()),
    );
  }
  subJoule(joule: Joule): Water {
    return Water.fromMl(
      this.ml,
      Joule.fromJoule(this.joule.asNumber() - joule.asNumber()),
    );
  }
  toMl(): number {
    return this.ml;
  }
  toL(): number {
    return this.ml / 1000;
  }
  toTemp(): Temperature {
    const needJoulesForOneCelcius = this.ml * 4.2;
    const celsius = this.joule.asNumber() / needJoulesForOneCelcius;
    if (Number.isNaN(celsius)) return Temperature.fromCelsius(0);
    else return Temperature.fromCelsius(celsius);
  }

  _type: "Water";
  private ml: number;
  private joule: Joule;
}

export class Joule {
  constructor(joule: number) {
    this._type = "Joule";
    this.joule = joule;
  }
  static fromJoule(joule: number) {
    return new Joule(joule);
  }
  asNumber(): number {
    return this.joule;
  }

  _type: "Joule";
  private joule: number;
}

export class Temperature {
  constructor(celsius: number) {
    this._type = "Temperature";
    this.celsius = celsius;
  }
  static fromCelsius(celsius: number): Temperature {
    return new Temperature(celsius);
  }
  toCelsius(): number {
    return this.celsius;
  }

  _type: "Temperature";
  private celsius: number;
}
