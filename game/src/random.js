// A small seeded random number generator (mulberry32): the same seed gives the
// same kitchen, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mix = Math.imul(state ^ (state >>> 15), 1 | state);
    mix = (mix + Math.imul(mix ^ (mix >>> 7), 61 | mix)) ^ mix;
    return ((mix ^ (mix >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `list` using the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}
