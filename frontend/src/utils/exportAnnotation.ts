import type { TextWithAnnotations, AnnotationResponse } from "@/api/types";

/** Export format options */
export type ExportFormat = "json" | "tei";

/** Prefix pattern for internal labels e.g. ["pos"]-v.past → export as v.past */
const LABEL_PREFIX_PATTERN = /^\["[^"]+"\]-/;

/**
 * Strip internal prefix from label/value for export (e.g. ["pos"]-v.past → v.past)
 */
function stripLabelPrefixForExport(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  return s.replace(LABEL_PREFIX_PATTERN, "");
}

/**
 * Escape XML special characters for TEI output
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Annotation types whose spans define the word tokens (<w>) of the annotated layer.
 * Every other layer is exported as stand-off <spanGrp>/<span> so that a token can
 * carry labels from several layers without repeating its text.
 */
const POS_ANNOTATION_TYPES = new Set([
  "pos",
  "part of speech",
  "part_of_speech",
  "parts of speech",
]);

function isPosAnnotation(ann: AnnotationResponse): boolean {
  return POS_ANNOTATION_TYPES.has((ann.annotation_type ?? "").trim().toLowerCase());
}

/** A <w> element of the annotated layer. */
type TeiToken = {
  id: string;
  start: number;
  end: number;
  text: string;
  lemma?: string;
  pos?: string;
};

/** A stand-off annotation pointing at a range of tokens. */
type TeiSpan = {
  from: string;
  to: string;
  label: string;
  name?: string;
  text: string;
};

/** Split content on newlines; each segment becomes one <u> in the annotated layer. */
function splitSegments(content: string): Array<{ start: number; end: number }> {
  const segments: Array<{ start: number; end: number }> = [];
  let start = 0;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") {
      segments.push({ start, end: i });
      start = i + 1;
    }
  }
  segments.push({ start, end: content.length });
  return segments;
}

/** Lemma written on a word token; falls back to the word itself. */
function tokenLemma(ann: AnnotationResponse, text: string): string {
  const rawLemma = ann.meta?.lemma;
  if (typeof rawLemma === "string" && rawLemma) return rawLemma;
  if (typeof rawLemma === "number" || typeof rawLemma === "boolean") return String(rawLemma);
  return text;
}

/**
 * Split annotations into the POS annotations that become words and the ones exported
 * stand-off. Words must not overlap, so of two overlapping POS spans the first one wins
 * and the other is kept as a stand-off span instead of being dropped.
 */
function partitionAnnotations(
  content: string,
  annotations: AnnotationResponse[]
): { words: AnnotationResponse[]; standoff: AnnotationResponse[] } {
  const standoff: AnnotationResponse[] = [];
  const posAnnotations: AnnotationResponse[] = [];

  for (const ann of annotations) {
    const withinContent =
      Number.isInteger(ann.start_position) &&
      Number.isInteger(ann.end_position) &&
      ann.start_position >= 0 &&
      ann.start_position < content.length &&
      ann.end_position > ann.start_position;
    if (!withinContent) continue;
    if (isPosAnnotation(ann)) posAnnotations.push(ann);
    else standoff.push(ann);
  }

  posAnnotations.sort(
    (a, b) => a.start_position - b.start_position || b.end_position - a.end_position
  );

  const words: AnnotationResponse[] = [];
  let claimedUpTo = 0;
  for (const ann of posAnnotations) {
    if (ann.start_position >= claimedUpTo) {
      words.push(ann);
      claimedUpTo = Math.min(ann.end_position, content.length);
    } else {
      standoff.push(ann);
    }
  }

  return { words, standoff };
}

/**
 * Tokenize one segment: the words starting in it, with the text between them as
 * attribute-less tokens, so the segment text is covered exactly once.
 */
