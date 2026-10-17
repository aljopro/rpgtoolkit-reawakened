import {
  CATALOGUE_STUBS_PLUGIN,
  CORE_PLUGIN,
  createScriptServices as createResolvedScriptServices,
  type GameState,
  type Logger,
  type PluginDefinition,
  type ProgramLoader,
  type ResolvedPlugin,
  type ScriptServices,
  type VirtualVariablePort,
} from "../src/index.ts";

const DEFAULT_RESOLVED: readonly ResolvedPlugin[] = [
  { definition: CORE_PLUGIN },
  { definition: CATALOGUE_STUBS_PLUGIN },
];

type TestPlugin = PluginDefinition | ResolvedPlugin;

export function createScriptServices(
  state: GameState,
  plugins: readonly TestPlugin[] = [],
  logger?: Logger,
  virtuals?: VirtualVariablePort,
  loader?: ProgramLoader,
): ScriptServices {
  const resolved = plugins.map((plugin) =>
    "definition" in plugin ? plugin : { definition: plugin },
  );
  return createResolvedScriptServices(
    state,
    [...DEFAULT_RESOLVED, ...resolved],
    logger,
    virtuals,
    loader,
  );
}
