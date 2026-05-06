/**
 * Shuffle quiz answer options so the correct answer doesn't always
 * appear in the same position. Returns the shuffled options array
 * and a mapping from shuffled index → original index.
 *
 * Uses a seeded PRNG so the same question gets a different order
 * each quiz attempt (seed changes), but stays stable within a
 * single question view.
 */

function seededRandom(seed: number) {
  // Simple mulberry32 PRNG
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export interface ShuffledQuestion {
  /** Options in shuffled order */
  options: string[];
  /** shuffledIndex → originalIndex */
  indexMap: number[];
  /** The new index of the correct answer after shuffle */
  correctShuffledIndex: number;
}

/**
 * @param options      - Original options array
 * @param correctIndex - Index of correct answer in original array
 * @param questionId   - Stable question identifier
 * @param attemptSeed  - Changes per quiz attempt to vary order
 */
export function shuffleQuestion(
  options: string[],
  correctIndex: number,
  questionId: string,
  attemptSeed: number
): ShuffledQuestion {
  const indices = options.map((_, i) => i);
  const seed = hashString(questionId) ^ attemptSeed;

  // Fisher-Yates with seeded random
  for (let i = indices.length - 1; i > 0; i--) {
    const r = seededRandom(seed + i);
    const j = Math.floor(r * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledOptions = indices.map((origIdx) => options[origIdx]);
  const correctShuffledIndex = indices.indexOf(correctIndex);

  return {
    options: shuffledOptions,
    indexMap: indices, // indexMap[shuffledIdx] = originalIdx
    correctShuffledIndex,
  };
}
