import type { TextWithAnnotations, AnnotationResponse } from "@/api/types";

/** Export format options */
export type ExportFormat = "json" | "tei";

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
 * Convert text and annotations to TEI XML annotated layer format.
 * Produces output similar to input TEI structure with correct annotated data.
 * Includes: teiHeader, diplomatic layer (plain text), annotated layer (w elements with lemma, pos).
 */
function convertToTeiXml(textData: TextWithAnnotations): string {
  const TEI_NS = "http://www.tei-c.org/ns/1.0";
  const title = escapeXml(textData.title);
  const content = textData.content;
  const lang = textData.language ? ` xml:lang="${escapeXml(textData.language)}"` : "";

  // Sort annotations by start_position
  const sorted = [...(textData.annotations || [])].sort(
    (a, b) => a.start_position - b.start_position
  );

  // Build w elements: annotated spans as <w lemma="..." pos="...">text</w>, gaps as <w>text</w>
  const wElements: string[] = [];
  let pos = 0;

  for (const ann of sorted) {
    const gapStart = ann.start_position;
    const gapEnd = ann.end_position;

    // Unannotated text before this annotation
    if (gapStart > pos) {
      const gapText = content.slice(pos, gapStart);
      if (gapText) {
        wElements.push(`<w>${escapeXml(gapText)}</w>`);
      }
    }

    const text = ann.selected_text ?? content.slice(gapStart, gapEnd);
    if (text) {
      const rawLemma = ann.meta?.lemma;
      const lemma =
        typeof rawLemma === "string"
          ? rawLemma
          : rawLemma != null
            ? String(rawLemma)
            : text;
      const posTag = ann.label ?? "";
      const attrs = [`lemma="${escapeXml(lemma)}"`];
      if (posTag) attrs.push(`pos="${escapeXml(posTag)}"`);
      wElements.push(`<w ${attrs.join(" ")}>${escapeXml(text)}</w>`);
    }
    pos = gapEnd;
  }

  // Trailing unannotated text
  if (pos < content.length) {
    const gapText = content.slice(pos);
    if (gapText) {
      wElements.push(`<w>${escapeXml(gapText)}</w>`);
    }
  }

  const annotatedWs = wElements.map((w) => "          " + w).join("\n\n          ");

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
        <p>${escapeXml(content)}</p>
      </div>
      <div type="transcription" subtype="annotated">
        <u xml:id="ann_u1">
          ${annotatedWs}
        </u>
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

  // Convert annotations
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
    if (ann.label) {
      annotation.label = ann.label;
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
