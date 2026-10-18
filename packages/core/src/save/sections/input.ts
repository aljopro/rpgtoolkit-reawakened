/** Owner: core/input (AD-10/AD-14). */

export type InputKeyState = {
  readonly seq: number;
  readonly name: string;
  readonly code: string;
  readonly char: string | null;
};

export type InputSection = {
  nextSeq: number;
  keys: InputKeyState[];
  held: { [name: string]: boolean };
  pointer: { x: number; y: number; buttons: number };
  focused: boolean;
};
