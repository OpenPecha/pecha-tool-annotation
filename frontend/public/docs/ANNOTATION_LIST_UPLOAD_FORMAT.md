# Annotation List Upload File Format Documentation

This document describes the required JSON format for uploading hierarchical annotation lists (typologies) to the system.

## Overview

Annotation list upload allows administrators to upload a single JSON file containing a hierarchical structure of annotation categories. This is useful for uploading error typologies (like MQM), terminology hierarchies, or any other structured annotation classification system.

## File Requirements

- **File Extension**: `.json`
- **Encoding**: UTF-8
- **Single File**: Only one file can be uploaded at a time
- **Admin Only**: This feature is restricted to administrators

## JSON Structure

The JSON file must follow this hierarchical structure:

```json
{
  "version": "string (optional)",
  "title": "string (required)",
  "description": "string (optional)",
  "copyright": "string (optional)",
  "categories": [
    {
      "id": "string (optional)",
      "name": "string (required)",
      "description": "string (optional)",
      "level": "integer (optional)",
      "parent": "string (optional)",
      "mnemonic": "string (optional)",
      "examples": "array (optional)",
      "notes": "string (optional)",
      "subcategories": [
        {
          // Same structure, nested recursively
        }
      ]
    }
  ]
}
```

## Field Descriptions

### Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | ❌ No | Version identifier for the annotation list (e.g., "1.0", "2024.1"). |
| `title` | string | ✅ Yes | Root title/name of the annotation list. This becomes the "type" for all categories in the hierarchy. |
| `description` | string | ❌ No | Overall description of the annotation list. |
| `copyright` | string | ❌ No | Copyright information for the annotation list. |
| `categories` | array | ✅ Yes | Array of top-level categories. Must contain at least one category. |

### Category Object (`categories[]`)

Each category object represents a node in the hierarchical tree. Categories can be nested infinitely deep using the `subcategories` field.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ❌ No | Unique identifier for the category. If not provided, the system will generate one. |
| `name` | string | ✅ Yes | Display name of the category. Must not be empty. |
| `description` | string | ❌ No | Detailed description of what this category represents. |
| `level` | integer | ❌ No | Numeric level indicator (0 = root, 1 = first level, etc.). Useful for styling or filtering. |
| `parent` | string | ❌ No | ID of the parent category. Usually handled automatically by nesting, but can be specified explicitly. |
| `mnemonic` | string | ❌ No | Short code or mnemonic for quick reference (e.g., "M1", "TERM-001"). |
| `examples` | array | ❌ No | Array of example strings or objects demonstrating this category. |
| `notes` | string | ❌ No | Additional notes or comments about this category. |
| `subcategories` | array | ❌ No | Array of child categories. Can be nested recursively to any depth. |

### Additional Fields

The schema allows extra fields beyond those listed above. Any additional fields will be stored in the `meta` field of the database record.

## Validation Rules

1. **Title**: Must be a non-empty string
2. **Categories**: Must contain at least one category
3. **Category Name**: Each category must have a non-empty `name` field
4. **Hierarchy**: Parent-child relationships are maintained through the `subcategories` array

## Complete Example

Here's a complete example of an MQM-style error typology:

