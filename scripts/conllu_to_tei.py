"""Convert a simple CoNLL-U-style file (token, pos, optional animacy columns)
into the TEI XML format the webuddhist annotation tool expects on upload.

Input format (tab or whitespace separated, one token per line):

    token   pos   animacy
    token   pos
    <blank line = segment/sentence boundary>

The animacy column is optional per line/file. Any value there is written as
the `animacy="..."` attribute on <w> (NOT `ana`/`n` — those are reserved
TEI attributes the tool's parser ignores; see frontend/public/docs/TEI_XML_FORMAT.md).

Usage:
    python scripts/conllu_to_tei.py input.conllu output.xml --title "My Text"
"""

import argparse
import sys
from xml.sax.saxutils import escape, quoteattr

TEI_NS = "http://www.tei-c.org/ns/1.0"


def read_sentences(path):
    """Yield lists of (token, pos, animacy_or_None) per blank-line-separated sentence."""
    sentence = []
    with open(path, encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n\r")
            if not line.strip():
                if sentence:
                    yield sentence
                    sentence = []
                continue
            fields = line.split("\t") if "\t" in line else line.split()
            if len(fields) < 2:
                raise ValueError(f"Expected at least token and pos columns, got: {line!r}")
            token, pos = fields[0], fields[1]
            animacy = fields[2].strip() if len(fields) > 2 and fields[2].strip() else None
            sentence.append((token, pos, animacy))
    if sentence:
        yield sentence


def build_tei(sentences, title):
    word_counter = 0
    u_blocks = []
    for u_index, sentence in enumerate(sentences, start=1):
        w_elements = []
        for token, pos, animacy in sentence:
            word_counter += 1
            attrs = [f'xml:id="w{word_counter}"', f"pos={quoteattr(pos)}"]
            if animacy:
                attrs.append(f"animacy={quoteattr(animacy)}")
            w_elements.append(f'        <w {" ".join(attrs)}>{escape(token)}</w>')
        u_blocks.append(
            f'      <u xml:id="ann_u{u_index}">\n' + "\n".join(w_elements) + "\n      </u>"
        )
    annotated_layer = "\n".join(u_blocks)

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="{TEI_NS}">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title type="main">{escape(title)}</title>
      </titleStmt>
      <publicationStmt>
        <p>Converted from CoNLL-U</p>
      </publicationStmt>
      <sourceDesc>
        <bibl>
          <title type="main">{escape(title)}</title>
        </bibl>
      </sourceDesc>
    </fileDesc>
    <profileDesc/>
  </teiHeader>
  <text>
    <body>
      <div type="transcription" subtype="annotated">
{annotated_layer}
      </div>
    </body>
  </text>
</TEI>"""


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="Path to the CoNLL-U-style input file")
    parser.add_argument("output", help="Path to write the TEI XML file")
    parser.add_argument("--title", default="Untitled", help="Title for the TEI teiHeader")
    args = parser.parse_args()

    sentences = list(read_sentences(args.input))
    if not sentences:
        print("No tokens found in input file.", file=sys.stderr)
        sys.exit(1)

    xml = build_tei(sentences, args.title)
    with open(args.output, "w", encoding="utf-8") as f:
        f.write(xml)

    total_tokens = sum(len(s) for s in sentences)
    total_animacy = sum(1 for s in sentences for _, _, a in s if a)
    print(f"Wrote {args.output}: {len(sentences)} segments, {total_tokens} tokens, "
          f"{total_animacy} with animacy label.")


if __name__ == "__main__":
    main()
