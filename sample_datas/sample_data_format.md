# Sample Data Format Documentation

This directory contains sample JSON files demonstrating the expected data format for uploading texts and annotations to the Pecha Annotation Tool database.

## File Structure

Each sample file contains:

- **text**: The main text content and metadata
- **annotations**: Array of annotations for the text
- **metadata**: Additional information about the sample

## Text Object Format

```json
{
  "text": {
    "title": "string", // Required: Title of the text
    "content": "string", // Required: The actual text content
    "source": "string", // Optional: Source/origin of the text
    "language": "string", // Optional: Language code (e.g., "en", "bo", "mixed")
    "status": "string" // Optional: Status (initialized, annotated, reviewed, skipped, progress)
  }
}
```

### Text Fields

- **title**: A descriptive title for the text
- **content**: The full text content to be annotated
- **source**: Where the text originated (book, website, document, etc.)
- **language**: Language code following ISO standards
  - `en` - English
  - `bo` - Tibetan
  - `mixed` - Multiple languages in one text
- **status**: Current annotation status
  - `initialized` - Ready for annotation
  - `annotated` - Has been annotated
  - `reviewed` - Has been reviewed
  - `skipped` - Skipped for annotation
  - `progress` - Currently being annotated

## Annotation Object Format

```json
{
  "annotation_type": "string",     // Required: Type of annotation
  "start_position": number,        // Required: Start character position
  "end_position": number,          // Required: End character position
  "selected_text": "string",      // Optional: The annotated text span
  "label": "string",               // Optional: The annotation label/category
  "name": "string",                // Optional: Human-readable name
  "meta": object,                  // Optional: Additional metadata
  "confidence": number             // Optional: Confidence score (0-100)
}
```

### Annotation Fields

- **annotation_type**: Category of annotation

  - `entity` - Named entities, concepts, terms
  - `sentiment` - Emotional tone, opinion
  - `language` - Language identification
  - `structure` - Document structure elements
  - `urgency` - Urgency indicators
  - `code_switching` - Language mixing patterns
  - Custom types as needed

- **start_position**: Character index where annotation begins (0-based)
- **end_position**: Character index where annotation ends (exclusive)
- **selected_text**: The actual text span being annotated
- **label**: The classification label (e.g., "positive", "negative", "location")
- **name**: A human-readable description
- **meta**: Additional structured metadata as JSON object
- **confidence**: Annotation confidence from 0-100

## Sample Files

### 1. sample_text_1.json

- **Content**: Tibetan Buddhist mantra and prayers
- **Annotations**: Entity recognition, sentiment analysis, structure
- **Features**: Religious text analysis, classical Tibetan

### 2. sample_text_2.json

- **Content**: English climate change research summary
- **Annotations**: Sentiment analysis, entity extraction, urgency detection
- **Features**: Scientific text, environmental domain

### 3. sample_text_3.json

- **Content**: Mixed English-Tibetan conference text
- **Annotations**: Language detection, code-switching, multilingual entities
- **Features**: Multilingual analysis, cultural concepts

## Common Annotation Types

### Entity Annotations

Used for identifying and classifying named entities, concepts, and terms:

```json
{
  "annotation_type": "entity",
  "label": "location|person|organization|concept|technology_trend",
  "meta": {
    "entity_type": "specific_classification",
    "domain": "relevant_domain",
    "additional_properties": "as_needed"
  }
}
```

### Sentiment Annotations

Used for emotional tone and opinion analysis:

```json
{
  "annotation_type": "sentiment",
  "label": "positive|negative|neutral|mixed",
  "meta": {
    "sentiment_score": -1.0, // Range: -1.0 to 1.0
    "intensity": "low|medium|high",
    "emotion": "specific_emotion"
  }
}
```

### Language Annotations

Used for identifying languages in multilingual texts:

```json
{
  "annotation_type": "language",
  "label": "en|bo|zh|mixed",
  "meta": {
    "language_code": "iso_code",
    "script": "writing_system",
    "confidence_score": 0.95
  }
}
```

## Usage Guidelines

1. **Position Accuracy**: Ensure start_position and end_position accurately reflect character positions
2. **Overlapping Annotations**: Multiple annotations can overlap the same text span
3. **Consistent Labeling**: Use consistent labels within annotation types
4. **Metadata Structure**: Keep metadata structured and consistent
5. **Text Encoding**: Use UTF-8 encoding for all text content

## Uploading Data

To upload this data to the database:

1. **Via API**: Use the REST API endpoints with proper authentication
2. **Bulk Import**: Use the database initialization scripts
3. **Admin Interface**: Use the web interface for manual uploads

## Validation

Before uploading, ensure:

- All required fields are present
- Position indices are within text bounds
- Labels are consistent with your annotation schema
- JSON is valid and properly formatted

## Custom Annotation Types

You can create custom annotation types by:

1. Using descriptive `annotation_type` values
2. Defining appropriate `label` categories
3. Structuring `meta` fields consistently
4. Documenting your custom schema

## Examples of Meta Fields

### For Entity Annotations:

```json
"meta": {
  "entity_type": "person|location|organization|concept",
  "domain": "academic|religious|political|technical",
  "confidence": 0.95,
  "aliases": ["alternative_names"],
  "properties": "additional_info"
}
```

### For Sentiment Annotations:

```json
"meta": {
  "sentiment_score": 0.75,
  "intensity": "high",
  "emotion": "joy|anger|sadness|fear|surprise",
  "aspect": "what_the_sentiment_is_about"
}
```

### For Language Annotations:

```json
"meta": {
  "language_code": "bo-CN",
  "script": "tibetan",
  "dialect": "central_tibetan",
  "translation": "english_translation"
}
```

This format provides flexibility while maintaining consistency across different annotation tasks and domains.
