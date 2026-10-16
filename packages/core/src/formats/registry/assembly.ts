/**
 * Ordered assembly of the core and plugin asset decoders (AD-31; ADR 0004).
 *
 * The low-level registry remains strict for direct callers. This seam validates
 * each plugin's claims, then layers later plugins over earlier ones so decoder
 * composition follows the command-plugin model without mutating CORE_REGISTRY.
 *
 * docs/spec/engine/plugins-and-battle.md#e-99.
 */

import type { Logger } from "../../ports/logger.ts";
import type { PluginDefinition } from "../../script/plugin.ts";
import { asciiLower } from "../main-file/layout.ts";
import { CORE_DECODERS } from "./core-decoders.ts";
import { createLayeredAssetRegistry, type AssetRegistry } from "./registry.ts";
import type { AssetDecoder } from "./decoder.ts";

const CORE_PLUGIN_ID = "core";

/**
 * Assemble one independent registry for the supplied ordered plugin layers.
 * A plugin's own duplicate id or extension is rejected; claims between layers
 * use later-plugin-wins and produce one warning per replaced claim.
 */
export function assembleDecoders(
  plugins: readonly PluginDefinition[],
  logger: Logger,
): AssetRegistry {
  const coreDecoders = Object.values(CORE_DECODERS);
  const layers: (readonly AssetDecoder[])[] = [coreDecoders];
  const idOwners = new Map<string, string>();
  const idDecoders = new Map<string, AssetDecoder>();
  const extensionOwners = new Map<string, string>();

  for (const decoder of coreDecoders) {
    idOwners.set(decoder.id, CORE_PLUGIN_ID);
    idDecoders.set(decoder.id, decoder);
    for (const extension of decoder.extensions) {
      extensionOwners.set(asciiLower(extension), CORE_PLUGIN_ID);
    }
  }

  for (const plugin of plugins) {
    const decoders = plugin.decoders ?? [];
    const ids = new Set<string>();
    const extensions = new Set<string>();

    for (const decoder of decoders) {
      if (ids.has(decoder.id)) {
        throw new Error(`plugin "${plugin.id}" lists decoder id "${decoder.id}" more than once`);
      }
      ids.add(decoder.id);
      for (const extension of decoder.extensions) {
        if (extension.length === 0 || extension.includes(".")) {
          throw new Error(
            `decoder "${decoder.id}" declares extension "${extension}"; an extension is a bare, dotless name such as "png"`,
          );
        }
        const key = asciiLower(extension);
        if (extensions.has(key)) {
          throw new Error(
            `plugin "${plugin.id}" lists extension "${key}" more than once in its decoders`,
          );
        }
        extensions.add(key);
      }
    }

    for (const decoder of decoders) {
      const previousIdOwner = idOwners.get(decoder.id);
      const previousIdDecoder = idDecoders.get(decoder.id);
      if (previousIdOwner !== undefined) {
        logger.warn({
          level: "warn",
          code: "decoder.overridden",
          message: `decoder id "${decoder.id}" is defined by both "${previousIdOwner}" and "${plugin.id}"; "${plugin.id}" wins`,
          data: {
            kind: "decoder",
            claim: "id",
            name: decoder.id,
            previous: previousIdOwner,
            replacement: plugin.id,
          },
        });
      }

      for (const extension of decoder.extensions) {
        const key = asciiLower(extension);
        const previousExtensionOwner = extensionOwners.get(key);
        if (previousExtensionOwner !== undefined) {
          logger.warn({
            level: "warn",
            code: "decoder.overridden",
            message: `decoder extension "${key}" is defined by both "${previousExtensionOwner}" and "${plugin.id}"; "${plugin.id}" wins`,
            data: {
              kind: "decoder",
              claim: "extension",
              name: key,
              previous: previousExtensionOwner,
              replacement: plugin.id,
            },
          });
        }
        extensionOwners.set(key, plugin.id);
      }

      if (previousIdDecoder !== undefined) {
        for (const extension of previousIdDecoder.extensions) {
          const key = asciiLower(extension);
          if (extensionOwners.get(key) === previousIdOwner) {
            extensionOwners.delete(key);
          }
        }
      }
      idOwners.set(decoder.id, plugin.id);
      idDecoders.set(decoder.id, decoder);
    }
    layers.push(decoders);
  }

  return createLayeredAssetRegistry(layers);
}
