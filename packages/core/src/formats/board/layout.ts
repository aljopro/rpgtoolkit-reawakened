/**
 * The docs/spec/formats/board.md#version-dispatch version dispatch that chooses a board's layout from its stored minor.
 *
 * A board's minor version decides which reader reads it ([version dispatch](../../../../../../docs/spec/formats/board.md#version-dispatch)): the
 * vector layout ([vector layout](../../../../../../docs/spec/formats/board.md#vector-layout-minor-4-and-later)) from minor 4 (`BOARD_VECTOR_MINOR`), the pre-vector
 * layout ([pre-vector layout](../../../../../../docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector) for minors 2–3 (`PRE_VECTOR_MINOR_MIN`…`PRE_VECTOR_MINOR_MAX`),
 * decoder and the dump's summary both ask this one function, so the two cannot
 * disagree about which branch a file took.
 */

import { BOARD_VECTOR_MINOR, type Board } from "./model.ts";
import { PRE_VECTOR_MINOR_MAX, PRE_VECTOR_MINOR_MIN } from "./pre-vector-reader.ts";

/** Which docs/spec/formats/board.md#version-dispatch branch a stored board minor takes. */
export type BoardLayout = "vector" | "pre-vector" | "obsolete";

/**
 * Which docs/spec/formats/board.md#version-dispatch branch a board minor takes: the docs/spec/formats/board.md#vector-layout-minor-4-and-later vector layout
 * (`BOARD_VECTOR_MINOR` and above), the docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector pre-vector layout
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
 * A board read from bytes, with the docs/spec/formats/board.md#version-dispatch branch it was read as.
 *
 * A pre-vector board (`layout: "pre-vector"`) is already the docs/spec/formats/board.md#vector-layout-minor-4-and-later model: the
 * decoder runs `convertPreVectorBoard`, because both branches must yield one
 * board model. `layout` is kept so a caller can say which branch the bytes were
 * in without peeking the header again.
 */
export interface DecodedBoard {
  /** The docs/spec/formats/board.md#vector-layout-minor-4-and-later board model, converted from the docs/spec/formats/legacy/older-binary-versions.md#board-minor-2-and-3-pre-vector layout when it was pre-vector. */
  readonly board: Board;
  /** The docs/spec/formats/board.md#version-dispatch branch the bytes were in. */
  readonly layout: "vector" | "pre-vector";
}
