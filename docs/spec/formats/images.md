# Windows bitmap (`.bmp`)

Games ship pictures in `Bitmap/` (and a few elsewhere) in one of three kinds: PNG, JPEG or Windows bitmap. PNG and JPEG are third-party formats read as-is; a Windows bitmap is the same. The engine reads every one of them in one place and turns it into pixels ([format-spec.md](../../format-spec.md) §10.1); this page records the BMP layout so the reader has a specification to work from, since [README.md](README.md) previously called these third-party formats with no page of their own.

The layout below is the public Microsoft bitmap layout, written here in the byte order of this spec ([README.md](README.md#primitive-encoding): `short` is signed 16-bit little-endian, `int` is signed 32-bit little-endian). No RPG Toolkit file format is involved.

## The shared decode contract

Every image the engine loads, whatever its kind, becomes the same pixels, so that the rasteriser, every runner and the editor cannot disagree about what an image contains:

- The result is **straight** (non-premultiplied) 8-bit RGBA of exactly `width × height × 4` bytes in row-major order, **top row first**: the file's own colours and its own alpha, nothing added. Because colour-key transparency is stored with whatever references the image and never in the file, the reader never applies a key; the key is tested against these pixels by whatever blits the image.
- The kind is chosen by **signature**. A Windows bitmap starts with the two bytes `BM` (`42 4D`). PNG (`89 50 4E 47 0D 0A 1A 0A`) and JPEG (`FF D8 FF`) are the other two kinds. Any other signature is refused at offset 0.
- Every defect is a **located error** carrying the file's path, the offending byte offset and the section `format-spec §10` — never a throw and never a plausible wrong picture.
- A **zero dimension** is refused, and so is an image of more than **100,000,000 pixels**: `width × height` is untrusted input, so past that limit the allocation is not attempted and the file is refused instead. The limit is far above any game asset.

**Reawakened rule (reader boundary).** The BMP reader decodes **uncompressed `BI_RGB` bitmaps of 1, 4, 8, 24 and 32 bits per pixel, plus 8-bit `RLE8`**, each with a 40-byte DIB header and one plane. Every other BMP variant is refused with a located error naming the field and its value, rather than approximated into a wrong picture. This is the set a Toolkit-era game actually ships (see [Evidence](#evidence)) plus the two nearest variants a board-image export can produce.

## The Windows bitmap layout

A bitmap is a 14-byte file header, a 40-byte DIB header, an optional palette, then the pixel array.

### File header (14 bytes)

| Offset | Field | Type | Meaning |
|---|---|---|---|
| 0 | `bfType` | 2 bytes | `BM` (`42 4D`) |
| 2 | `bfSize` | `int` | Size of the whole file in bytes |
| 6 | `bfReserved1` | `short` | 0 |
| 8 | `bfReserved2` | `short` | 0 |
| 10 | `bfOffBits` | `int` | Byte offset from the start of the file to the pixel array |

`bfSize` is not trusted for allocation: the reader checks the pixel array's extent against the bytes that remain in the file (below), exactly as an untrusted count is checked in [README.md](README.md#counts-are-usually-upper-bounds).

### DIB header (40 bytes, `BITMAPINFOHEADER`)

| Offset | Field | Type | Meaning |
|---|---|---|---|
| 14 | `biSize` | `int` | 40. Any other value is refused (a `BITMAPCOREHEADER` of 12, or a `V4`/`V5` header of 108/124, names its own size here) |
| 18 | `biWidth` | `int` | Width in pixels; must be positive |
| 22 | `biHeight` | `int` | Height in pixels. **Positive: rows are stored bottom-up.** Negative: the magnitude is the height and rows are stored top-down |
| 26 | `biPlanes` | `short` | 1. Any other value is refused |
| 28 | `biBitCount` | `short` | Bits per pixel: 1, 4, 8, 24 or 32 |
| 30 | `biCompression` | `int` | 0 = `BI_RGB` (uncompressed); 1 = `BI_RLE8` (8-bit run-length); 2 = `BI_RLE4`; 3 = `BI_BITFIELDS`; 4 = `BI_JPEG`; 5 = `BI_PNG`. Only 0, and 1 at 8 bits, are decoded |
| 34 | `biSizeImage` | `int` | Size of the pixel array in bytes; 0 is allowed for `BI_RGB` and is not used by the reader |
| 38 | `biXPelsPerMeter` | `int` | Resolution hint; ignored |
| 42 | `biYPelsPerMeter` | `int` | Resolution hint; ignored |
| 46 | `biClrUsed` | `int` | Palette entries in use, or 0 meaning the full `2^biBitCount` the depth addresses |
| 50 | `biClrImportant` | `int` | Ignored |

**Reawakened rule (refusals).** Each of these is a located error at the field's own offset, never a decoded guess:

- `biSize` other than 40 (the message names the size read).
- `biWidth` or `biHeight` of 0.
- `abs(biWidth) × abs(biHeight)` above 100,000,000 (the message names both dimensions; the RGBA allocation is not attempted).
- `biPlanes` other than 1.
- `biBitCount` outside 1, 4, 8, 24, 32.
- `biCompression` other than 0, or 1 at a depth other than 8 — including `BI_BITFIELDS` (3), `BI_JPEG` (4) and `BI_PNG` (5), whose embedded or bit-field forms this reader does not decode.

### Palette (1, 4 and 8 bits)

The palette is `biClrUsed` entries of 4 bytes each — B, G, R, then a reserved byte — immediately after the DIB header. `biClrUsed` of 0 means the full `2^biBitCount` entries (2, 16 or 256); a file that declares fewer is read from its declared count, and an index at or above the count present is refused. Bytes between the header and `bfOffBits` that are not whole entries are simply not a palette; the check is that enough entries are present for the indices the pixels use. 24-bit and 32-bit bitmaps have no palette.

### Pixel array

The pixel array starts at `bfOffBits`, which must lie within the file. Each row is `stride` bytes, where

```
stride = floor((biBitCount × width + 31) / 32) × 4
```

so every row is padded up to a multiple of 4 bytes. The padding bytes are not pixels and are never read as such; they are skipped between rows. The whole array occupies `stride × abs(biHeight)` bytes, and that span must lie within the file or the file is refused, naming the bytes that remain, **before** the RGBA buffer is allocated.

Pixels within a row are packed left to right, most significant bits first:

| `biBitCount` | Bytes per pixel | Packing |
|---|---|---|
| 1 | 1/8 | 8 pixels per byte, the **high** bit the leftmost pixel; value 0 or 1 selects palette entry 0 or 1 |
| 4 | 1/2 | 2 pixels per byte, the **high** nibble the leftmost pixel; value 0–15 selects a palette entry |
| 8 | 1 | 1 byte per pixel, a palette index 0–255 |
| 24 | 3 | **B, G, R** in that order |
| 32 | 4 | **B, G, R**, then a fourth byte that `BI_RGB` does not define as alpha |

**Reawakened rule (row order).** A positive `biHeight` means the first stored row is the **bottom** row of the picture and the last stored row is the **top** row; the reader reverses the rows when it writes the top-row-first RGBA. A negative `biHeight` means the rows are already stored top-first and are copied in file order. The magnitude of `biHeight` is the height in both cases.

**Reawakened rule (32-bit alpha).** For 32-bit `BI_RGB` every pixel's alpha is **255**. The header defines no alpha channel, and the fourth byte's meaning differs between Windows producers, so the reader neither reads it as alpha nor drops the variant; it returns the file's own colours with opaque alpha, and any transparency stays the per-image colour key of [format-spec.md](../../format-spec.md) §10.

### RLE8 (8-bit, `biCompression` 1)

`BI_RLE8` stores the 8-bit pixel array as a stream of byte pairs, still **bottom-up** for a positive `biHeight`:

| Pair | Meaning |
|---|---|
| `count`, `value` with `count` > 0 | Repeat `value` `count` times |
| `0`, `0` | **End of line**: move to the start of the next row |
| `0`, `1` | **End of bitmap**: the stream ends here |
| `0`, `2`, `dx`, `dy` | **Delta**: move right `dx` and down `dy` pixels |
| `0`, `n` with `n` ≥ 3 | **Absolute**: the next `n` bytes are literal palette indices; if `n` is odd, one padding byte follows so the run ends on a 16-bit boundary |

Pixels the stream never reaches keep the palette's index 0 value; that is how a blank area is stored. **Reawakened rule (RLE refusals).** A run or an absolute block that would cross the row's right edge, a delta that would leave the image, an odd-length absolute run whose padding byte is missing, or a stream that ends without an `0 1` end-of-bitmap is a located error (at the byte the escape began). The reader decodes an RLE8 stream into the same top-row-first RGBA as an uncompressed bitmap, so a stream and its uncompressed equivalent give identical pixels.

### Trailing bytes

Bytes after the last pixel row are ignored: an image is a whole picture with no residue model, so there is nowhere to report them.

## Evidence

The archive's 343 `.bmp` files were counted read-only on 2026-10-15: 340 are 24-bit `BI_RGB` and 3 are 8-bit `BI_RGB`, every one with a 40-byte DIB header, one plane, compression 0 and a positive height; none is 4-bit, 32-bit, top-down or RLE, and none uses another header size. Inside the six Toolkit 2-era games the reachable bitmaps include Caoquest's `Bitmap/mwin.bmp` (600×100, the menu window), `Bitmap/slash.bmp` (159×127, whose stride is 480 = 477 + 3 padding bytes) and `Bitmap/Mbubble.bmp` (647×124), School2Demo's `Bitmap/New Bitmap Image.bmp` (114×30), and ChimeranEmpire's `Bitmap/Help Button.bmp` (720×354, **1-bit**, a 62-byte palette offset). The supported set above is that evidence plus the two nearest variants (4-bit and 32-bit `BI_RGB`, and RLE8) the others do not settle.
