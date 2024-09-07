import { Stream } from "sodiumjs";

/**
 * 前回の値から異なる値で発火した場合だけ通過するストリームを作成する。
 * 初回の発火については第２引数に渡した初期値と異なる場合に通過する。
 */
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
