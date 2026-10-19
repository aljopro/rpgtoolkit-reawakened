import { test } from "node:test";
import { deepEqual, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AssetKey } from "@tk-reawakened/core";
import {
  AUDIO_EVENT_SHAPES,
  AUDIO_MESSAGE_SHAPES,
  AUDIO_VOICE_STATES,
  createAudioSourceRegistry,
  createNullAudioRegistry,
  createPcmSource,
  VoiceMachine,
  type AudioEvent,
  type AudioMessage,
} from "../src/index.ts";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Schema = { [key: string]: Json | Schema };
interface VectorStep { readonly op: "message" | "render"; readonly message?: Record<string, Json>; readonly frames?: number; readonly events: readonly Record<string, Json>[]; readonly peakAtLeast?: number; }
interface AudioVector { readonly outputRateHz: number; readonly vectors: readonly { readonly id: string; readonly script: readonly VectorStep[] }[]; }

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(join(here, "../schema/audio-protocol-v1.schema.json"), "utf8")) as unknown as Schema;
const vectors = JSON.parse(readFileSync(join(here, "../../../tools/fixtures/audio-protocol/vectors.json"), "utf8")) as AudioVector;

function object(value: Json | Schema): { [key: string]: Json | Schema } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("schema object expected");
  return value as { [key: string]: Json | Schema };
}
function array(value: Json | Schema): readonly (Json | Schema)[] {
  if (!Array.isArray(value)) throw new Error("schema array expected");
  return value;
}
function hasOwn(value: object, key: string): boolean { return Object.prototype.hasOwnProperty.call(value, key); }
function equalJson(actual: Json | Schema, expected: Json | Schema): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

/** Small JSON-Schema 2020-12 evaluator for the subset used by the published protocol schema. */
function schemaErrors(root: Schema, value: Json, current: Schema = root, path = "$"): string[] {
  const errors: string[] = [];
  const ref = current["$ref"];
  if (typeof ref === "string") {
    const target = ref.split("/").slice(1).reduce<Json | Schema>((part, key) => object(part)[key] as Json | Schema, root);
    errors.push(...schemaErrors(root, value, object(target), path));
  }
  const type = current.type;
  if (typeof type === "string") {
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    if (actual !== type && !(type === "integer" && typeof value === "number" && Number.isInteger(value))) errors.push(`${path}: expected ${type}`);
  }
  if (hasOwn(current, "const") && !equalJson(value, current.const as Json)) errors.push(`${path}: const mismatch`);
  const enumValues = current.enum;
  if (Array.isArray(enumValues) && !enumValues.some((entry) => equalJson(value, entry as Json))) errors.push(`${path}: enum mismatch`);
  if (typeof value === "string") {
    const minLength = current.minLength;
    if (typeof minLength === "number" && value.length < minLength) errors.push(`${path}: too short`);
    const pattern = current.pattern;
    if (typeof pattern === "string" && !new RegExp(pattern).test(value)) errors.push(`${path}: pattern mismatch`);
  }
  if (typeof value === "number") {
    for (const key of ["minimum", "maximum"] as const) if (typeof current[key] === "number" && (key === "minimum" ? value < current[key] : value > current[key])) errors.push(`${path}: ${key} mismatch`);
  }
  const oneOf = current.oneOf;
  if (Array.isArray(oneOf)) {
    const matches = oneOf.filter((candidate) => schemaErrors(root, value, object(candidate), path).length === 0).length;
    if (matches !== 1) errors.push(`${path}: oneOf matched ${matches}`);
  }
  const allOf = current.allOf;
  if (Array.isArray(allOf)) for (const candidate of allOf) errors.push(...schemaErrors(root, value, object(candidate), path));
  const not = current.not;
  if (not !== undefined && schemaErrors(root, value, object(not), path).length === 0) errors.push(`${path}: not failed`);
  const conditional = current.if;
  if (conditional !== undefined && schemaErrors(root, value, object(conditional), path).length === 0) {
    const then = current.then;
    if (then !== undefined) errors.push(...schemaErrors(root, value, object(then), path));
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const required = current.required;
    if (Array.isArray(required)) for (const key of required) if (typeof key === "string" && !hasOwn(value, key)) errors.push(`${path}: missing ${key}`);
    const properties = current.properties;
    const propertyMap = properties === undefined ? {} : object(properties);
    if (current.additionalProperties === false) for (const key of Object.keys(value)) if (!hasOwn(propertyMap, key)) errors.push(`${path}: extra ${key}`);
    for (const [key, child] of Object.entries(propertyMap)) if (hasOwn(value, key)) errors.push(...schemaErrors(root, value[key] as Json, object(child), `${path}.${key}`));
  }
  return errors;
}

