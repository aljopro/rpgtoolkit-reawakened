/**
 * A board host: the `Engine` a golden run drives to render one board
 * (epic-board-rendering entry 1).
 *
 * It is deliberately *not* `createEngine`: it holds no world, no script and no
 * phase list — it composes the board through `composeBoard` and hands back a
 * draw list, which is all a golden image needs. The real engine supersedes it
 * in entry 12, and the VM-backed host of epic rpgcode-vm's entry 3.2 is the same
 * pattern on the script side. It stays out of the harness's published surface
 * until something outside the harness needs it.
 */

import {
  composeBoard,
  encodePng,
  fnv1a64,
  hashDrawList,
  hashState,
  rasteriseDrawList,
  type BlitSource,
  type Board,
  type BoardView,
  type Breakpoint,
  type DrawList,
  type Engine,
  type InputRecord,
  type Surface,
  type SurfaceId,
  type SurfacePixels,
  type TexRef,
  type TickReport,
  type TileRefResolver,
} from "@tk-reawakened/core";

/** One texture of a fixture: the reference a `blit` carries and its pixels. */
export type FixtureTexture = {
  readonly ref: TexRef;
  readonly pixels: Surface;
};

/**
 * A board a host can render, plus everything rendering it needs: the view, the
 * textures its LUT references resolve to (keyed by the board's own reference
 * string, `default.tst12`, format-spec §1.6) and the logical resolution the
 * runner is driving.
 */
export type BoardFixture = {
  readonly board: Board;
  readonly view: BoardView;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly textures: Readonly<Record<string, FixtureTexture>>;
};

/** One rendered frame: the draw list, its pixels, both hashes and the PNG. */
export type RenderedFrame = {
  readonly drawList: DrawList;
  readonly surface: Surface;
  readonly drawHash: string;
  readonly pixelHash: string;
  readonly png: Uint8Array;
};

/**
 * The pixels of every fixture texture, keyed by asset and tile, so a composed
 * command resolves without scanning the fixture per blit.
 */
function sourcePixels(fixture: BoardFixture): Record<string, Surface> {
  const index: Record<string, Surface> = {};
  for (const reference of Object.keys(fixture.textures)) {
    const texture = fixture.textures[reference];
    if (texture !== undefined) {
      index[`${texture.ref.asset}#${texture.ref.tile ?? 0}`] = texture.pixels;
    }
  }
  return index;
}

/** The board's own reference resolver: the fixture's textures, or nothing. */
function referenceResolver(fixture: BoardFixture): TileRefResolver {
  return (reference) => fixture.textures[reference]?.ref ?? null;
}

/** Compose the board once, at tick 0 (the host advances ticks but draws statically). */
function compose(fixture: BoardFixture, tick: number): DrawList {
  return {
    tick,
    width: fixture.viewport.width,
    height: fixture.viewport.height,
    commands: composeBoard(fixture.board, fixture.view, referenceResolver(fixture)),
  };
}

/** Render one fixture frame: compose, rasterise, hash and encode (AD-4, AD-29). */
export function renderFrame(fixture: BoardFixture): RenderedFrame {
  const sources = sourcePixels(fixture);
  const drawList = compose(fixture, 0);
  const surface = rasteriseDrawList(drawList, (source) => pixelsFor(source, sources));
  return {
    drawList,
    surface,
    drawHash: hashDrawList(drawList),
    pixelHash: fnv1a64(surface.rgba),
    png: encodePng(surface),
  };
}

/** The pixels behind a composed `blit` source, or `null` when it has none. */
function pixelsFor(source: BlitSource, sources: Readonly<Record<string, Surface>>): Surface | null {
  if ("surface" in source) {
    // AD-27's persistent surfaces are the surface store's (entry 7); the tracer
    // composes no surface source.
    return null;
  }
  return sources[`${source.asset}#${source.tile ?? 0}`] ?? null;
}

/**
 * The host the golden job drives. `advance` runs whole ticks and reports the
 * consumed input log; `drawList` is a pure function of the tick, so batching a
 * run differently cannot change a golden.
 */
export function createBoardHost(fixture: BoardFixture): Engine {
  const state = { tick: 0 };
  return {
    advance(ticks: number, inputs: readonly InputRecord[], maxTicks?: number): TickReport {
      const actualTicks = maxTicks !== undefined && maxTicks < ticks ? maxTicks : ticks;
      const before = state.tick;
      const endTick = before + actualTicks;
      for (const record of inputs) {
        if (record.tick < before || record.tick >= endTick) {
          throw new RangeError(`board host: input tick ${record.tick} is outside window [${before}, ${endTick})`);
        }
      }
      const consumed: InputRecord[] = inputs.map((record) => ({ tick: record.tick, event: record.event }));
      state.tick = endTick;
      return {
        ticksRun: actualTicks,
        tickAfter: state.tick,
        consumed,
        audioCues: [],
        requests: [],
        diagnostics: [],
        loading: false,
        paused: null,
        stateHash: hashState(state),
      };
    },

    drawList(_alpha?: number): DrawList {
      return compose(fixture, state.tick);
    },

    surfacePixels(_id: SurfaceId, _rev: number): SurfacePixels | null {
      // The surface store lands with entry 7: until then this host owns no
      // surface, which is exactly what `null` means (AD-27).
      return null;
    },

    setBreakpoints(_breakpoints: readonly Breakpoint[]): void {
      // Breakpoints are data and a hit stops mid-tick; the hook lands with
      // entry 15, so this host records nothing and changes no state.
    },
  };
}
