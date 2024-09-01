import { Stream } from "sodiumjs";

export const change = <A extends unknown>(s_a: Stream<A>, initial: A) => {
  const c_a = s_a.hold(initial);

  return s_a
    .snapshot(c_a, (next, prev) => ({
      next,
      prev,
    }))
    .filter(({ next, prev }) => next !== prev)
    .map(({ next }) => next);
};