function requiredKeys(definition: Schema): readonly string[] {
  const direct = definition.required;
  if (Array.isArray(direct)) return direct.filter((key): key is string => typeof key === "string");
  const allOf = definition.allOf;
  if (!Array.isArray(allOf)) return [];
  return allOf.flatMap((part) => requiredKeys(object(part))).filter((key, index, keys) => keys.indexOf(key) === index);
}
function propertyKeys(definition: Schema): readonly string[] {
  const properties = definition.properties;
  if (properties !== undefined) return Object.keys(object(properties));
  const allOf = definition.allOf;
  if (!Array.isArray(allOf)) return [];
  return allOf.flatMap((part) => propertyKeys(object(part))).filter((key, index, keys) => keys.indexOf(key) === index);
}

function decodeBase64(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = value.replace(/=+$/, "");
  const bytes: number[] = [];
  for (let offset = 0; offset < clean.length; offset += 4) {
    const n = (alphabet.indexOf(clean[offset] ?? "") << 18) | (alphabet.indexOf(clean[offset + 1] ?? "") << 12) | (alphabet.indexOf(clean[offset + 2] ?? "") << 6) | alphabet.indexOf(clean[offset + 3] ?? "");
    bytes.push((n >>> 16) & 255);
    if (offset + 2 < clean.length) bytes.push((n >>> 8) & 255);
    if (offset + 3 < clean.length) bytes.push(n & 255);
  }
  return Uint8Array.from(bytes);
}

function message(value: Record<string, Json>): AudioMessage {
  if (value.kind === "load") return { ...value, asset: value.asset as AssetKey, data: decodeBase64(String(value.data)) } as unknown as AudioMessage;
  return value as unknown as AudioMessage;
}
function replay(vector: AudioVector["vectors"][number], registry: ReturnType<typeof createNullAudioRegistry>): { events: AudioEvent[]; peaks: number[] } {
  const machine = new VoiceMachine(registry, { outputRateHz: vectors.outputRateHz });
  const events: AudioEvent[] = [];
  const peaks: number[] = [];
  for (const step of vector.script) {
    let actual: AudioEvent[];
    if (step.op === "message") actual = machine.handle(message(step.message as Record<string, Json>));
    else {
      const left = new Float32Array(step.frames ?? 0);
      const right = new Float32Array(step.frames ?? 0);
      actual = machine.render(left, right, step.frames ?? 0);
      peaks.push(Math.max(...left.map((sample, index) => Math.abs(sample)), ...right.map((sample) => Math.abs(sample)), 0));
    }
    deepEqual(actual, step.events, `${vector.id}/${step.op}`);
    events.push(...actual);
  }
  return { events, peaks };
}

test("the schema and TypeScript shape metadata contain the same fixed records", () => {
  const defs = object(schema.$defs as Schema);
  deepEqual(Object.keys(AUDIO_MESSAGE_SHAPES), ["load", "play", "pause", "resume", "stop", "seek", "setLoop", "setVolume", "fade", "setBank"]);
  deepEqual(Object.keys(AUDIO_EVENT_SHAPES), ["ready", "ended", "error"]);
  for (const [kind, shape] of Object.entries(AUDIO_MESSAGE_SHAPES)) {
    const definition = object(defs[kind] ?? {});
    deepEqual([...requiredKeys(definition)].sort(), Object.keys(shape).sort(), `${kind} required keys`);
    deepEqual([...propertyKeys(definition)].sort(), Object.keys(shape).sort(), `${kind} properties`);
  }
  for (const [kind, shape] of Object.entries(AUDIO_EVENT_SHAPES)) {
    const definition = object(defs[kind] ?? {});
    deepEqual([...requiredKeys(definition)].sort(), Object.keys(shape).sort(), `${kind} required keys`);
    deepEqual([...propertyKeys(definition)].sort(), Object.keys(shape).sort(), `${kind} properties`);
  }
  const voiceState = object(defs.voiceState ?? {});
  deepEqual(voiceState.enum, [...AUDIO_VOICE_STATES]);
});

test("every vector message and expected event validates against the published schema", () => {
  for (const vector of vectors.vectors) for (const step of vector.script) {
    const candidates = step.op === "message" ? [step.message] : step.events;
    for (const candidate of candidates) {
      ok(candidate, `${vector.id} has a candidate record`);
      const errors = schemaErrors(schema, candidate as Json);
      deepEqual(errors, [], `${vector.id}/${step.op}: ${errors.join(", ")}`);
    }
  }
});

test("Null and PCM source bindings replay vectors with identical protocol events", () => {
  for (const vector of vectors.vectors) {
    const nullRun = replay(vector, createNullAudioRegistry());
    const pcmRun = replay(vector, createAudioSourceRegistry([createPcmSource()]));
    deepEqual(pcmRun.events, nullRun.events, `${vector.id} event parity`);
    for (const step of vector.script) if (step.op === "render" && step.peakAtLeast !== undefined) {
      const index = vector.script.slice(0, vector.script.indexOf(step) + 1).filter((entry) => entry.op === "render").length - 1;
      ok((pcmRun.peaks[index] ?? 0) >= step.peakAtLeast, `${vector.id} PCM render is non-silent`);
    }
  }
});
