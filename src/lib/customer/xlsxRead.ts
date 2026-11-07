// Reads the first sheet of an Excel workbook (.xlsx) in the browser, as rows
// of text, with nothing to install: a workbook is a .zip of XML files, the
// browser inflates them (DecompressionStream), and the cells are read from
// the XML. A cell formatted as a date comes back as YYYY-MM-DD.

interface ZipEntry {
  method: number;
  size: number;
  offset: number;
}

function zipEntries(bytes: Uint8Array): Map<string, ZipEntry> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65_557); at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      end = at;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = new Map<string, ZipEntry>();
  const decoder = new TextDecoder();
  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("bad zip");
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    entries.set(name, { method: view.getUint16(at + 10, true), size: view.getUint32(at + 20, true), offset: view.getUint32(at + 42, true) });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry | undefined): Promise<string | null> {
  if (!entry) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const start = entry.offset + 30 + view.getUint16(entry.offset + 26, true) + view.getUint16(entry.offset + 28, true);
  const data = bytes.slice(start, start + entry.size);
  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new Error("unsupported compression");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const unescape = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, name: string) =>
    name[0] === "#" ? String.fromCodePoint(name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : Number(name.slice(1))) : ENTITIES[name.toLowerCase()],
  );
// All the text runs inside an element (<t>…</t>, rich text included).
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => unescape(match[1])).join("");
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

const columnIndex = (ref: string) => {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  return [...letters].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
};

// The number formats Excel shows as dates: its own (14-22) and any custom
// one with a day, month or year in it.
function dateStyles(styles: string | null): Set<number> {
  const dated = new Set<number>();
  if (!styles) return dated;
  const custom = new Map<number, string>([...styles.matchAll(/<numFmt\s[^>]*>/g)].map((match) => [Number(attr(match[0], "numFmtId")), unescape(attr(match[0], "formatCode") ?? "")]));
  const xfs = /<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? "";
  [...xfs.matchAll(/<xf\s[^>]*?\/?>/g)].forEach((match, index) => {
    const id = Number(attr(match[0], "numFmtId") ?? 0);
    const code = (custom.get(id) ?? "").replace(/"[^"]*"|\[[^\]]*\]/g, "");
    // A month (m) without hours or seconds; with them, m is minutes.
    if ((id >= 14 && id <= 22) || /[dy]/i.test(code) || (/m/i.test(code) && !/[hs]/i.test(code))) dated.add(index);
  });
  return dated;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);
  const entries = zipEntries(bytes);
  const workbook = (await readEntry(bytes, entries.get("xl/workbook.xml"))) ?? "";
  const rels = (await readEntry(bytes, entries.get("xl/_rels/workbook.xml.rels"))) ?? "";
  const firstSheet = /<sheet\s[^>]*>/.exec(workbook)?.[0];
  const relId = firstSheet ? attr(firstSheet, "r:id") : undefined;
  const target = relId ? [...rels.matchAll(/<Relationship\s[^>]*>/g)].map((match) => match[0]).find((tag) => attr(tag, "Id") === relId) : undefined;
  const path = target ? attr(target, "Target")!.replace(/^\/?(xl\/)?/, "xl/") : "xl/worksheets/sheet1.xml";
  const sheet = await readEntry(bytes, entries.get(path) ?? entries.get("xl/worksheets/sheet1.xml"));
  if (sheet === null) throw new Error("no sheet");
  const shared = [...((await readEntry(bytes, entries.get("xl/sharedStrings.xml"))) ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => textOf(match[1]));
  const dated = dateStyles(await readEntry(bytes, entries.get("xl/styles.xml")));
  const base = /date1904="(1|true)"/.test(workbook) ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\s([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const number = Number(attr(` ${rowMatch[1]}`, "r") ?? rows.length + 1);
    const row: string[] = [];
    for (const cellMatch of (rowMatch[2] ?? "").matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = ` ${cellMatch[1]}`;
      const inner = cellMatch[2] ?? "";
      const type = attr(tag, "t");
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value = "";
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = textOf(inner);
      else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
      else if (type === "e") value = "";
      else if (raw !== undefined) {
        value = unescape(raw);
        const style = Number(attr(tag, "s") ?? -1);
        if (type !== "str" && dated.has(style) && /^\d+(\.\d+)?$/.test(value)) value = day(base + Math.floor(Number(value)) * 86_400_000);
      }
      const ref = attr(tag, "r");
      row[ref ? columnIndex(ref) : row.length] = value;
    }
    // Rows the sheet skips are blank rows, so numbers match the file's.
    while (rows.length < number - 1) rows.push([]);
    rows.push(Array.from(row, (value) => value ?? ""));
  }
  return rows;
}
