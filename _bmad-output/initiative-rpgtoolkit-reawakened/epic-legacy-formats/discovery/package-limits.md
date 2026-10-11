# Proposed limits for untrusted packages (.tpk, appended-ZIP EXE, loose folders) — PROPOSAL, read-only research

Point-in-time finding of 2026-10-11, taken against the two sample games at the pinned revision 9191b9191c9bda0998c6faae16929b3331ed2ead. Produced by throwaway scripts. No sample-file content is quoted, and `docs/` was not changed: every doc fix named here is a proposal for a later, human-approved commit.

## Summary for the human
- Every number below is a PROPOSAL. None is a decided limit. Change values in the table; the failure messages name the rule.
- Corpus evidence (2 games, 134 files, 6,308,210 bytes): largest file 430,086 bytes; max path depth 4 segments; max relative path 59 characters; max basename 47 characters. Highest deflate ratio of a raw corpus file: 33.97:1 (median 6.03:1).
- The corpus has no `.tpk`, `.gam`, ZIP or EXE. Package limits therefore have **no direct corpus evidence**; the corpus only bounds the sizes of the assets inside a package.
- Probe finding: `fflate` `unzipSync` returned 1000 bytes with no error for an entry whose declared size was patched to 1000 (actual 10,000,000). The package reader must check actual length and CRC-32 itself. CRC-32 behaviour of `fflate` was not tested, so the check is required either way.
- The spec (`docs/format-spec.md` §13) gives the appended-ZIP trailer as `CMP1`, `i32 offsetOfZip`, `i32 zipLength` in the last 12 bytes. It does not state endianness of the two `i32` fields. This is an open question for the human.
- Core has no clock (G3), so there is no time or CPU budget. Limits are counts and bytes only.

## Limits table (all values PROPOSAL)

