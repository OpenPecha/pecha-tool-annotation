/**
 * Language options for text upload and annotation
 */
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "bo", name: "Tibetan", nativeName: "བོད་ཡིག" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "pi", name: "Pali", nativeName: "पालि" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол" },
  { code: "other", name: "Other", nativeName: "Other" },
];

/**
 * Get language display name by code
 */
export const getLanguageName = (code: string): string => {
  const language = LANGUAGE_OPTIONS.find((lang) => lang.code === code);
  return language ? `${language.name} (${language.nativeName})` : code;
};

/**
 * Get language native name by code
 */
export const getLanguageNativeName = (code: string): string => {
  const language = LANGUAGE_OPTIONS.find((lang) => lang.code === code);
  return language ? language.nativeName : code;
};

