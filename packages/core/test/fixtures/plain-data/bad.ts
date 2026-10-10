// Plain-data fixtures that must FAIL to typecheck: each value is not JSON
// (G1.2, AD-7).
import type { AssertPlainData, PlainData } from "../../../src/index.ts";

export type FnIsNotPlainData = AssertPlainData<() => number>;

export type UndefinedIsNotPlainData = AssertPlainData<undefined>;

export type MapIsNotPlainData = AssertPlainData<Map<string, number>>;

class Holder {
  value = 1;
  read(): number {
    return this.value;
  }
}

export type ClassIsNotPlainData = AssertPlainData<Holder>;

export const functionValue: PlainData = () => 1;
