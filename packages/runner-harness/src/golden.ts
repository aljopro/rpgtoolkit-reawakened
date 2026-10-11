import { decodeLog, type InputEvent, type InputRecord, type PortData } from "@rpgtoolkit/core";

export type StepRecord = {
  readonly step: number;
  readonly state: string;
  readonly draw: string;
};

export type Run = {
  readonly schema: 1;
  readonly steps: number;
  readonly log: readonly InputRecord[];
};

export type Golden = {
  readonly schema: 1;
  readonly records: readonly StepRecord[];
};

function checkNoExtraKeys(
  object: Record<string, unknown>,
  allowed: readonly string[],
  prefix: string,
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      throw new Error(`${prefix}: unexpected extra field '${key}'`);
    }
  }
}

function parseBytesField(
  recordIndex: number,
  fieldName: string,
  value: unknown,
): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `run.json: record ${recordIndex}: ${fieldName} must be an object with {t: "bytes", hex}`,
    );
  }
  const rec = value as Record<string, unknown>;
  const keys = Object.keys(rec);
  if (keys.length !== 2 || !keys.includes("t") || !keys.includes("hex")) {
    throw new Error(
      `run.json: record ${recordIndex}: ${fieldName} must have exactly keys 't' and 'hex'`,
    );
  }
  if (rec.t !== "bytes") {
    throw new Error(
      `run.json: record ${recordIndex}: ${fieldName}: tag 't' must be 'bytes'`,
    );
  }
  if (typeof rec.hex !== "string") {
    throw new Error(
      `run.json: record ${recordIndex}: ${fieldName}: 'hex' must be a string`,
    );
  }
  if (rec.hex.length % 2 !== 0) {
    throw new Error(
      `run.json: record ${recordIndex}: ${fieldName}: odd-length hex string`,
    );
  }
  for (let j = 0; j < rec.hex.length; j++) {
    const code = rec.hex.charCodeAt(j);
    const isDigit = code >= 0x30 && code <= 0x39;
    const isLower = code >= 0x61 && code <= 0x66;
    const isUpper = code >= 0x41 && code <= 0x46;
    if (!isDigit && !isLower && !isUpper) {
      throw new Error(
        `run.json: record ${recordIndex}: ${fieldName}: invalid hex character '${rec.hex[j]}'`,
      );
    }
  }
  const bytes = new Uint8Array(rec.hex.length / 2);
  for (let j = 0; j < bytes.length; j++) {
    bytes[j] = Number.parseInt(rec.hex.slice(j * 2, j * 2 + 2), 16);
  }
  return bytes;
}

