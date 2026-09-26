import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInstance, SOP_CLASS, type InstanceSpec } from '../dicom/build';
import { parseDicom, pixels, str, num, nums } from '../dicom/reader';
import { uidFor } from '../dicom/uid';
import { writeDicom, tag } from '../dicom/writer';

const spec = (over: Partial<InstanceSpec> = {}): InstanceSpec => ({
  modality: 'CT',
  patient: {
    name: 'SUBRAMANIAM^MEENAKSHI',
    id: 'SHRI-TEST-1',
    birthDate: '19691103',
    sex: 'F',
    age: '056Y',
  },
  study: {
    uid: uidFor('study'),
    date: '20260625',
    time: '080500',
    accession: '26-27/018342',
    description: 'CT Brain — plain',
    institution: 'IndoStates Health Hospital, Coimbatore',
    referringPhysician: 'Emergency Department',
    studyId: '1',
  },
  series: {
    uid: uidFor('series'),
    number: 1,
    description: 'Axial 5 mm',
    date: '20260625',
    time: '080500',
    bodyPart: 'HEAD',
    imageType: ['DERIVED', 'SECONDARY', 'AXIAL'],
    derivation: 'test',
  },
  instance: { uid: uidFor('i1'), number: 7, contentDate: '20260625', contentTime: '080500' },
  geometry: {
    rows: 2,
    columns: 3,
    pixelSpacing: [0.488, 0.488],
    sliceThickness: 5,
    position: [-125, -125, -40.5],
    orientation: [1, 0, 0, 0, 1, 0],
    sliceLocation: -40.5,
  },
  pixels: { data: Int16Array.from([-1000, 0, 40, 80, 1200, -24]), bitsStored: 16 },
  display: { center: 40, width: 80, intercept: 0, slope: 1, rescaleType: 'HU' },
  comments:
    'Courtesy of the U.S. National Library of Medicine, Visible Human Project. Illustrative image — not of this patient.',
  ...over,
});

describe('DICOM writer — a valid Part 10 file, read back exactly', () => {
  it('preamble, DICM, meta header with group length, explicit VR LE', () => {
    const bytes = buildInstance(spec());
    assert.equal(String.fromCharCode(...bytes.slice(128, 132)), 'DICM');
    const d = parseDicom(bytes);
    assert.equal(d.transferSyntax, '1.2.840.10008.1.2.1');
    assert.equal(str(d, 0x0002, 0x0002), SOP_CLASS.CT);
    const gl = d.elements.get(tag(0x0002, 0x0000))!;
    const metaEnd = [...d.elements.values()]
      .filter((e) => e.tag >>> 16 === 2)
      .reduce((m, e) => Math.max(m, e.offset + e.length), 0);
    const dv = new DataView(bytes.buffer, bytes.byteOffset);
    assert.equal(
      dv.getUint32(gl.offset, true),
      metaEnd - (gl.offset + 4),
      'group length covers the rest of group 0002',
    );
  });

  it('round-trips identity, geometry, display and pixels (signed HU)', () => {
    const d = parseDicom(buildInstance(spec()));
    assert.equal(str(d, 0x0010, 0x0010), 'SUBRAMANIAM^MEENAKSHI');
    assert.equal(str(d, 0x0010, 0x0040), 'F');
    assert.equal(num(d, 0x0020, 0x0013), 7);
    assert.deepEqual(nums(d, 0x0020, 0x0032), [-125, -125, -40.5]);
    assert.equal(num(d, 0x0028, 0x1050), 40);
    const p = pixels(d);
    assert.deepEqual([p.rows, p.columns], [2, 3]);
    assert.deepEqual([...p.data], [-1000, 0, 40, 80, 1200, -24]);
  });

  it('every value has even length; UIDs pad with NUL, text with a space', () => {
    const d = parseDicom(buildInstance(spec({ study: { ...spec().study, accession: '123' } })));
    for (const el of d.elements.values())
      assert.equal(el.length % 2, 0, `tag ${el.tag.toString(16)}`);
    const acc = d.elements.get(tag(0x0008, 0x0050))!;
    assert.equal(d.bytes[acc.offset + acc.length - 1], 0x20);
  });

  it('no source identity can survive: the build takes only the spec', () => {
    const bytes = buildInstance(spec());
    const text = Buffer.from(bytes).toString('latin1');
    for (const leak of ['HARVARD', 'UTRECHT', '1.3.46.670589', 'huntsville', 'DENVER'])
      assert.ok(!text.includes(leak), leak);
    assert.ok(text.includes('Courtesy of the U.S. National Library of Medicine'));
    assert.equal(
      str(parseDicom(bytes), 0x0008, 0x0070),
      '',
      'Manufacturer is empty — no scanner is claimed',
    );
  });

  it('refuses duplicate tags and caller-supplied group 0002', () => {
    assert.throws(() =>
      writeDicom({
        sopClassUid: SOP_CLASS.CT,
        sopInstanceUid: '1.2',
        elements: [
          { tag: tag(0x0010, 0x0010), vr: 'PN', value: 'A' },
          { tag: tag(0x0010, 0x0010), vr: 'PN', value: 'B' },
        ],
      }),
    );
    assert.throws(() =>
      writeDicom({
        sopClassUid: SOP_CLASS.CT,
        sopInstanceUid: '1.2',
        elements: [{ tag: tag(0x0002, 0x0010), vr: 'UI', value: '1.2' }],
      }),
    );
  });
});

describe('uidFor — deterministic 2.25 UIDs', () => {
  it('same key → same UID; valid length and form', () => {
    assert.equal(uidFor('a'), uidFor('a'));
    assert.notEqual(uidFor('a'), uidFor('b'));
    const u = uidFor('study/brain');
    assert.match(u, /^2\.25\.[1-9]\d*$/);
    assert.ok(u.length <= 64);
  });
});

describe('frames stream helpers', () => {
  it('centre-out from the key image covers every frame exactly once', async () => {
    const { centreOut } = await import('../../reports/imaging.service');
    assert.deepEqual(centreOut([1, 2, 3, 4, 5], 3), [3, 4, 2, 5, 1]);
    assert.deepEqual(centreOut([1, 2, 3, 4], null), [3, 4, 2, 1]);
    assert.deepEqual(centreOut([7], 7), [7]);
    const many = Array.from({ length: 28 }, (_, i) => i + 1);
    assert.deepEqual(
      [...centreOut(many, 14)].sort((a, b) => a - b),
      many,
    );
  });
  it('?only= accepts positive integers and refuses anything else', async () => {
    const { parseOnly } = await import('../../reports/imaging.service');
    assert.equal(parseOnly(undefined), null);
    assert.deepEqual([...(parseOnly('3,4, 9') ?? [])], [3, 4, 9]);
    assert.throws(() => parseOnly('1,x'));
    assert.throws(() => parseOnly('0'));
  });
});
