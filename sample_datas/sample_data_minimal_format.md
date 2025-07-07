# Sample Data Format for Pecha Annotation Tool

This directory contains sample JSON files showing the format for uploading texts and annotations to the Pecha Annotation Tool database.

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

## Sample Files

### 1. sample_text_minimal_1.json

- **Content**: Tibetan Heart Sutra with traditional Buddhist text structure
- **Features**: Demonstrates Unicode Tibetan text, religious text annotation
- **Annotation Types**: title, header, author, translator
- **Use Case**: Religious and philosophical texts

### 2. sample_text_minimal_2.json

- **Content**: English academic paper on climate change
- **Features**: Academic paper structure with multiple sections
- **Annotation Types**: title, header, author, translator
- **Use Case**: Academic and scientific documents

### 3. sample_text_minimal_3.json

- **Content**: Mixed Tibetan-English comparative study
- **Features**: Bilingual text with cultural and philosophical content
- **Annotation Types**: title, header, author, translator
- **Use Case**: Comparative studies and bilingual documents

## Standard Annotation Types

### Structural Annotations

- **title** - Document titles and main headings
- **header** - Section headers, subsections, and structural divisions
- **author** - Author attribution and bylines
- **translator** - Translation credits and translator attribution

### Content Annotations

- **entity** - Named entities, objects, concepts
- **sentiment** - Emotional tone or opinion
- **language** - Language identification for multilingual texts
- **concept** - Abstract concepts or philosophical ideas
- **mantra** - Religious or sacred text passages
- **greeting** - Greeting expressions and formulaic phrases

## Position Calculation

Positions are calculated as character indices (0-based) within the text content:

```text
"Hello World"
 0123456789A  (A = 10)
```

- `start_position: 0, end_position: 5` = "Hello"
- `start_position: 6, end_position: 11` = "World"

## Validation Rules

1. **Text title and content** cannot be empty
2. **End position** must be greater than start position
3. **Positions** must be within text content bounds
4. **Selected text** will be auto-extracted from positions if not provided
5. **Language** defaults to "en" if not specified
6. **Confidence** defaults to 100 if not specified
7. **Text titles** must be unique across the database

## File Structure Template

```json
{
  "text": {
    "title": "Your Document Title",
    "content": "Your full text content here...",
    "language": "en",
    "source": "Optional source information"
  },
  "annotations": [
    {
      "annotation_type": "title",
      "start_position": 0,
      "end_position": 20,
      "label": "main_title",
      "name": "Document Title"
    },
    {
      "annotation_type": "author",
      "start_position": 25,
      "end_position": 45,
      "label": "author_byline",
      "name": "Author Name"
    },
    {
      "annotation_type": "header",
      "start_position": 50,
      "end_position": 70,
      "label": "section_header",
      "name": "Introduction"
    }
  ]
}
```

## Usage Guidelines

1. **Longer Content**: Use substantial text content to demonstrate realistic use cases
2. **Meaningful Annotations**: Create annotations that serve actual analytical purposes
3. **Cultural Sensitivity**: Respect cultural and religious contexts in sample texts
4. **Multilingual Support**: Demonstrate Unicode support for various languages
5. **Academic Standards**: Follow proper attribution and citation practices

## Upload Process

1. Create JSON files following the above format
2. Ensure all required fields are present
3. Upload through the admin bulk upload interface
4. System validates and provides detailed error reporting
5. Successfully uploaded texts have "initialized" status
6. Annotations are created without changing text status

This format supports comprehensive text annotation workflows while maintaining flexibility for various document types and use cases.
