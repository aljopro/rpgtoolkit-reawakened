/**
 * CRC-32 over a byte span (docs/spec/formats/images.md#the-shared-decode-contract). PNG stores one at the end of every
 * chunk, computed over the chunk type and data, so a flipped bit in `IHDR` or
 * `PLTE` is a located error rather than a silently wrong image.
 *
 * The polynomial is the reflected ISO 3309 / ITU-T V.42 one (`0xEDB88320`) that
 * PNG, zlib and the ZIP family all use: initial value all ones, final
 * complement, table built once from the polynomial. Integer arithmetic only
 * (G3).
 */

/** The reflected CRC-32 polynomial (ISO 3309, used by PNG and zlib). */
const POLYNOMIAL = 0xedb88320;

let table: Uint32Array | undefined;

/** The 256-entry byte table, built on first use and then reused. */
function crcTable(): Uint32Array {
  let built = table;
  if (built === undefined) {
    built = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) === 1 ? POLYNOMIAL ^ (c >>> 1) : c >>> 1;
      }
      built[n] = c >>> 0;
    }
    table = built;
  }
  return built;
}

/**
 * The CRC-32 of `bytes[start … end)` (end exclusive), as an unsigned 32-bit
 * number. Values are masked to unsigned at every step, so the result is the
 * same on every JavaScript engine (G3).
 */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  const table = crcTable();
  let c = 0xffffffff;
  for (let i = start; i < end; i += 1) {
    c = table[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
