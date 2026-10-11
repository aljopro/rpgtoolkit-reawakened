import { deepEqual, equal, throws } from "node:assert/strict";
import { test } from "node:test";
import {
  compareGolden,
  formatGolden,
  parseGolden,
  parseRun,
  type StepRecord,
} from "../src/golden.ts";

test("parseRun parses valid run with all 11 event kinds including non-BMP char and bytes", () => {
  const runText = JSON.stringify({
    schema: 1,
    steps: 12,
    log: [
      {
        step: 0,
        event: { kind: "key", name: 'quote"and\\slash', code: "KeyQ", char: "𐍈", down: true },
      },
      {
        step: 1,
        event: { kind: "pointer", x: 10, y: 20, buttons: 2 },
      },
      {
        step: 2,
        event: { kind: "gamepad" },
      },
      {
        step: 3,
        event: { kind: "focus", state: "lost" },
      },
      {
        step: 4,
        event: { kind: "asset", reqId: 1, bytes: { t: "bytes", hex: "0a0b0c" } },
      },
      {
        step: 5,
        event: { kind: "asset", reqId: 2, missing: true },
      },
      {
        step: 6,
        event: { kind: "blob.loaded", reqId: 3, bytes: { t: "bytes", hex: "de" } },
      },
      {
        step: 7,
        event: { kind: "blob.saved", reqId: 4, ok: true },
      },
      {
        step: 8,
        event: { kind: "blob.listed", reqId: 5, names: ["file1", "file2"] },
      },
      {
        step: 9,
        event: { kind: "extension.result", reqId: 6, result: { val: 123 } },
      },
      {
        step: 10,
        event: { kind: "audio.ended", cueId: 7 },
      },
      {
        step: 11,
        event: { kind: "video.ended" },
      },
    ],
  });

  const run = parseRun(runText);
  equal(run.schema, 1);
  equal(run.steps, 12);
  equal(run.log.length, 12);

  const keyEv = run.log[0]!.event;
  if (keyEv.kind === "key") {
    equal(keyEv.name, 'quote"and\\slash');
    equal(keyEv.char, "𐍈");
    equal(keyEv.down, true);
  } else {
    throw new Error("expected key event");
  }

  const assetEv = run.log[4]!.event;
  if (assetEv.kind === "asset" && assetEv.bytes) {
    deepEqual(assetEv.bytes, new Uint8Array([0x0a, 0x0b, 0x0c]));
  } else {
    throw new Error("expected asset event with bytes");
  }
});

test("parseRun rejects bad files and root schema", () => {
  const badFiles: readonly { name: string; text: string }[] = [
    { name: "not json", text: "invalid-json" },
    { name: "root not object", text: "[]" },
    { name: "schema 2", text: JSON.stringify({ schema: 2, steps: 1, log: [] }) },
    { name: "schema missing", text: JSON.stringify({ steps: 1, log: [] }) },
    { name: "steps missing", text: JSON.stringify({ schema: 1, log: [] }) },
    { name: "steps 0", text: JSON.stringify({ schema: 1, steps: 0, log: [] }) },
    { name: "steps negative", text: JSON.stringify({ schema: 1, steps: -5, log: [] }) },
    { name: "steps fractional", text: JSON.stringify({ schema: 1, steps: 3.5, log: [] }) },
    { name: "steps string", text: JSON.stringify({ schema: 1, steps: "3", log: [] }) },
    { name: "log not array", text: JSON.stringify({ schema: 1, steps: 1, log: "bad" }) },
    { name: "root extra key", text: JSON.stringify({ schema: 1, steps: 1, log: [], extra: true }) },
  ];

  for (const { name, text } of badFiles) {
    throws(
      () => parseRun(text),
      (err: unknown) => err instanceof Error && err.message.startsWith("run.json:"),
      `expected parseRun to throw on ${name}`,
    );
  }
});

