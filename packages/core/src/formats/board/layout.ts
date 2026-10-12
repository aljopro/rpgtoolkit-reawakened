/**
 * The §4.1 version dispatch that chooses a board's layout from its stored minor.
 *
 * A board's minor version decides which reader reads it (format-spec §4.1): the
 * vector layout of §4.2 from minor 4 (`BOARD_VECTOR_MINOR`), the pre-vector
 * layout of §4.8 for minors 2–3 (`PRE_VECTOR_MINOR_MIN`…`PRE_VECTOR_MINOR_MAX`),
 * and anything below those, which no reader accepts. The registry's board
 * decoder and the dump's summary both ask this one function, so the two cannot
 * disagree about which branch a file took.
 */

import { BOARD_VECTOR_MINOR, type Board } from "./model.ts";
import { PRE_VECTOR_MINOR_MAX, PRE_VECTOR_MINOR_MIN } from "./pre-vector-reader.ts";

/** Which §4.1 branch a stored board minor takes. */
export type BoardLayout = "vector" | "pre-vector" | "obsolete";

/**
 * Which §4.1 branch a board minor takes: the §4.2 vector layout
 * (`BOARD_VECTOR_MINOR` and above), the §4.8 pre-vector layout
 * (`PRE_VECTOR_MINOR_MIN`…`PRE_VECTOR_MINOR_MAX`), or one below those, which no
 * reader here accepts (`readBoard` refuses an obsolete minor).
 */
export function boardLayout(minor: number): BoardLayout {
  if (minor >= BOARD_VECTOR_MINOR) {
    return "vector";
  }
  if (minor >= PRE_VECTOR_MINOR_MIN && minor <= PRE_VECTOR_MINOR_MAX) {
    return "pre-vector";
  }
  return "obsolete";
}

/**
 * A board read from bytes, with the §4.1 branch it was read as.
 *
 * A pre-vector board (`layout: "pre-vector"`) is already the §4.2 model: the
 * decoder runs `convertPreVectorBoard`, because both branches must yield one
 * board model. `layout` is kept so a caller can say which branch the bytes were
 * in without peeking the header again.
 */
export interface DecodedBoard {
  /** The §4.2 board model, converted from the §4.8 layout when it was pre-vector. */
  readonly board: Board;
  /** The §4.1 branch the bytes were in. */
  readonly layout: "vector" | "pre-vector";
}