```json
{
  "version": "1.0",
  "title": "MQM Error Typology",
  "description": "Multidimensional Quality Metrics error classification system",
  "copyright": "© 2024 Translation Quality Consortium",
  "categories": [
    {
      "id": "accuracy",
      "name": "Accuracy",
      "description": "Errors related to the accuracy of translation",
      "level": 0,
      "mnemonic": "ACC",
      "examples": [
        "Incorrect translation of technical terms",
        "Misinterpretation of source text"
      ],
      "subcategories": [
        {
          "id": "accuracy-addition",
          "name": "Addition",
          "description": "Information added that is not present in the source",
          "level": 1,
          "mnemonic": "ACC-ADD",
          "examples": [
            "Added explanation not in source",
            "Extra words inserted"
          ],
          "notes": "Distinguish from appropriate additions for clarity"
        },
        {
          "id": "accuracy-omission",
          "name": "Omission",
          "description": "Information from source that is missing",
          "level": 1,
          "mnemonic": "ACC-OM",
          "examples": [
            "Missing sentence",
            "Skipped paragraph"
          ]
        },
        {
          "id": "accuracy-mistranslation",
          "name": "Mistranslation",
          "description": "Incorrect translation of meaning",
          "level": 1,
          "mnemonic": "ACC-MT",
          "examples": [
            "Wrong meaning conveyed",
            "Opposite meaning"
          ],
          "subcategories": [
            {
              "id": "accuracy-mistranslation-literal",
              "name": "Literal Translation",
              "description": "Word-for-word translation that loses meaning",
              "level": 2,
              "mnemonic": "ACC-MT-LIT",
              "examples": [
                "Literal translation of idioms",
                "Word-for-word without context"
              ]
            }
          ]
        }
      ]
    },
    {
      "id": "fluency",
      "name": "Fluency",
      "description": "Errors related to the fluency and naturalness of the target language",
      "level": 0,
      "mnemonic": "FLU",
      "subcategories": [
        {
          "id": "fluency-grammar",
          "name": "Grammar",
          "description": "Grammatical errors in target language",
          "level": 1,
          "mnemonic": "FLU-GRAM",
          "examples": [
            "Subject-verb agreement",
            "Wrong tense"
          ]
        },
        {
          "id": "fluency-spelling",
          "name": "Spelling",
          "description": "Spelling errors",
          "level": 1,
          "mnemonic": "FLU-SPELL",
          "examples": [
            "Typo",
            "Misspelled word"
          ]
        }
      ]
    },
    {
      "id": "terminology",
      "name": "Terminology",
      "description": "Errors related to domain-specific terminology",
      "level": 0,
      "mnemonic": "TERM",
      "subcategories": [
        {
          "id": "terminology-inconsistent",
          "name": "Inconsistent Terminology",
          "description": "Same term translated differently",
          "level": 1,
          "mnemonic": "TERM-INC",
          "examples": [
            "Buddha translated as 'Buddha' and 'Buddha Shakyamuni'",
            "Different translations for same technical term"
          ]
        }
      ]
    }
  ]
}
```

## Minimal Example

A minimal valid file with only required fields:

```json
{
  "title": "Simple Error List",
  "categories": [
    {
      "name": "Error Type 1"
    },
    {
      "name": "Error Type 2",
      "subcategories": [
        {
          "name": "Subtype 2.1"
        }
      ]
    }
  ]
}
```

## Tibetan Terminology Example

Example for Tibetan Buddhist terminology:

```json
{
  "version": "2.1",
  "title": "Tibetan Buddhist Terminology",
  "description": "Hierarchical classification of Tibetan Buddhist terms",
  "copyright": "© 2024 Buddhist AI Project",
  "categories": [
    {
      "name": "Philosophy",
      "description": "Philosophical concepts and schools",
      "mnemonic": "PHIL",
      "level": 0,
      "examples": [
        "Madhyamaka",
        "Yogacara"
      ],
      "subcategories": [
        {
          "name": "Madhyamaka",
          "description": "Middle Way school",
          "mnemonic": "PHIL-MAD",
          "level": 1,
          "examples": [
            "དབུ་མ་",
            "Middle Way"
          ],
          "notes": "Founded by Nagarjuna",
          "subcategories": [
            {
              "name": "Prasangika",
              "description": "Consequentialist branch",
              "mnemonic": "PHIL-MAD-PRA",
              "level": 2
            },
            {
              "name": "Svatantrika",
              "description": "Autonomous branch",
              "mnemonic": "PHIL-MAD-SVA",
              "level": 2
            }
          ]
        }
      ]
    },
    {
      "name": "Practice",
      "description": "Meditation and practice methods",
      "mnemonic": "PRAC",
      "level": 0,
      "subcategories": [
        {
          "name": "Meditation",
          "mnemonic": "PRAC-MED",
          "level": 1,
          "subcategories": [
            {
              "name": "Shamatha",
              "description": "Calm abiding",
              "mnemonic": "PRAC-MED-SHA",
              "level": 2
            },
            {
              "name": "Vipashyana",
              "description": "Insight meditation",
              "mnemonic": "PRAC-MED-VIP",
              "level": 2
            }
          ]
        }
      ]
    }
  ]
}
```

