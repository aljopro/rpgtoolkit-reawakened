/**
 * The Windows COLORREF value (format-spec §1.1): a 32-bit integer laid out
 * `0x00BBGGRR`, so red sits in the low byte. Reader and writer share these two
 * functions so the channel order cannot drift between them.
 */

/** An unpacked COLORREF. */
export interface Colorref {
  /** Red, from the low byte. */
  readonly r: number;
  /** Green. */
  readonly g: number;
  /** Blue, from the second byte. */
  readonly b: number;
}

/** Pack `{r, g, b}` into the stored `0x00BBGGRR` 32-bit value. */
export function packColorref(color: Colorref): number {
  return ((color.b & 0xff) << 16) | ((color.g & 0xff) << 8) | (color.r & 0xff);
}

/** Unpack a stored `0x00BBGGRR` value; the high byte is ignored. */
export function unpackColorref(value: number): Colorref {
  return { r: value & 0xff, g: (value >> 8) & 0xff, b: (value >> 16) & 0xff };
}