function tokenizeSegment(
  content: string,
  segment: { start: number; end: number },
  words: AnnotationResponse[],
  firstWordIndex: number,
  firstTokenNumber: number
): { segmentTokens: TeiToken[]; nextWord: number } {
  const segmentTokens: TeiToken[] = [];
  const pushToken = (start: number, end: number, ann?: AnnotationResponse) => {
    const text = content.slice(start, end);
    if (!text) return;
    const token: TeiToken = {
      id: `w${firstTokenNumber + segmentTokens.length}`,
      start,
      end,
      text,
    };
    if (ann) {
      token.lemma = tokenLemma(ann, text);
      token.pos = stripLabelPrefixForExport(ann.label) || undefined;
    }
    segmentTokens.push(token);
  };

  let nextWord = firstWordIndex;
  let cursor = segment.start;
  while (nextWord < words.length && words[nextWord].start_position < segment.end) {
    const ann = words[nextWord];
    const start = Math.max(ann.start_position, cursor);
    const end = Math.min(ann.end_position, segment.end);
    if (end > start) {
      if (start > cursor) pushToken(cursor, start);
      pushToken(start, end, ann);
      cursor = end;
    }
    // A word that runs past this segment is continued in the next one
    if (ann.end_position > segment.end) break;
    nextWord++;
  }
  if (cursor < segment.end) pushToken(cursor, segment.end);

  return { segmentTokens, nextWord };
}

/**
 * Build the word tokens of the annotated layer from the POS annotations.
 * Tokens tile the content without gaps or overlaps, so the text is written exactly once.
 * Annotations that cannot become a token (other layers, overlapping POS spans) are
 * returned for stand-off export.
 */
function buildAnnotatedLayer(
  content: string,
  annotations: AnnotationResponse[]
): { segments: TeiToken[][]; tokens: TeiToken[]; standoff: AnnotationResponse[] } {
  const { words, standoff } = partitionAnnotations(content, annotations);
  const tokens: TeiToken[] = [];
  const segments: TeiToken[][] = [];
  let nextWord = 0;

  for (const segment of splitSegments(content)) {
    const tokenized = tokenizeSegment(content, segment, words, nextWord, tokens.length + 1);
    nextWord = tokenized.nextWord;
    tokens.push(...tokenized.segmentTokens);
    segments.push(tokenized.segmentTokens);
  }

  return { segments, tokens, standoff };
}

/** First and last token overlapping the character range, or undefined if there is none. */
function findTokenRange(
  tokens: TeiToken[],
  start: number,
  end: number
): { first: TeiToken; last: TeiToken } | undefined {
  let first: TeiToken | undefined;
  let last: TeiToken | undefined;
  for (const token of tokens) {
    if (token.end <= start) continue;
    if (token.start >= end) break;
    first ??= token;
    last = token;
  }
  return first && last ? { first, last } : undefined;
}

/** Map each stand-off annotation onto the token range it covers, grouped by annotation type. */
function buildStandoffGroups(
  content: string,
  tokens: TeiToken[],
  standoff: AnnotationResponse[]
): Map<string, TeiSpan[]> {
  const groups = new Map<string, TeiSpan[]>();

  for (const ann of standoff) {
    const start = ann.start_position;
    const end = Math.min(ann.end_position, content.length);
    const range = findTokenRange(tokens, start, end);
    if (!range) continue;
    const { first, last } = range;

    const type = (ann.annotation_type ?? "").trim() || "annotation";
    const label = stripLabelPrefixForExport(ann.label);
    // The UI stores the picked label in both `label` and `name`; only write @n
    // when the name is a real display name (e.g. a header title), not a copy.
    const name = ann.name && ann.name !== label ? ann.name : undefined;
    const spans = groups.get(type) ?? [];
    spans.push({
      from: first.id,
      to: last.id,
      label,
      name,
      text: ann.selected_text || content.slice(start, end),
    });
    groups.set(type, spans);
  }

  return groups;
}

/**
 * Convert text and annotations to TEI XML annotated layer format.
 * Includes: teiHeader, diplomatic layer (plain text), annotated layer (w elements with
 * lemma/pos) and one stand-off spanGrp per non-POS annotation layer (e.g. Animacy).
 */
