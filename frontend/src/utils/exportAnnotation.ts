import type { TextWithAnnotations, AnnotationResponse } from "@/api/types";

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
