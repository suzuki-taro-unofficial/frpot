export const clamp = <T extends number>(value: T, l: T, r: T): T => {
  if (value < l) {
    return l;
  } else if (value > r) {
    return r;
  } else {
    return value;
  }
};
