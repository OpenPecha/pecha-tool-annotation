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

## Preparing a file to import: which layer names to use

`spanGrp/@type` (and a layer attribute on `<w>`) must match the name of an existing
category **exactly**, except for letter case. Not close, not abbreviated — exactly the
same letters, spaces and punctuation. If it doesn't match, the tool doesn't complain:
it silently creates a brand-new category with whatever name you wrote, and your
annotations land there instead of merging into the one you meant.

This is the most common way a project ends up with confusing duplicate categories, e.g.
`roles` and `Semantic roles  Features` (note the double space — that's the current real
name) existing side by side because one import used a short form.

**Before you prepare a file, get the current exact names from your project.** As of this
writing, the categories are:

| Exact name to write in `spanGrp/@type` | |
| --- | --- |
| `Animacy` | |
| `Codicological/Philological Features` | |
| `Content Features` | |
| `Semantic roles  Features` | has a double space between "roles" and "Features" — copy/paste it, don't retype it |
| `Text Correction` | |
| `pos` | drives `<w>` tokens directly, see above — not a spanGrp |

These names can change (categories get renamed or merged), so treat this table as a
snapshot, not a permanent reference — check with the project admin or the categories
list in the tool if you're unsure. Do **not** invent short forms like `roles`, `content`,
or `phil`: there is no separate code system, the category name *is* the code.

### Worked example

```xml
<spanGrp type="Animacy">
  <span from="#w12293" to="#w12293" ana="human">སྒོ་སྲུང་</span>
  <span from="#w12299" to="#w12299" ana="inanimate">མ་སྐྱེས་དགྲ་</span>
</spanGrp>
<spanGrp type="Semantic roles  Features">
  <span from="#w12293" to="#w12293" ana="agent">སྒོ་སྲུང་</span>
  <span from="#w12294" to="#w12295" ana="theme">གིས་བཟུང་</span>
</spanGrp>
<spanGrp type="Content Features">
  <span from="#w13" to="#w14" ana="HIPPO">བདག་ཀྱང་</span>
</spanGrp>
<spanGrp type="Codicological/Philological Features">
  <span from="#w51" to="#w53" ana="small">བསམས་ནས།</span>
</spanGrp>
<spanGrp type="Text Correction">
  <span from="#w122" to="#w127" ana="Other">ད་ཅེས་ཐོས་ནས།ཕྱི</span>
</spanGrp>
```

### `spanGrp/@type` values found in a sample export

Pulled directly from one export file, in the order they appear:

1. `Animacy`
2. `roles`
3. `Content Features`
4. `Semantic roles Features` (single space)
5. `Codicological/Philological Features`
6. `Text Correction`

Two of these are not the canonical names from the table above and will each create a new,
separate category on import instead of merging into the intended one:

- `roles` — should be `Semantic roles  Features` (double space)
- `Semantic roles Features` (single space) — also does not match `Semantic roles  Features`
  (double space) in the database

Until the database name is fixed to a single space, **neither** `roles` nor
`Semantic roles Features` will import correctly — only `Semantic roles  Features`, typed
with the double space exactly as stored, currently matches.

Every `<span>` still uses `ana="..."` for its value regardless of which category it's
in — `ana` is the standard TEI attribute for "the value of this span," it's not
category-specific. The category comes entirely from `spanGrp/@type`.

### Matching spans back to tokens in your own scripts

A span's `from`/`to` already points at the exact `xml:id` of the `<w>` it covers
(`from="#w12293"` ↔ `<w xml:id="w12293">`), so a script can join spans to tokens on that
id directly — you don't need any extra field for this.

### Checklist before importing

- [ ] Every `spanGrp/@type` is copy-pasted from the current category list, not retyped
      from memory (watch for extra/missing spaces, different capitalization, `/` vs `-`)
- [ ] Every `<span>` uses `ana="..."` for its value, `from`/`to` (or `target`) for the
      token range, and points at `<w xml:id="...">`s that actually exist in the file
- [ ] Single-token labels can also be written as a plain attribute on `<w>` instead
      (e.g. `animacy="human"`) — the attribute name is matched the same way, exactly
      against an existing category name, case-insensitive only

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
