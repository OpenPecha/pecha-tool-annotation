# Bulk Upload File Format Documentation

This document describes the required JSON format for bulk uploading texts and annotations to the system.

## Overview

Bulk upload allows you to upload multiple JSON files simultaneously. Each JSON file represents a single text document with its associated annotations. The system will validate each file before importing and provide detailed feedback on any errors.

## File Requirements

- **File Extension**: `.json`
- **Encoding**: UTF-8
- **Multiple Files**: You can upload multiple JSON files at once
- **File Size**: No specific limit, but larger files may take longer to process

## JSON Structure

Each JSON file must follow this structure:

```json
{
  "text": {
    "title": "string (required)",
    "content": "string (required)",
    "translation": "string (optional)",
    "source": "string (optional)",
    "language": "string (optional, default: 'en')",
    "annotation_type_id": "string (optional)"
  },
  "annotations": [
    {
      "annotation_type": "string (required)",
      "start_position": "integer (required)",
      "end_position": "integer (required)",
      "selected_text": "string (optional)",
      "label": "string (optional)",
      "name": "string (optional)",
      "meta": "object (optional)",
      "confidence": "integer (optional, default: 100)"
    }
  ],
  "metadata": "object (optional)"
}
```

## Field Descriptions

### Text Object (`text`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ Yes | Unique title for the text. Whitespace is automatically trimmed. Must not be empty. |
| `content` | string | ✅ Yes | The actual text content to be annotated. Must not be empty. |
| `translation` | string | ❌ No | Optional translation of the content. |
| `source` | string | ❌ No | Source or origin of the text (e.g., "OpenPecha", "Manual Entry"). |
| `language` | string | ❌ No | Language code (e.g., "en", "bo", "zh"). Defaults to "en" if not provided. |
| `annotation_type_id` | string | ❌ No | Optional annotation type ID to associate with this text. |

### Annotations Array (`annotations`)

The `annotations` array contains zero or more annotation objects. Each annotation represents a span of text that has been marked up.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `annotation_type` | string | ✅ Yes | Type of annotation (e.g., "terminology", "error", "entity"). Must not be empty. |
| `start_position` | integer | ✅ Yes | Start character position (0-indexed). Must be >= 0. |
| `end_position` | integer | ✅ Yes | End character position (exclusive). Must be > start_position and <= text length. |
| `selected_text` | string | ❌ No | The annotated text span. If not provided, it will be extracted from `content` using positions. |
| `label` | string | ❌ No | Annotation label or category. |
| `name` | string | ❌ No | Human-readable name for the annotation. |
| `meta` | object | ❌ No | Additional metadata as key-value pairs. Can contain any JSON-serializable data. |
| `confidence` | integer | ❌ No | Confidence score (0-100). Defaults to 100 if not provided. |

### Metadata Object (`metadata`)

Optional top-level metadata object that can contain any additional information about the file.

## Validation Rules

### Text Validation

1. **Title**: Must be non-empty after trimming whitespace
2. **Content**: Must be non-empty after trimming whitespace
3. **Title Uniqueness**: Each text title must be unique across the system

### Annotation Validation

1. **Position Bounds**: 
   - `start_position` must be >= 0
   - `end_position` must be > `start_position`
   - `end_position` must be <= text content length
   - `start_position` must be < text content length

2. **Text Matching**: 
   - If `selected_text` is provided, it must exactly match the text at `content[start_position:end_position]`
   - If `selected_text` is not provided, it will be automatically extracted

3. **Annotation Type**: Must be a non-empty string

4. **Confidence**: Must be between 0 and 100 (inclusive)

## Complete Example

Here's a complete example JSON file:

```json
{
  "text": {
    "title": "Sample Buddhist Text",
    "content": "The Buddha taught the Four Noble Truths. These truths form the foundation of Buddhist philosophy.",
    "translation": "Le Bouddha a enseigné les Quatre Nobles Vérités.",
    "source": "Manual Entry",
    "language": "en",
    "annotation_type_id": "terminology"
  },
  "annotations": [
    {
      "annotation_type": "terminology",
      "start_position": 4,
      "end_position": 10,
      "selected_text": "Buddha",
      "label": "proper_noun",
      "name": "Buddha",
      "confidence": 100,
      "meta": {
        "entity_type": "person",
        "language": "en"
      }
    },
    {
      "annotation_type": "terminology",
      "start_position": 20,
      "end_position": 42,
      "selected_text": "Four Noble Truths",
      "label": "doctrine",
      "name": "Four Noble Truths",
      "confidence": 95,
      "meta": {
        "category": "core_teaching",
        "importance": "high"
      }
    }
  ],
  "metadata": {
    "upload_date": "2026-02-26",
    "uploader": "admin",
    "version": "1.0"
  }
}
```

## Minimal Example

A minimal valid file with only required fields:

```json
{
  "text": {
    "title": "Minimal Example",
    "content": "This is a simple text with no annotations."
  },
  "annotations": []
}
```

## Example with Multiple Annotations

```json
{
  "text": {
    "title": "Tibetan Text Sample",
    "content": "༄༅། །རྒྱལ་པོ་ལ་གཏམ་བྱ་བ་རིན་པོ་ཆེའི་ཕྲེང་བ།",
    "language": "bo",
    "source": "OpenPecha"
  },
  "annotations": [
    {
      "annotation_type": "terminology",
      "start_position": 0,
      "end_position": 5,
      "selected_text": "༄༅།",
      "label": "punctuation",
      "confidence": 100
    },
    {
      "annotation_type": "entity",
      "start_position": 8,
      "end_position": 15,
      "selected_text": "རྒྱལ་པོ",
      "label": "person",
      "name": "King",
      "confidence": 90,
      "meta": {
        "translation": "king",
        "type": "title"
      }
    }
  ]
}
```

## Common Errors and Solutions

### Error: "title cannot be empty"
**Solution**: Ensure the `title` field contains at least one non-whitespace character.

### Error: "content cannot be empty"
**Solution**: Ensure the `content` field contains the actual text content.

### Error: "start_position exceeds text length"
**Solution**: Check that `start_position` is less than the length of the text content. Remember positions are 0-indexed.

### Error: "end_position exceeds text length"
**Solution**: Ensure `end_position` is not greater than the text content length.

### Error: "end_position must be greater than start_position"
**Solution**: Ensure `end_position` is strictly greater than `start_position`.

### Error: "selected_text does not match text at specified positions"
**Solution**: Either remove `selected_text` (it will be auto-extracted) or ensure it exactly matches `content[start_position:end_position]`.

### Error: "annotation_type cannot be empty"
**Solution**: Provide a non-empty string value for `annotation_type`.

### Error: "Title already exists"
**Solution**: Each text must have a unique title. Change the title or delete the existing text first.

## Tips for Creating Upload Files

1. **Character Positions**: Remember that positions are 0-indexed. The first character is at position 0.

2. **Text Extraction**: If you're unsure about `selected_text`, omit it and let the system extract it automatically.

3. **UTF-8 Encoding**: Ensure your JSON files are saved with UTF-8 encoding, especially for non-ASCII characters (Tibetan, Chinese, etc.).

4. **Validation**: Use the dry-run validation endpoint before uploading to catch errors early.

5. **Batch Processing**: You can upload multiple files at once. Each file is processed independently, so one failure won't affect others.

6. **Metadata**: Use the `metadata` field to store any custom information that might be useful for tracking or processing.

## Language Codes

Common language codes:
- `en` - English
- `bo` - Tibetan
- `zh` - Chinese
- `sa` - Sanskrit
- `pi` - Pali

Use ISO 639-1 or ISO 639-2 language codes when possible.

## Notes

- The system automatically sets the text status to "initialized" for all uploaded texts
- Annotations are validated against the text content before import
- Empty `annotations` arrays are allowed (texts without annotations)
- The `meta` field in annotations can contain nested objects and arrays
- All validation errors are reported with specific field paths for easy debugging