| # | Item | Proposed value | Corpus evidence | One-sentence reason | Failure message (names the item) |
|---|---|---|---|---|---|
| L1 | Max compressed input size | 256 MiB | both games 6,308,210 bytes total | Gives ~40× headroom over the whole corpus while bounding the bytes held in memory before parsing. | `Package "<name>" is <size> bytes; the limit is 268435456 bytes (max compressed input).` |
| L2 | Max entries (files + directories) | 10,000 | 134 files | Caps the central-directory walk at ~75× the corpus file count. | `Package "<name>" has <n> entries; the limit is 10000 (max entry count).` |
| L3 | Max single entry uncompressed size | 64 MiB | largest 430,086 bytes (`Tiles/default.tst`) | Allows ~150× the largest corpus asset and stops a single entry from exhausting memory. | `Entry "<path>" declares <size> bytes uncompressed; the limit is 67108864 (max entry size).` |
| L4 | Max total uncompressed size | 512 MiB | both games 6,308,210 bytes | Caps the sum of all declared sizes, so many small entries cannot exceed memory. | `Package "<name>" declares <total> bytes uncompressed; the limit is 536870912 (max total size).` |
| L5 | Max per-entry compression ratio (uncompressed ÷ compressed) | 100:1 | max raw file 33.97:1, median 6.03:1 (zlib level 9, a proxy, not a real ZIP) | Leaves ~3× margin over the most compressible corpus file; deflate's theoretical maximum (about 1032:1) is too permissive for untrusted input. | `Entry "<path>" compresses at <ratio>:1; the limit is 100:1 (zip-bomb guard).` |
| L6 | Max path length (UTF-8 bytes, after normalising `\` to `/`) | 256 | max 59 characters | Keeps paths well below common OS limits while allowing ~4× the corpus maximum. | `Entry path "<path>" is <n> bytes; the limit is 256 (max path length).` |
| L7 | Max path depth (segments) | 16 | max 4 segments | Bounds directory recursion in the loose-folder walker. | `Entry "<path>" has <n> segments; the limit is 16 (max depth).` |
| L8 | Max basename length (UTF-8 bytes) | 128 | max 47 characters | Gives ~2.7× the corpus maximum without allowing pathological names. | `Entry name "<name>" is <n> bytes; the limit is 128 (max name length).` |
| L9 | Path escape (zip-slip) | Reject any entry whose normalised path is absolute, starts with a drive letter (`X:`), contains `..` as a segment, or contains NUL | corpus: no escapes (paths are relative, depth ≤ 4) | Prevents writes or reads outside the package root. | `Entry "<path>" escapes the package root; packages may not contain absolute paths, drive letters or "..".` |
| L10 | Case-insensitive duplicates | Reject if two entries differ only by case (after normalisation) | not measured in corpus | Legacy lookups are case-insensitive, so two such names would be ambiguous. | `Entries "<a>" and "<b>" differ only by case; the package is ambiguous.` |
| L11 | Encrypted entries (general-purpose flag bit 0) | Reject | none in corpus | No decryption is in scope, and encrypted content cannot be validated. | `Entry "<path>" is encrypted; encrypted package entries are not supported.` |
| L12 | Compression methods | Only 0 (stored) and 8 (deflate) | corpus: none | Matches the AD-6 `fflate` surface and rejects unknown codecs. | `Entry "<path>" uses compression method <m>; only stored (0) and deflate (8) are supported.` |
| L13 | ZIP64 records | Reject (EOCD64 locator or 0xFFFFFFFF sentinel) | none | Keeps the reader on 32-bit fields, and the L1 cap is far below 4 GiB. | `Package "<name>" uses ZIP64; ZIP64 archives are not supported.` |
| L14 | Nested archives | Opaque: a nested `.zip`/`.tpk` is a file, never opened. Nesting depth 0 | none | Prevents recursion bombs and keeps the size budget single-level. | (none; nested archives are treated as ordinary files) |
| L15 | End-of-central-directory (EOCD) search window | Last 65,557 bytes (22-byte record + 65,535-byte comment) | none | Matches the ZIP format maximum; searching further is not needed. | `Package "<name>" has no end-of-central-directory record within the last 65557 bytes.` |
| L16 | Declared vs actual size (before inflate) | Reject if declared uncompressed size > L3, before any inflate (use the `filter` hook) | probe: `fflate` trusts declared size | Stops oversize entries before allocation. | `Entry "<path>" declares <size> bytes; the limit is 67108864.` |
| L17 | Declared vs actual size (after inflate) | Reject if actual output length ≠ declared size | probe: 1000 bytes returned for a 10,000,000-byte entry, no error | Detects truncated or lying headers that `fflate` accepts silently. | `Entry "<path>" inflated to <actual> bytes but its header declares <declared>; the package is corrupt.` |
| L18 | CRC-32 | Compute CRC-32 of decoded bytes; reject on mismatch | not tested (probe did not check CRC) | Detects content corruption and tampering that size checks miss. | `Entry "<path>" CRC-32 is <actual>; the header says <declared>; the package is corrupt.` |
| L19 | Local vs central header consistency | Reject if name, method, compressed size or uncompressed size differ between the local header and the central directory | probe: patched both headers, so a consistency check was not exercised | Prevents header disagreement tricks. | `Entry "<path>" local header disagrees with the central directory (<field>).` |
| L20 | Appended EXE trailer (`CMP1`) | Last 12 bytes must be `CMP1` + `i32 offsetOfZip` + `i32 zipLength`; require `offsetOfZip ≥ 0`, `zipLength ≥ 0`, `offsetOfZip + zipLength ≤ fileLength − 12` | spec §13 (layout only; endianness unstated) | Ensures the extracted range lies inside the file and does not overlap the trailer. | `EXE "<name>" trailer is invalid: offset <o>, length <l>, file <size> bytes.` |
| L21 | Appended EXE: trailer missing | Reject if the last 12 bytes do not start with `CMP1` | none | Prevents treating an ordinary EXE as a package. | `EXE "<name>" has no CMP1 trailer; it is not a standalone game.` |
| L22 | Loose folder: entry count | Same as L2 (counts files and directories) | — | Same budget for both package forms. | `Folder "<name>" has <n> entries; the limit is 10000.` |
| L23 | Loose folder: symlinks and reparse points | Reject | none | Stops links from escaping the folder. | `"<path>" is a symbolic link; links are not allowed in game folders.` |
| L24 | Loose folder: total size | Same as L4 (sum of file sizes) | — | Same budget for both package forms. | `Folder "<name>" totals <size> bytes; the limit is 536870912.` |
| L25 | Loose folder: per-file size | Same as L3 | — | Same budget. | `File "<path>" is <size> bytes; the limit is 67108864.` |
| L26 | Loose folder: path rules | Same as L6–L10 | — | Same rules for both package forms. | (use the failure text of the matching L-row) |

## Notes on rows

- L5 (ratio): the 33.97:1 corpus figure is for raw files compressed by zlib, not for entries in a real ZIP. Use it as a sanity bound only.
- L16 and L17 together give the "declared vs actual" rule. L16 uses declared sizes before inflate; L17 checks actual output after inflate.
- L18 (CRC-32): `fflate` was not tested for CRC handling, so compute and check CRC in the package reader.
- L20 endianness: spec §13 gives `i32` without byte order. Little-endian is the usual choice for legacy Windows formats, but this is an inference and must be confirmed.

## Commands used

- Corpus extents: `/tmp/disc/scripts/corpus-extents.py` → `/tmp/disc/pkgs/corpus-extents.txt` (134 files, 6,308,210 bytes; max depth 3 separators; max relative path 59; max basename 47; largest `demo/Tiles/default.tst` 430,086 bytes).
- Corpus deflate ratio: `/tmp/disc/scripts/corpus-ratio.py` → `/tmp/disc/pkgs/corpus-ratio.txt` (133 raw files, zlib level 9; max 33.97:1 for `Media/VIP - Overworld3.mid`; median 6.03:1).
- Declared-size probe: `/tmp/disc/scripts/zip-declared-size-probe.mjs` → `/tmp/disc/pkgs/zip-probe.txt` (10,000,000-byte entry, declared size patched to 1000 in local and central headers; `unzipSync` returned 1000 bytes, compressed 9880, no error).
- Spec read: `docs/format-spec.md` §1.5, §13 (grep for `CMP1|offsetOfZip|zipLength|appended|trailer`, line 806 and §13 context).
- Corpus inventory (read): `/tmp/disc/corpus-inventory.md` (134 total; no `.tpk`, `.gam`, ZIP or EXE; 39 header rules, 0 failing).

These scripts were throwaway and live only in the author's temporary folder; they are not kept in the repository.

## What I could not determine

- CRC-32 behaviour of `fflate` `unzipSync` (not probed).
- Endianness of the `CMP1` trailer `i32` fields (spec silent).
- Whether a real `.tpk` built by the legacy toolkit uses ZIP64, encryption, or non-deflate methods (no sample package in the corpus).
- Legacy case-sensitivity of `.tpk` entry lookups (spec §1.5 not re-read in full for this point).
- Real ZIP compression ratios of the corpus assets (measured with zlib on raw files, not in a ZIP).
- All numeric limits are proposals: no measured game or load-time data supports the exact values.

## Decisions for the human

1. Accept or change each PROPOSAL value in L1–L4, L5, L6–L8.
2. Confirm endianness of `CMP1` `i32` fields (little-endian assumed).
3. Confirm: reject ZIP64, encryption and non-deflate/stored methods (L11–L13).
4. Confirm: nested archives stay opaque (L14).
5. Confirm: compute CRC-32 in the package reader (L18), regardless of `fflate` behaviour.