function convertToTeiXml(textData: TextWithAnnotations): string {
  const TEI_NS = "http://www.tei-c.org/ns/1.0";
  const title = escapeXml(textData.title);
  const content = textData.content;
  // Use diplomatic field for the diplomatic layer when available; otherwise fall back to content
  const diplomaticContent =
    textData.diplomatic_text != null && textData.diplomatic_text !== ""
      ? textData.diplomatic_text
      : content;
  const lang = textData.language ? ` xml:lang="${escapeXml(textData.language)}"` : "";

  const { segments, tokens, standoff } = buildAnnotatedLayer(
    content,
    textData.annotations || []
  );

  const uElements = segments.map((segmentTokens, index) => {
    const ws = segmentTokens.map((token) => {
      const attrs = [`xml:id="${token.id}"`];
      if (token.lemma !== undefined) attrs.push(`lemma="${escapeXml(token.lemma)}"`);
      if (token.pos) attrs.push(`pos="${escapeXml(token.pos)}"`);
      return `          <w ${attrs.join(" ")}>${escapeXml(token.text)}</w>`;
    });
    return `        <u xml:id="ann_u${index + 1}">\n${ws.join("\n")}\n        </u>`;
  });

  const spanGroups = [...buildStandoffGroups(content, tokens, standoff)].map(
    ([type, spans]) => {
      const spanElements = spans.map((span) => {
        const attrs = [`from="#${span.from}"`, `to="#${span.to}"`];
        if (span.label) attrs.push(`ana="${escapeXml(span.label)}"`);
        if (span.name) attrs.push(`n="${escapeXml(span.name)}"`);
        return `          <span ${attrs.join(" ")}>${escapeXml(span.text)}</span>`;
      });
      return `        <spanGrp type="${escapeXml(type)}">\n${spanElements.join("\n")}\n        </spanGrp>`;
    }
  );

  const annotatedLayer = [...uElements, ...spanGroups].join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="${TEI_NS}">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title type="main">${title}</title>
      </titleStmt>
      <publicationStmt>
        <p>Exported from webuddhist annotation tool</p>
      </publicationStmt>
      <sourceDesc>
        <bibl>
          <title type="main">${title}</title>
          ${textData.source ? `<idno type="source">${escapeXml(textData.source)}</idno>` : ""}
        </bibl>
      </sourceDesc>
    </fileDesc>
    <profileDesc/>
  </teiHeader>
  <text${lang}>
    <body>
      <div type="transcription" subtype="diplomatic">
        <p>${escapeXml(diplomaticContent)}</p>
      </div>
      <div type="transcription" subtype="annotated">
${annotatedLayer}
      </div>
    </body>
  </text>
</TEI>`;
}

/**
 * Exports text and annotations as a TEI XML file download
 */
export function exportAsTeiXmlFile(
  textData: TextWithAnnotations,
  filename?: string
): void {
  const xml = convertToTeiXml(textData);
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    filename || `${textData.title.replace(/[^a-z0-9]/gi, "_")}.xml`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export format matching BULK_UPLOAD_FORMAT.md specification
 */
export interface BulkUploadFormat {
  text: {
    title: string;
    content: string;
    translation?: string;
    source?: string;
    language?: string;
    annotation_type_id?: string;
  };
  annotations: Array<{
    annotation_type: string;
    start_position: number;
    end_position: number;
    selected_text?: string;
    label?: string;
    name?: string;
    meta?: Record<string, unknown>;
    confidence?: number;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Converts text and annotations to bulk upload format
 */
export function convertToBulkUploadFormat(
  textData: TextWithAnnotations
): BulkUploadFormat {
  const format: BulkUploadFormat = {
    text: {
      title: textData.title,
      content: textData.content,
    },
    annotations: [],
  };

  // Add optional text fields
  if (textData.translation) {
    format.text.translation = textData.translation;
  }
  if (textData.source) {
    format.text.source = textData.source;
  }
  if (textData.language) {
    format.text.language = textData.language;
  }
  if (textData.annotation_type_id) {
    format.text.annotation_type_id = textData.annotation_type_id;
  }

  // Convert annotations (strip ["pos"]- etc. from label for export)
  format.annotations = textData.annotations.map((ann: AnnotationResponse) => {
    const annotation: BulkUploadFormat["annotations"][0] = {
      annotation_type: ann.annotation_type,
      start_position: ann.start_position,
      end_position: ann.end_position,
    };

    // Add optional annotation fields
    if (ann.selected_text) {
      annotation.selected_text = ann.selected_text;
    }
    const exportedLabel = stripLabelPrefixForExport(ann.label);
    if (exportedLabel) {
      annotation.label = exportedLabel;
    }
    if (ann.name) {
      annotation.name = ann.name;
    }
    if (ann.meta) {
      annotation.meta = ann.meta;
    }
    if (ann.confidence !== undefined && ann.confidence !== null) {
      annotation.confidence = ann.confidence;
    }

    return annotation;
  });

  return format;
}

/**
 * Exports text and annotations as a JSON file download
 */
export function exportAsJsonFile(
  textData: TextWithAnnotations,
  filename?: string
): void {
  const format = convertToBulkUploadFormat(textData);
  const jsonString = JSON.stringify(format, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `${textData.title.replace(/[^a-z0-9]/gi, "_")}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