## Structure Guidelines

### Hierarchical Nesting

Categories are nested using the `subcategories` array. There's no limit to nesting depth:

```json
{
  "title": "Deep Hierarchy Example",
  "categories": [
    {
      "name": "Level 0",
      "subcategories": [
        {
          "name": "Level 1",
          "subcategories": [
            {
              "name": "Level 2",
              "subcategories": [
                {
                  "name": "Level 3"
                  // Can continue nesting...
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Using IDs

While IDs are optional, providing them can be useful for:
- Referencing specific categories
- Maintaining consistency across updates
- Linking to external systems

```json
{
  "title": "With IDs",
  "categories": [
    {
      "id": "cat-001",
      "name": "Category One",
      "subcategories": [
        {
          "id": "cat-001-001",
          "name": "Subcategory",
          "parent": "cat-001"  // Explicit parent reference
        }
      ]
    }
  ]
}
```

### Examples Field

The `examples` field can contain:
- Simple strings: `["example1", "example2"]`
- Objects: `[{"text": "example", "context": "..."}]`
- Mixed arrays: `["simple", {"complex": "object"}]`

```json
{
  "name": "Error Type",
  "examples": [
    "Simple string example",
    {
      "text": "Complex example",
      "source": "Document A",
      "line": 42
    },
    ["array", "of", "strings"]
  ]
}
```

## Common Errors and Solutions

### Error: "title cannot be empty"
**Solution**: Ensure the root `title` field contains a non-empty string.

### Error: "categories list cannot be empty"
**Solution**: Provide at least one category in the `categories` array.

### Error: "name cannot be empty"
**Solution**: Every category must have a non-empty `name` field.

### Error: "Invalid JSON file"
**Solution**: Ensure your file is valid JSON. Use a JSON validator to check syntax.

### Error: "Only admins can upload annotation lists"
**Solution**: This feature requires administrator privileges. Contact your system administrator.

## Tips for Creating Upload Files

1. **Start Simple**: Begin with a flat structure and add nesting as needed.

2. **Use Mnemonics**: Mnemonics help users quickly identify categories (e.g., "ACC-MT" for "Accuracy - Mistranslation").

3. **Provide Descriptions**: Clear descriptions help annotators understand when to use each category.

4. **Include Examples**: Examples are invaluable for training and reference.

5. **Version Control**: Use the `version` field to track different versions of your typology.

6. **Test Structure**: Validate your JSON structure before uploading using a JSON validator.

7. **Backup**: Keep backups of your annotation lists before uploading new versions.

8. **Hierarchy Depth**: While unlimited nesting is supported, consider usability - very deep hierarchies can be hard to navigate.

## Processing Notes

- The root `title` becomes the "type" for all categories in the hierarchy
- All categories are created with the authenticated user as the creator
- Parent-child relationships are automatically maintained through nesting
- The `version`, `copyright`, and `description` fields from the root are stored in metadata
- The system returns the total number of records created and their IDs
- Existing annotation lists with the same type can be replaced by deleting the old type first

## Metadata Storage

Root-level metadata (version, copyright, description) is stored in the root category's metadata. Additional fields beyond the schema are also preserved in the `meta` field of each category record.

## Updating Annotation Lists

To update an annotation list:
1. Delete the existing annotation list by type (if needed)
2. Upload the new version
3. The system will create all records fresh

Note: Deleting an annotation list by type removes all categories associated with that type.
