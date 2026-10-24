/** Closing-game execution census (ADR 0010); never saved or hashed. */
import type { GameState, ProgramRef, ScriptObservers, StepOp } from "@tk-reawakened/core";

export type Histogram = Readonly<Record<string, number>>;
type Counts = Record<string, number>;
export type TickHash = { readonly tick: number; readonly stateHash: string };
export type ProgramSpan = {
  readonly thread: number;
  readonly program: string;
  readonly source: string;
  readonly start: TickHash;
  readonly lastStep: TickHash;
  readonly finish: TickHash | null;
  readonly status: "finished" | "replaced" | "active";
  readonly steps: number;
};
export type ExecutionCensus = {
  readonly ticks: number;
  readonly stateHashes: readonly TickHash[];
  readonly bootSequence: readonly { readonly file: string; readonly tick: number; readonly found: boolean; readonly executed: boolean }[];
  readonly programSpans: readonly ProgramSpan[];
  readonly opcodeHistogram: Histogram;
  readonly callHistogram: Histogram;
  readonly commandHistogram: Histogram;
  readonly handlerHistogram: Histogram;
  readonly generatedStubHistogram: Histogram;
};

function increment(histogram: Counts, name: string, count = 1): void {
  histogram[name] = (histogram[name] ?? 0) + count;
}

