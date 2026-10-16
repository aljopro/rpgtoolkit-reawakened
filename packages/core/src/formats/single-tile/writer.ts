/**
 * Serialising a single tile (`docs/spec/formats/tiles.md#single-tile-gph`, docs/spec/formats/tiles.md#single-tile-gph).
 *
 * Writes text lines formatted the VB6 way: non-negative numbers with leading space
 * and trailing space (` 2 `), negative numbers with trailing space (`-1 `), CRLF separated.
 */

import type { SingleTile } from "./model.ts";

function formatVb6Number(n: number): string {
  return n >= 0 ? ` ${n} ` : `${n} `;
}

export function writeSingleTile(model: SingleTile): string {
  const lines: string[] = [
    model.magic,
    formatVb6Number(model.major),
    formatVb6Number(model.minor),
    formatVb6Number(model.detail),
    formatVb6Number(model.compression),
  ];

  if (model.compression === 0) {
    for (const p of model.pixels) {
      lines.push(formatVb6Number(p));
    }
  } else {
    // Run-length compression: pairs of count, value.
    let i = 0;
    while (i < model.pixels.length) {
      const val = model.pixels[i]!;
      let count = 1;
      while (i + count < model.pixels.length && model.pixels[i + count] === val) {
        count += 1;
      }
      lines.push(formatVb6Number(count));
      lines.push(formatVb6Number(val));
      i += count;
    }
  }

  return lines.join("\r\n") + "\r\n";
}
