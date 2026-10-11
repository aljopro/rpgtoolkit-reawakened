/**
 * A pure UTF-8 encoder (G2, G3, AD-11).
 *
 * `core` may not import `TextEncoder`, `Buffer` or any host global, so the
 * encoder is written out. It parses surrogate pairs and throws `TypeError` on
 * an unpaired surrogate, as RFC 8785 §3.2.2.2 requires.
 */

/**
 * Encode `value` to its UTF-8 bytes. Throws `TypeError` on an unpaired
 * surrogate, which `JSON.stringify` would silently pass through.
 */
export function utf8Encode(value: string): Uint8Array {
  // First pass: the exact byte length, so the result is one allocation.
  let length = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      length += 1;
    } else if (code < 0x800) {
      length += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(i + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) {
        throw new TypeError("utf8Encode: unpaired high surrogate");
      }
      length += 4;
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new TypeError("utf8Encode: unpaired low surrogate");
    } else {
      length += 3;
    }
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      bytes[offset++] = code;
    } else if (code < 0x800) {
      bytes[offset++] = 0xc0 | (code >> 6);
      bytes[offset++] = 0x80 | (code & 0x3f);
    } else if (code >= 0xd800 && code <= 0xdbff) {
      const low = value.charCodeAt(i + 1);
      const point = 0x10000 + (((code & 0x3ff) << 10) | (low & 0x3ff));
      bytes[offset++] = 0xf0 | (point >> 18);
      bytes[offset++] = 0x80 | ((point >> 12) & 0x3f);
      bytes[offset++] = 0x80 | ((point >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (point & 0x3f);
      i++;
    } else {
      bytes[offset++] = 0xe0 | (code >> 12);
      bytes[offset++] = 0x80 | ((code >> 6) & 0x3f);
      bytes[offset++] = 0x80 | (code & 0x3f);
    }
  }
  return bytes;
}
