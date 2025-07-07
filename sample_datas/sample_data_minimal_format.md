# Minimal Sample Data Format

This directory contains minimal sample JSON files showing the **required fields only** for uploading texts and annotations to the Pecha Annotation Tool database.

## Required vs Optional Fields

### Text Object - Required Fields

```json
{
  "text": {
    "title": "string", // REQUIRED: Title of the text
    "content": "string" // REQUIRED: The actual text content
  }
}
```

### Text Object - Optional Fields

```json
{
  "text": {
    "title": "string", // REQUIRED
    "content": "string", // REQUIRED
    "language": "string", // Optional: defaults to "en"
    "source": "string" // Optional: source/origin information
  }
}
```

### Annotation Object - Required Fields

```json
{
  "annotation_type": "string",     // REQUIRED: Type of annotation
  "start_position": number,        // REQUIRED: Start character position (0-based)
  "end_position": number           // REQUIRED: End character position (exclusive)
}
```

### Annotation Object - Optional Fields

```json
{
  "annotation_type": "string",     // REQUIRED
  "start_position": number,        // REQUIRED
  "end_position": number,          // REQUIRED
  "selected_text": "string",      // Optional: auto-extracted if not provided
  "label": "string",               // Optional: annotation label/category
  "name": "string",                // Optional: human-readable name
  "meta": object,                  // Optional: additional metadata
  "confidence": number             // Optional: defaults to 100 (0-100)
}
```

## Auto-Generated Fields

These fields are automatically handled by the system and should **NOT** be included in upload files:

**Text:**

- `id` - Auto-generated primary key
- `status` - Defaults to "initialized"
- `annotator_id` - Set to current user during upload
- `reviewer_id` - Set separately during review process
- `created_at` - Auto-generated timestamp
- `updated_at` - Auto-generated timestamp

**Annotation:**

- `id` - Auto-generated primary key
- `text_id` - Set automatically when processing
- `annotator_id` - Set to current user during upload
- `created_at` - Auto-generated timestamp
- `updated_at` - Auto-generated timestamp

## Minimal Sample Files

### 1. sample_text_minimal_1.json

- **Content**: Tibetan mantra with basic annotations
- **Features**: Only required fields, demonstrates Unicode text

### 2. sample_text_minimal_2.json

- **Content**: English climate text
- **Features**: Only required fields, simple entity and sentiment annotations

### 3. sample_text_minimal_3.json

- **Content**: Mixed language text with optional fields
- **Features**: Shows commonly used optional fields like `language`, `source`, `label`

## Basic File Structure

The absolute minimal structure is:

```json
{
  "text": {
    "title": "Your Text Title",
    "content": "Your text content here..."
  },
  "annotations": [
    {
      "annotation_type": "your_type",
      "start_position": 0,
      "end_position": 5
    }
  ]
}
```

## Validation Rules

1. **Text title and content** cannot be empty
2. **End position** must be greater than start position
3. **Positions** must be within text bounds
4. **Selected text** will be auto-extracted from positions if not provided
5. **Language** defaults to "en" if not specified
6. **Confidence** defaults to 100 if not specified

## Common Annotation Types

- `entity` - Named entities, objects, concepts
- `sentiment` - Emotional tone or opinion
- `language` - Language identification
- `structure` - Document structure elements
- `mantra` - Religious or sacred text
- `concept` - Abstract concepts or ideas
- `greeting` - Greeting expressions

## Usage

1. Create JSON files following the minimal format
2. Ensure all required fields are present
3. Upload through the admin bulk upload interface
4. Optional fields will use default values if not provided
5. System will validate and provide detailed error messages

This minimal format reduces file size and complexity while ensuring all necessary data is captured for the annotation system.