export function parseEvent(raw: unknown, recordIndex: number): InputEvent {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`run.json: record ${recordIndex}: event must be an object`);
  }
  const rawEvent = raw as Record<string, unknown>;
  const kind = rawEvent.kind;
  if (typeof kind !== "string") {
    throw new Error(
      `run.json: record ${recordIndex}: event: missing or invalid kind`,
    );
  }

  switch (kind) {
    case "key": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "name", "code", "char", "down"],
        `run.json: record ${recordIndex}: event`,
      );
      if (typeof rawEvent.name !== "string" || rawEvent.name.length === 0) {
        throw new Error(
          `run.json: record ${recordIndex}: name must be a non-empty string`,
        );
      }
      if (typeof rawEvent.code !== "string" || rawEvent.code.length === 0) {
        throw new Error(
          `run.json: record ${recordIndex}: code must be a non-empty string`,
        );
      }
      if (typeof rawEvent.down !== "boolean") {
        throw new Error(
          `run.json: record ${recordIndex}: down must be a boolean`,
        );
      }
      if ("char" in rawEvent) {
        if (
          typeof rawEvent.char !== "string" ||
          [...rawEvent.char].length !== 1
        ) {
          throw new Error(
            `run.json: record ${recordIndex}: char must be a single code point`,
          );
        }
      }
      return {
        kind: "key",
        name: rawEvent.name,
        code: rawEvent.code,
        ...("char" in rawEvent ? { char: rawEvent.char as string } : {}),
        down: rawEvent.down,
      };
    }
    case "pointer": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "x", "y", "buttons"],
        `run.json: record ${recordIndex}: event`,
      );
      if (typeof rawEvent.x !== "number" || !Number.isInteger(rawEvent.x)) {
        throw new Error(
          `run.json: record ${recordIndex}: x must be a finite integer`,
        );
      }
      if (typeof rawEvent.y !== "number" || !Number.isInteger(rawEvent.y)) {
        throw new Error(
          `run.json: record ${recordIndex}: y must be a finite integer`,
        );
      }
      if (
        typeof rawEvent.buttons !== "number" ||
        !Number.isInteger(rawEvent.buttons) ||
        rawEvent.buttons < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: buttons must be a finite integer >= 0`,
        );
      }
      return {
        kind: "pointer",
        x: rawEvent.x,
        y: rawEvent.y,
        buttons: rawEvent.buttons,
      };
    }
    case "gamepad": {
      checkNoExtraKeys(
        rawEvent,
        ["kind"],
        `run.json: record ${recordIndex}: event`,
      );
      return { kind: "gamepad" };
    }
    case "focus": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "state"],
        `run.json: record ${recordIndex}: event`,
      );
      if (rawEvent.state !== "lost" && rawEvent.state !== "gained") {
        throw new Error(
          `run.json: record ${recordIndex}: state must be 'lost' or 'gained'`,
        );
      }
      return {
        kind: "focus",
        state: rawEvent.state,
      };
    }
    case "asset": {
      if (
        typeof rawEvent.reqId !== "number" ||
        !Number.isInteger(rawEvent.reqId) ||
        rawEvent.reqId < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: reqId must be a finite integer >= 0`,
        );
      }
      const hasMissing = "missing" in rawEvent;
      const hasBytes = "bytes" in rawEvent;
      if (hasMissing && hasBytes) {
        throw new Error(
          `run.json: record ${recordIndex}: bytes and missing are mutually exclusive`,
        );
      }
      if (hasMissing) {
        checkNoExtraKeys(
          rawEvent,
          ["kind", "reqId", "missing"],
          `run.json: record ${recordIndex}: event`,
        );
        if (rawEvent.missing !== true) {
          throw new Error(
            `run.json: record ${recordIndex}: missing must be true`,
          );
        }
        return {
          kind: "asset",
          reqId: rawEvent.reqId,
          missing: true,
        };
      }
      if (hasBytes) {
        checkNoExtraKeys(
          rawEvent,
          ["kind", "reqId", "bytes"],
          `run.json: record ${recordIndex}: event`,
        );
        const bytes = parseBytesField(recordIndex, "bytes", rawEvent.bytes);
        return {
          kind: "asset",
          reqId: rawEvent.reqId,
          bytes,
        };
      }
      throw new Error(
        `run.json: record ${recordIndex}: asset event requires bytes or missing: true`,
      );
    }
    case "blob.loaded": {
      if (
        typeof rawEvent.reqId !== "number" ||
        !Number.isInteger(rawEvent.reqId) ||
        rawEvent.reqId < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: reqId must be a finite integer >= 0`,
        );
      }
      const hasMissing = "missing" in rawEvent;
      const hasBytes = "bytes" in rawEvent;
      if (hasMissing && hasBytes) {
        throw new Error(
          `run.json: record ${recordIndex}: bytes and missing are mutually exclusive`,
        );
      }
      if (hasMissing) {
        checkNoExtraKeys(
          rawEvent,
          ["kind", "reqId", "missing"],
          `run.json: record ${recordIndex}: event`,
        );
        if (rawEvent.missing !== true) {
          throw new Error(
            `run.json: record ${recordIndex}: missing must be true`,
          );
        }
        return {
          kind: "blob.loaded",
          reqId: rawEvent.reqId,
          missing: true,
        };
      }
      if (hasBytes) {
        checkNoExtraKeys(
          rawEvent,
          ["kind", "reqId", "bytes"],
          `run.json: record ${recordIndex}: event`,
        );
        const bytes = parseBytesField(recordIndex, "bytes", rawEvent.bytes);
        return {
          kind: "blob.loaded",
          reqId: rawEvent.reqId,
          bytes,
        };
      }
      throw new Error(
        `run.json: record ${recordIndex}: blob.loaded event requires bytes or missing: true`,
      );
    }
    case "blob.saved": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "reqId", "ok"],
        `run.json: record ${recordIndex}: event`,
      );
      if (
        typeof rawEvent.reqId !== "number" ||
        !Number.isInteger(rawEvent.reqId) ||
        rawEvent.reqId < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: reqId must be a finite integer >= 0`,
        );
      }
      if (typeof rawEvent.ok !== "boolean") {
        throw new Error(`run.json: record ${recordIndex}: ok must be a boolean`);
      }
      return {
        kind: "blob.saved",
        reqId: rawEvent.reqId,
        ok: rawEvent.ok,
      };
    }
    case "blob.listed": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "reqId", "names"],
        `run.json: record ${recordIndex}: event`,
      );
      if (
        typeof rawEvent.reqId !== "number" ||
        !Number.isInteger(rawEvent.reqId) ||
        rawEvent.reqId < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: reqId must be a finite integer >= 0`,
        );
      }
      if (
        !Array.isArray(rawEvent.names) ||
        rawEvent.names.some((name) => typeof name !== "string")
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: names must be an array of strings`,
        );
      }
      return {
        kind: "blob.listed",
        reqId: rawEvent.reqId,
        names: rawEvent.names,
      };
    }
    case "extension.result": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "reqId", "result"],
        `run.json: record ${recordIndex}: event`,
      );
      if (
        typeof rawEvent.reqId !== "number" ||
        !Number.isInteger(rawEvent.reqId) ||
        rawEvent.reqId < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: reqId must be a finite integer >= 0`,
        );
      }
      if (!("result" in rawEvent)) {
        throw new Error(`run.json: record ${recordIndex}: result is required`);
      }
      let result: PortData;
      try {
        result = decodeLog(rawEvent.result as Parameters<typeof decodeLog>[0]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`run.json: record ${recordIndex}: result: ${msg}`);
      }
      return {
        kind: "extension.result",
        reqId: rawEvent.reqId,
        result,
      };
    }
    case "audio.ended": {
      checkNoExtraKeys(
        rawEvent,
        ["kind", "cueId"],
        `run.json: record ${recordIndex}: event`,
      );
      if (
        typeof rawEvent.cueId !== "number" ||
        !Number.isInteger(rawEvent.cueId) ||
        rawEvent.cueId < 0
      ) {
        throw new Error(
          `run.json: record ${recordIndex}: cueId must be a finite integer >= 0`,
        );
      }
      return {
        kind: "audio.ended",
        cueId: rawEvent.cueId,
      };
    }
    case "video.ended": {
      checkNoExtraKeys(
        rawEvent,
        ["kind"],
        `run.json: record ${recordIndex}: event`,
      );
      return { kind: "video.ended" };
    }
    default: {
      const _never: never = kind as never;
      throw new Error(
        `run.json: record ${recordIndex}: unexpected event kind '${_never}'`,
      );
    }
  }
}

export function parseRun(text: string): Run {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `run.json: invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("run.json: root must be an object");
  }
  const root = parsed as Record<string, unknown>;
  checkNoExtraKeys(root, ["schema", "steps", "log"], "run.json");

  if (root.schema !== 1) {
    throw new Error("run.json: schema must be 1");
  }
  if (
    typeof root.steps !== "number" ||
    !Number.isInteger(root.steps) ||
    root.steps < 1
  ) {
    throw new Error("run.json: steps must be an integer >= 1");
  }
  if (!Array.isArray(root.log)) {
    throw new Error("run.json: log must be an array");
  }

  const log: InputRecord[] = [];
  for (let i = 0; i < root.log.length; i++) {
    const rawRec = root.log[i];
    if (
      typeof rawRec !== "object" ||
      rawRec === null ||
      Array.isArray(rawRec)
    ) {
      throw new Error(`run.json: record ${i}: must be an object`);
    }
    const rec = rawRec as Record<string, unknown>;
    checkNoExtraKeys(rec, ["step", "event"], `run.json: record ${i}`);

    if (
      typeof rec.step !== "number" ||
      !Number.isInteger(rec.step) ||
      rec.step < 0
    ) {
      throw new Error(
        `run.json: record ${i}: step must be a finite integer >= 0`,
      );
    }
    if (rec.step >= root.steps) {
      throw new Error(
        `run.json: record ${i}: step ${rec.step} must be < steps ${root.steps}`,
      );
    }
    if (i > 0 && rec.step < log[i - 1]!.step) {
      throw new Error(
        `run.json: record ${i}: step ${rec.step} violates non-decreasing order`,
      );
    }

    const event = parseEvent(rec.event, i);

    log.push({
      step: rec.step,
      event,
    });
  }

  return {
    schema: 1,
    steps: root.steps,
    log,
  };
}

