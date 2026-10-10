// expect-rule: none
// Relative paths and package subpaths must not be mistaken for Node built-ins.
import { stream } from "./stream/index.ts";
import { queue } from "./events/queue.ts";
import { state } from "./vm/state.ts";
import { util } from "some-lib/util";

export const combined = [stream, queue, state, util];
