declare module "opentype.js" {
  export interface TableHhea {
    ascender: number;
    descender: number;
    lineGap: number;
  }

  export interface PathCommand {
    type: "M" | "L" | "C" | "Q" | "Z";
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export interface Path {
    commands: PathCommand[];
  }

  export interface Glyph {
    index: number;
    name?: string;
    unicode?: number;
    unicodes?: number[];
    advanceWidth: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  export interface GlyphSet {
    length: number;
    get(index: number): Glyph;
    glyphs: Record<number, Glyph>;
  }

  export interface LocalizedName {
    en?: string;
    [locale: string]: string | undefined;
  }

  export interface NameRecords {
    fontFamily?: LocalizedName;
    fontSubfamily?: LocalizedName;
    fullName?: LocalizedName;
    postScriptName?: LocalizedName;
    [key: string]: LocalizedName | undefined;
  }

  export interface FontNames {
    fontFamily?: LocalizedName;
    fontSubfamily?: LocalizedName;
    fullName?: LocalizedName;
    postScriptName?: LocalizedName;
    macintosh?: NameRecords;
    windows?: NameRecords;
    [key: string]: unknown;
  }

  export interface FontTables {
    hhea: TableHhea;
    [key: string]: unknown;
  }

  export interface Font {
    names: FontNames;
    unitsPerEm: number;
    ascender: number;
    descender: number;
    tables: FontTables;
    glyphs: GlyphSet;
    charToGlyph(ch: string): Glyph;
    getKerningValue(leftGlyph: Glyph | number, rightGlyph: Glyph | number): number;
  }

  export interface OpentypeApi {
    parse(buffer: ArrayBuffer): Font;
  }

  const opentype: OpentypeApi;
  export default opentype;
}