function sorted(histogram: Counts): Histogram {
  return Object.fromEntries(Object.entries(histogram).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

function programName(program: ProgramRef): string {
  return program.kind === "file" ? program.path : "<inline>";
}

type Span = { thread: number; program: string; source: string; start: number; last: number; finish: number | null; status: ProgramSpan["status"]; steps: number };

export function createExecutionCensus() {
  const opcodes: Counts = Object.create(null) as Counts;
  const calls: Counts = Object.create(null) as Counts;
  const commands: Counts = Object.create(null) as Counts;
  const handlers: Counts = Object.create(null) as Counts;
  const stubs: Counts = Object.create(null) as Counts;
  const hashes = new Map<number, string>();
  const assets: { file: string; tick: number; found: boolean }[] = [];
  const spans: Span[] = [];
  const active = new Map<number, { program: string; spans: Span[] }>();
  let state: GameState | undefined;
  let ticks = 0;

  function close(thread: number, tick: number, status: "finished" | "replaced"): void {
    for (const span of active.get(thread)?.spans ?? []) { span.finish = tick; span.status = status; }
    active.delete(thread);
  }

  const observers: ScriptObservers = {
    postStep(op: StepOp, thread: number): void {
      increment(opcodes, op.op);
      if (state === undefined) throw new Error("census: no input-phase state");
      const running = state.vm.threads.find((item) => item.id === thread);
      const root = running?.frames[0]?.program;
      const program = root === undefined ? op.pos.file : programName(root);
      const tick = state.time.tick;
      if (active.has(thread) && active.get(thread)?.program !== program) close(thread, tick, "replaced");
      let current = active.get(thread);
      if (current === undefined) { current = { program, spans: [] }; active.set(thread, current); }
      let span = current.spans.find((item) => item.source === op.pos.file);
      if (span === undefined) {
        span = { thread, program, source: op.pos.file, start: tick, last: tick, finish: null, status: "active", steps: 0 };
        current.spans.push(span);
        spans.push(span);
      }
      span.last = tick;
      span.steps += 1;
    },
    postCall(call): void {
      increment(calls, `${call.via}:${call.kind}:${call.name}${call.plugin === undefined ? "" : `@${call.plugin}`}`);
      if (call.kind === "builtin" || call.kind === "extension") increment(commands, call.name);
    },
    postHandler(handler): void {
      increment(handlers, `${handler.plugin}:${handler.name}`);
      if (handler.generatedStub) increment(stubs, handler.name);
    },
  };

  const boundary = (tick: number): TickHash => {
    const stateHash = hashes.get(tick);
    if (stateHash === undefined) throw new Error(`census: missing boundary hash at tick ${tick}`);
    return { tick, stateHash };
  };

  return {
    observers,
    beforeTick(next: GameState): void { state = next; },
    asset(file: string, tick: number, found: boolean): void {
      if (/\.(gam|prg)$/i.test(file) && !assets.some((item) => item.file === file)) assets.push({ file, tick, found });
    },
    checkpoint(tick: number, stateHash: string): void {
      hashes.set(tick, stateHash);
      ticks = tick;
      if (state === undefined) return;
      for (const [id, running] of active) {
        const thread = state.vm.threads.find((item) => item.id === id);
        if (thread === undefined || thread.status === "finished") close(id, tick, "finished");
        else {
          const root = thread.frames[0]?.program;
          if (root !== undefined && programName(root) !== running.program) close(id, tick, "replaced");
        }
      }
    },
    result(): ExecutionCensus {
      return {
        ticks,
        stateHashes: [...hashes.keys()].sort((a, b) => a - b).map(boundary),
        bootSequence: assets.map((asset) => ({ ...asset, executed: spans.some((span) => span.source.toLowerCase() === asset.file.toLowerCase() || span.program.toLowerCase() === asset.file.toLowerCase()) })),
        programSpans: spans.map((span) => ({
          thread: span.thread, program: span.program, source: span.source,
          start: boundary(span.start), lastStep: boundary(span.last), finish: span.finish === null ? null : boundary(span.finish), status: span.status, steps: span.steps,
        })),
        opcodeHistogram: sorted(opcodes), callHistogram: sorted(calls), commandHistogram: sorted(commands),
        handlerHistogram: sorted(handlers), generatedStubHistogram: sorted(stubs),
      };
    },
  };
}

export type CatalogueRow = {
  readonly name: string;
  readonly owner: number | null;
  readonly ownerEpic: string | null;
  readonly effectKind: string;
  readonly sectionsRead: readonly string[];
  readonly sectionsWrite: readonly string[];
};

export function summariseCensus(games: Readonly<Record<string, ExecutionCensus>>, catalogue: readonly CatalogueRow[]) {
  const opcodeHistogram: Counts = Object.create(null) as Counts;
  const callHistogram: Counts = Object.create(null) as Counts;
  const commandHistogram: Counts = Object.create(null) as Counts;
  const handlerHistogram: Counts = Object.create(null) as Counts;
  const generatedStubHistogram: Counts = Object.create(null) as Counts;
  for (const census of Object.values(games)) {
    for (const [target, source] of [[opcodeHistogram, census.opcodeHistogram], [callHistogram, census.callHistogram], [commandHistogram, census.commandHistogram], [handlerHistogram, census.handlerHistogram], [generatedStubHistogram, census.generatedStubHistogram]] as const) {
      for (const [name, count] of Object.entries(source)) increment(target, name, count);
    }
  }
  const rows = new Map(catalogue.map((row) => [row.name.toLowerCase(), row]));
  const calledByOwnerEpic: Record<string, { name: string; count: number; catalogue: CatalogueRow }[]> = Object.create(null) as Record<string, { name: string; count: number; catalogue: CatalogueRow }[]>;
  const calledWithoutOwner: { name: string; count: number; catalogue: CatalogueRow | null }[] = [];
  for (const [name, count] of Object.entries(sorted(commandHistogram))) {
    const row = rows.get(name) ?? null;
    if (row?.owner == null || row.ownerEpic == null || row.ownerEpic === "") calledWithoutOwner.push({ name, count, catalogue: row });
    else (calledByOwnerEpic[row.ownerEpic] ??= []).push({ name, count, catalogue: row });
  }
  return {
    opcodeHistogram: sorted(opcodeHistogram), callHistogram: sorted(callHistogram), commandHistogram: sorted(commandHistogram),
    handlerHistogram: sorted(handlerHistogram), generatedStubHistogram: sorted(generatedStubHistogram),
    catalogueEntries: catalogue.length,
    calledByOwnerEpic,
    calledWithoutOwner,
    neverCalled: catalogue.filter((row) => commandHistogram[row.name.toLowerCase()] === undefined),
    generatedStubsInvoked: Object.entries(sorted(generatedStubHistogram)).map(([name, count]) => ({ name, count, catalogue: rows.get(name) ?? null })),
  };
}
