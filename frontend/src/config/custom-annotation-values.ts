/**
 * Features with a closed vocabulary: their values come from a fixed linguistic
 * tagset, so annotators must pick an existing option rather than invent one.
 *
 * Entries are matched against the normalized annotation type name, so both the
 * bare feature name and any suffixed variant (e.g. "Semantic roles Features")
 * are covered.
 */
const CLOSED_VOCABULARY_FEATURES = [
  "animacy",
  "pos",
  "part of speech",
  "semantic role",
  "semantic roles",
];

/** Lowercase and collapse spaces, underscores, and hyphens so name variants match. */
const normalizeFeatureName = (name: string): string =>
  name.trim().toLowerCase().replaceAll(/[\s_-]+/g, " ");

/**
 * Whether annotators may add their own value ("Other") for a given annotation type.
 */
export const allowsCustomValues = (featureName?: string | null): boolean => {
  if (!featureName) return true;
  const normalized = normalizeFeatureName(featureName);
  return !CLOSED_VOCABULARY_FEATURES.some(
    (feature) => normalized === feature || normalized.startsWith(`${feature} `)
  );
};