export function parseGolden(text: string): Golden {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `golden.json: invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("golden.json: root must be an object");
  }
  const root = parsed as Record<string, unknown>;
  checkNoExtraKeys(root, ["schema", "records"], "golden.json");

  if (root.schema !== 1) {
    throw new Error("golden.json: schema must be 1");
  }
  if (!Array.isArray(root.records)) {
    throw new Error("golden.json: records must be an array");
  }

  const hex16 = /^[0-9a-f]{16}$/;
  const records: StepRecord[] = [];
  for (let i = 0; i < root.records.length; i++) {
    const raw = root.records[i];
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`golden.json: record ${i}: must be an object`);
    }
    const rec = raw as Record<string, unknown>;
    checkNoExtraKeys(rec, ["step", "state", "draw"], `golden.json: record ${i}`);

    if (rec.step !== i + 1) {
      throw new Error(
        `golden.json: record ${i}: step must be ${i + 1}, got ${String(rec.step)}`,
      );
    }
    if (typeof rec.state !== "string" || !hex16.test(rec.state)) {
      throw new Error(
        `golden.json: record ${i}: state must be a 16-character lowercase hex string`,
      );
    }
    if (typeof rec.draw !== "string" || !hex16.test(rec.draw)) {
      throw new Error(
        `golden.json: record ${i}: draw must be a 16-character lowercase hex string`,
      );
    }
    records.push({
      step: rec.step,
      state: rec.state,
      draw: rec.draw,
    });
  }

  return {
    schema: 1,
    records,
  };
}

export function formatGolden(records: readonly StepRecord[]): string {
  const lines: string[] = ['{\n  "schema": 1,\n  "records": ['];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i]!;
    const comma = i < records.length - 1 ? "," : "";
    lines.push(
      `    {"step": ${rec.step}, "state": "${rec.state}", "draw": "${rec.draw}"}${comma}`,
    );
  }
  lines.push("  ]\n}\n");
  return lines.join("\n");
}

export function compareGolden(
  actual: readonly StepRecord[],
  expected: readonly StepRecord[],
): { ok: true } | { ok: false; message: string } {
  const minLen = Math.min(actual.length, expected.length);
  for (let i = 0; i < minLen; i++) {
    const act = actual[i]!;
    const exp = expected[i]!;
    const step = act.step;

    const stateDiff = act.state !== exp.state;
    const drawDiff = act.draw !== exp.draw;

    if (stateDiff || drawDiff) {
      const parts: string[] = [];
      if (stateDiff) {
        parts.push(
          `state hash differs (expected ${exp.state}, actual ${act.state})`,
        );
      }
      if (drawDiff) {
        parts.push(
          `draw-list hash differs (expected ${exp.draw}, actual ${act.draw})`,
        );
      }
      return {
        ok: false,
        message: `golden: step ${step}: ${parts.join("; ")}`,
      };
    }
  }

  if (actual.length > expected.length) {
    const extraStep = actual[expected.length]!.step;
    return {
      ok: false,
      message: `golden: run has step ${extraStep} the golden lacks`,
    };
  }

  if (actual.length < expected.length) {
    const missingStep = expected[actual.length]!.step;
    return {
      ok: false,
      message: `golden: golden has step ${missingStep} the run lacks`,
    };
  }

  return { ok: true };
}