test("parseRun rejects bad records naming record index and field", () => {
  const badRecords: readonly { name: string; record: unknown; fieldSnippet: string }[] = [
    {
      name: "stamps 3 then 2",
      record: [
        { step: 3, event: { kind: "gamepad" } },
        { step: 2, event: { kind: "gamepad" } },
      ],
      fieldSnippet: "violates non-decreasing order",
    },
    {
      name: "negative stamp",
      record: [{ step: -1, event: { kind: "gamepad" } }],
      fieldSnippet: "step must be a finite integer >= 0",
    },
    {
      name: "fractional stamp",
      record: [{ step: 1.5, event: { kind: "gamepad" } }],
      fieldSnippet: "step must be a finite integer >= 0",
    },
    {
      name: "stamp >= steps",
      record: [{ step: 5, event: { kind: "gamepad" } }],
      fieldSnippet: "step 5 must be < steps 5",
    },
    {
      name: "unknown kind",
      record: [{ step: 0, event: { kind: "unknown_kind" } }],
      fieldSnippet: "event kind",
    },
    {
      name: "missing field in key",
      record: [{ step: 0, event: { kind: "key", name: "A", down: true } }],
      fieldSnippet: "code",
    },
    {
      name: "wrong type for down",
      record: [{ step: 0, event: { kind: "key", name: "A", code: "KeyA", down: "yes" } }],
      fieldSnippet: "down must be a boolean",
    },
    {
      name: "bytes with missing",
      record: [{ step: 0, event: { kind: "asset", reqId: 1, bytes: { t: "bytes", hex: "00" }, missing: true } }],
      fieldSnippet: "mutually exclusive",
    },
    {
      name: "extra key in record",
      record: [{ step: 0, event: { kind: "gamepad" }, extra: 1 }],
      fieldSnippet: "unexpected extra field 'extra'",
    },
    {
      name: "extra key in event",
      record: [{ step: 0, event: { kind: "gamepad", extra: 1 } }],
      fieldSnippet: "unexpected extra field 'extra'",
    },
    {
      name: "invalid hex digits zz",
      record: [{ step: 0, event: { kind: "asset", reqId: 1, bytes: { t: "bytes", hex: "zz" } } }],
      fieldSnippet: "invalid hex character",
    },
    {
      name: "odd-length hex",
      record: [{ step: 0, event: { kind: "asset", reqId: 1, bytes: { t: "bytes", hex: "abc" } } }],
      fieldSnippet: "odd-length hex string",
    },
    {
      name: "empty name in key",
      record: [{ step: 0, event: { kind: "key", name: "", code: "KeyA", down: true } }],
      fieldSnippet: "name must be a non-empty string",
    },
    {
      name: "multi-code-point char in key",
      record: [{ step: 0, event: { kind: "key", name: "A", code: "KeyA", char: "AB", down: true } }],
      fieldSnippet: "char must be a single code point",
    },
    {
      name: "extension.result missing result",
      record: [{ step: 0, event: { kind: "extension.result", reqId: 1 } }],
      fieldSnippet: "result is required",
    },
    {
      name: "extension.result malformed hex payload",
      record: [{ step: 0, event: { kind: "extension.result", reqId: 1, result: { t: "bytes", hex: "zz" } } }],
      fieldSnippet: "result: decodeLog: invalid hex digit",
    },
  ];

  for (const { name, record, fieldSnippet } of badRecords) {
    const text = JSON.stringify({
      schema: 1,
      steps: 5,
      log: record,
    });
    throws(
      () => parseRun(text),
      (err: unknown) => {
        return (
          err instanceof Error &&
          err.message.includes("run.json: record") &&
          err.message.includes(fieldSnippet)
        );
      },
      `expected parseRun to throw on ${name}`,
    );
  }
});

test("parseGolden and formatGolden round-trip correctly", () => {
  const records: StepRecord[] = [
    { step: 1, state: "0123456789abcdef", draw: "abcdef0123456789" },
    { step: 2, state: "1123456789abcdef", draw: "bbcdef0123456789" },
  ];

  const formatted = formatGolden(records);
  const parsed = parseGolden(formatted);

  equal(parsed.schema, 1);
  deepEqual(parsed.records, records);
});

