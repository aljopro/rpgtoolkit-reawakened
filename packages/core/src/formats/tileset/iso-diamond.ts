/**
 * The isometric diamond mask and its inside-pixel count (docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso).
 *
 * An isometric tile (`.iso`, detail 150) is a 64×32 image whose usable area is
 * a diamond. Only the inside pixels are stored, packed into a 32×32 block
 * (`docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso`, section on isometric tiles); the four corners are always transparent. This module owns the
 * mask test on its own so the packer and the tests share exactly one rule.
 */

/** The drawn width of an isometric tile: 64 (docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso). */
export const ISO_IMAGE_WIDTH = 64;

/** The drawn height of an isometric tile: 32 (docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso). */
export const ISO_IMAGE_HEIGHT = 32;

/** The side of the stored 32×32 block an isometric tile is packed into (`docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso`). */
export const ISO_STORED_SIZE = 32;

/** The inside-pixel count of the diamond (docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso step 1). */
export const ISO_INSIDE_PIXEL_COUNT = 1024;

/**
 * Whether the drawn pixel `(x, y)` lies inside the 64×32 diamond
 * (docs/spec/formats/tiles.md#tileset-tst-and-isometric-tileset-iso step 1).
 *
 * The mask is stated over four 32×16 quadrants with local coordinates
 * `qx 0…31`, `qy 0…15`:
 * * top-left: `2·qy ≥ 31 − qx`
 * * top-right: `2·qy ≥ qx`
 * * bottom-left: `2·qy < qx`
 * * bottom-right: `2·qy < 31 − qx`
 *
 * `x` and `y` are required to be in range; the quadrant comes from the high
 * bit of `x` (0…31 vs 32…63) and of `y` (0…15 vs 16…31), and the local
 * coordinate is that bit stripped, exactly as the spec's `qx`/`qy` say.
 */
export function isInsideIsoDiamond(x: number, y: number): boolean {
  const qx = x % ISO_STORED_SIZE;
  const qy = y % (ISO_IMAGE_HEIGHT / 2);
  const top = y < ISO_IMAGE_HEIGHT / 2;
  const left = x < ISO_STORED_SIZE;
  if (top && left) {
    return 2 * qy >= 31 - qx;
  }
  if (top) {
    return 2 * qy >= qx;
  }
  if (left) {
    return 2 * qy < qx;
  }
  return 2 * qy < 31 - qx;
}
