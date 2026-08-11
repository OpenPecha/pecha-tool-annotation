# TEI XML Format

How the annotation tool reads and writes TEI P5 files, and how to prepare an input file
that already contains several annotation layers (for example POS **and** Animacy).

## The annotated layer defines the words

The tool reads its text from `<div type="transcription" subtype="annotated">`. Each `<w>`
inside it is one word, and the text of the document is the concatenation of those words.
A `<u>` element marks a segment; the tool inserts a line break after the last word of each `<u>`.

```xml
<div type="transcription" subtype="annotated">
  <u xml:id="ann_u1">
    <w xml:id="w1" lemma="ཞེས་" pos="cl.quot">ཞེས་</w>
    <w xml:id="w2" lemma="བསྒོ་བ་" pos="n.v.invar">བསྒོ་བ་</w>
    <w xml:id="w3" lemma="དང་" pos="case.ass">དང་</w>
    <w xml:id="w4" lemma="།" pos="punc">།</w>
  </u>
</div>
```

A word must appear **exactly once**. Repeating a word to give it a second label would change
the text itself, so additional layers are attached to the existing words instead, in one of
the two ways below.

Give every `<w>` an `xml:id`. Stand-off annotations point at those ids. `<w>` elements without
`pos` or `lemma` are plain text (spacing, unannotated stretches) and produce no annotation.

## Layer on a single word: an attribute on `<w>`

Any attribute that is not a standard TEI word attribute is read as `layer="label"`. This is the
shortest way to write a layer that never spans more than one word.

```xml
<w xml:id="w2" lemma="བསྒོ་བ་" pos="n.v.invar" animacy="human">བསྒོ་བ་</w>
```

This creates a POS annotation `n.v.invar` **and** an Animacy annotation `human` on the same word.
The layer name is matched against your existing annotation types ignoring case, so `animacy`
lands in the `Animacy` list rather than creating a second type.

Reserved (ignored as layers): `lemma`, `pos`, `xml:id`, `n`, `type`, `subtype`, `xml:lang`,
`rend`, `rendition`, `ana`, `corresp`, `facs`, `part`, `join`, `cert`, `resp`, `next`, `prev`,
`sameAs`, `copyOf`, `select`, `norm`, `orig`, `reg`.

## Layer over several words: stand-off `<spanGrp>`

A label that covers a phrase is written as a `<span>` pointing at the first and last word it
covers. Put the `<spanGrp>` inside the annotated `<div>`, after the `<u>` elements.

```xml
<spanGrp type="Animacy">
  <span from="#w1" to="#w4" ana="human">ཞེས་བསྒོ་བ་དང་།</span>
</spanGrp>
<spanGrp type="Semantic Roles">
  <span from="#w2" to="#w2" ana="agent" n="main agent">བསྒོ་བ་</span>
</spanGrp>
```

| Attribute | Meaning |
| --- | --- |
| `spanGrp/@type` | Annotation type (layer) for every span in the group |
| `span/@type` | Overrides the group type for a single span |
| `span/@from`, `span/@to` | First and last `<w>` covered, as `#id` |
| `span/@target` | Alternative to from/to; a space separated list of `#id` |
| `span/@ana` | The label. A leading `#` is stripped, so `human` and `#human` are equivalent |
| `span/@n` | Optional display name |
| span content | Ignored on import; written on export for readability |

Spans may overlap each other and overlap POS words freely, in any number of layers.

## What the tool exports

The TEI export writes the same structure: `<w>` elements carrying `lemma` and `pos`, and one
`<spanGrp>` per non-POS layer. Uploading an exported file reproduces the same text and the same
annotations, so export → annotate → re-upload is a lossless cycle for POS and every other layer.

Annotation types named `pos`, `part of speech` or `part_of_speech` become the `<w>` tokens; every
other type is exported as a stand-off group.

## From CoNLL-U (token / pos / animacy columns)

If your pipeline produces a simple CoNLL-U-style file — one token per line, tab or
space separated, blank line between sentences — map it onto `<w>` like this:

| CoNLL-U column | TEI |
| --- | --- |
| token (form) | `<w>` text content |
| pos | `pos="..."` attribute |
| animacy (3rd column, blank for most tokens) | `animacy="..."` attribute — **only** this name works, see below |

```
# input.conllu
རྒྱལ་པོ་	n.count	human
མ་སྐྱེས་དགྲ་	n.prop	animate
ནི	part
```

becomes:

```xml
<div type="transcription" subtype="annotated">
  <u xml:id="ann_u1">
    <w xml:id="w1" pos="n.count" animacy="human">རྒྱལ་པོ་</w>
    <w xml:id="w2" pos="n.prop" animacy="animate">མ་སྐྱེས་དགྲ་</w>
    <w xml:id="w3" pos="part">ནི</w>
  </u>
</div>
```

**Common mistake:** writing the animacy value into `ana="human"` and/or `n="human"` on
the `<w>` itself. Both `ana` and `n` are reserved TEI word attributes (see the reserved
list above) and are silently ignored there — nothing shows up after upload, with no error.
`ana`/`n` only mean something on a stand-off `<span>` (see previous section); on `<w>` use
`animacy="..."` instead. Lemma is optional — if your CoNLL-U has no lemma column, just
omit `lemma` (the tool falls back to the word text itself).

A ready-to-use converter for exactly this 2-or-3-column format is at
[`scripts/conllu_to_tei.py`](../../../scripts/conllu_to_tei.py):

```bash
python scripts/conllu_to_tei.py input.conllu output.xml --title "My Text"
```

## JSON alternative

`Export → JSON` produces the bulk upload format described in
[BULK_UPLOAD_FORMAT.md](./BULK_UPLOAD_FORMAT.md). It carries every annotation field, including
`meta` and `confidence`, and also supports overlapping annotations. Use it when you need full
fidelity rather than a TEI document.