test("parseGolden rejects bad files and fields", () => {
  const badGoldens: readonly { name: string; text: string; snippet: string }[] = [
    { name: "not json", text: "bad", snippet: "invalid JSON" },
    { name: "root not object", text: "[]", snippet: "root must be an object" },
    { name: "schema 2", text: JSON.stringify({ schema: 2, records: [] }), snippet: "schema must be 1" },
    { name: "records not array", text: JSON.stringify({ schema: 1, records: 123 }), snippet: "records must be an array" },
    {
      name: "step not 1..N",
      text: JSON.stringify({
        schema: 1,
        records: [{ step: 2, state: "0123456789abcdef", draw: "0123456789abcdef" }],
      }),
      snippet: "step must be 1",
    },
    {
      name: "state bad hex",
      text: JSON.stringify({
        schema: 1,
        records: [{ step: 1, state: "bad_hex_chars!!", draw: "0123456789abcdef" }],
      }),
      snippet: "state must be a 16-character lowercase hex string",
    },
    {
      name: "state too short",
      text: JSON.stringify({
        schema: 1,
        records: [{ step: 1, state: "0123456789", draw: "0123456789abcdef" }],
      }),
      snippet: "state must be a 16-character lowercase hex string",
    },
    {
      name: "draw uppercase hex",
      text: JSON.stringify({
        schema: 1,
        records: [{ step: 1, state: "0123456789abcdef", draw: "0123456789ABCDEF" }],
      }),
      snippet: "draw must be a 16-character lowercase hex string",
    },
    {
      name: "extra field in record",
      text: JSON.stringify({
        schema: 1,
        records: [{ step: 1, state: "0123456789abcdef", draw: "0123456789abcdef", extra: true }],
      }),
      snippet: "unexpected extra field 'extra'",
    },
  ];

  for (const { name, text, snippet } of badGoldens) {
    throws(
      () => parseGolden(text),
      (err: unknown) => err instanceof Error && err.message.includes(snippet),
      `expected parseGolden to throw on ${name}`,
    );
  }
});

test("compareGolden detects differences table-driven", () => {
  const baseRecords: readonly StepRecord[] = [
    { step: 1, state: "0000000000000001", draw: "aaaaaaaaaaaaaaaa" },
    { step: 2, state: "0000000000000002", draw: "bbbbbbbbbbbbbbbb" },
    { step: 3, state: "0000000000000003", draw: "cccccccccccccccc" },
  ];

  // identical matches
  const matchResult = compareGolden(baseRecords, baseRecords);
  equal(matchResult.ok, true);

  const diffCases: readonly {
    name: string;
    actual: readonly StepRecord[];
    expected: readonly StepRecord[];
    expectedMessage: string;
  }[] = [
    {
      name: "state altered at step 2",
      actual: [
        baseRecords[0]!,
        { step: 2, state: "9999999999999999", draw: "bbbbbbbbbbbbbbbb" },
        baseRecords[2]!,
      ],
      expected: baseRecords,
      expectedMessage:
        "golden: step 2: state hash differs (expected 0000000000000002, actual 9999999999999999)",
    },
    {
      name: "draw altered at step 2",
      actual: [
        baseRecords[0]!,
        { step: 2, state: "0000000000000002", draw: "9999999999999999" },
        baseRecords[2]!,
      ],
      expected: baseRecords,
      expectedMessage:
        "golden: step 2: draw-list hash differs (expected bbbbbbbbbbbbbbbb, actual 9999999999999999)",
    },
    {
      name: "both state and draw altered at step 2",
      actual: [
        baseRecords[0]!,
        { step: 2, state: "9999999999999999", draw: "8888888888888888" },
        baseRecords[2]!,
      ],
      expected: baseRecords,
      expectedMessage:
        "golden: step 2: state hash differs (expected 0000000000000002, actual 9999999999999999); draw-list hash differs (expected bbbbbbbbbbbbbbbb, actual 8888888888888888)",
    },
    {
      name: "two steps altered (reports only first differing step)",
      actual: [
        baseRecords[0]!,
        { step: 2, state: "9999999999999999", draw: "bbbbbbbbbbbbbbbb" },
        { step: 3, state: "8888888888888888", draw: "cccccccccccccccc" },
      ],
      expected: baseRecords,
      expectedMessage:
        "golden: step 2: state hash differs (expected 0000000000000002, actual 9999999999999999)",
    },
    {
      name: "golden shorter (run has extra step)",
      actual: baseRecords,
      expected: [baseRecords[0]!, baseRecords[1]!],
      expectedMessage: "golden: run has step 3 the golden lacks",
    },
    {
      name: "golden longer (run missing step)",
      actual: [baseRecords[0]!, baseRecords[1]!],
      expected: baseRecords,
      expectedMessage: "golden: golden has step 3 the run lacks",
    },
  ];

  for (const { name, actual, expected, expectedMessage } of diffCases) {
    const res = compareGolden(actual, expected);
    equal(res.ok, false, `expected failure for ${name}`);
    if (!res.ok) {
      equal(res.message, expectedMessage, `message mismatch for ${name}`);
    }
  }
});
