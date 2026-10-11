/**
 * The path rules a package entry must satisfy (format-spec §1.5, §13).
 *
 * Entry names arrive from untrusted archives, so they are checked before
 * anything is materialised: no escape from the package root (absolute paths,
 * drive letters, `..` segments, NUL — a zip-slip guard), and the length, depth
 * and basename caps of `PACKAGE_LIMITS`. Both the ZIP reader and the loose
 * folder loader run each path through here, so the two forms accept and reject
 * exactly the same names.
 */

import { toSlashes } from "../main-file/layout.ts";
import { PACKAGE_LIMITS } from "./limits.ts";

/**
 * The UTF-8 byte length of `text`, iterating code points so a character outside
 * the basic plane counts four bytes (G2: no `TextEncoder` in core).
 */
function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

/**
 * Check one entry path against the §1.5 path rules and return the failure
 * message — naming the limit it hit — or `null` when the path is acceptable.
 *
 * The path is normalised first (`\` becomes `/`, §1.5), then rejected if it is
 * absolute, starts with a drive letter, carries a `..` segment or a NUL, or
 * breaches the length, depth or basename caps. A trailing `/` marks a directory
 * and is allowed.
 */
export function checkEntryPath(path: string): string | null {
  const normalised = toSlashes(path);
  if (normalised.includes("\u0000")) {
    return `Entry "${path}" contains a NUL byte; packages may not contain NUL in a path (path escape, L9)`;
  }
  const segments = normalised.split("/");
  const escaped =
    normalised.startsWith("/") ||
    /^[A-Za-z]:/.test(normalised) ||
    segments.includes("..");
  if (escaped) {
    return `Entry "${path}" escapes the package root; packages may not contain absolute paths, drive letters or ".." (path escape, L9)`;
  }
  const bytes = utf8ByteLength(normalised);
  if (bytes > PACKAGE_LIMITS.maxPathBytes) {
    return `Entry path "${path}" is ${bytes} bytes; the limit is ${PACKAGE_LIMITS.maxPathBytes} (max path length, L6)`;
  }
  const named = segments.filter((segment) => segment !== "");
  if (named.length > PACKAGE_LIMITS.maxPathDepth) {
    return `Entry "${path}" has ${named.length} segments; the limit is ${PACKAGE_LIMITS.maxPathDepth} (max depth, L7)`;
  }
  const basename = named.length === 0 ? "" : (named[named.length - 1] as string);
  const basenameBytes = utf8ByteLength(basename);
  if (basenameBytes > PACKAGE_LIMITS.maxBasenameBytes) {
    return `Entry name "${path}" is ${basenameBytes} bytes; the limit is ${PACKAGE_LIMITS.maxBasenameBytes} (max name length, L8)`;
  }
  return null;
}
