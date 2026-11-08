import { crc32, deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { readXlsx } from "./xlsxRead";

// A .zip as Excel writes one: each file deflated, a central directory.
function zip(files: Record<string, string>): ArrayBuffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text, "utf8");
    const packed = deflateRawSync(data);
    const nameBytes = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + packed.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  const all = Buffer.concat([...locals, directory, end]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength);
}

describe("readXlsx", () => {
  it("reads the first sheet: shared and inline text, numbers, dates by their format, skipped rows", async () => {
    const book = zip({
      "xl/workbook.xml": '<workbook><sheets><sheet name="Money" sheetId="1" r:id="rId3"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId3" Target="worksheets/sheet7.xml"/></Relationships>',
      "xl/sharedStrings.xml": '<sst><si><t>Date</t></si><si><t>Note</t></si><si><r><t>Bazar &amp; </t></r><r><t>fish</t></r></si></sst>',
      "xl/styles.xml": '<styleSheet><numFmts><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="h:mm"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>',
      "xl/worksheets/sheet7.xml":
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="inlineStr"><is><t>Amount</t></is></c></row>' +
        '<row r="3"><c r="A3" s="2"><v>46331</v></c><c r="B3" t="s"><v>2</v></c><c r="C3"><v>2350.5</v></c></row>' +
        '<row r="4"><c r="A4" s="1"><v>46332</v></c><c r="C4" s="3"><v>0.5</v></c></row></sheetData></worksheet>',
    });
    expect(await readXlsx(book)).toEqual([["Date", "Note", "Amount"], [], ["2026-11-05", "Bazar & fish", "2350.5"], ["2026-11-06", "", "0.5"]]);
  });

  it("refuses a file that isn't a workbook", async () => {
    await expect(readXlsx(new TextEncoder().encode("Date,Amount\n").buffer as ArrayBuffer)).rejects.toThrow();
  });
});
