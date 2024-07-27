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
