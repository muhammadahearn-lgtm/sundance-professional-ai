/** Standard English names for spoken languages, kept short for the resume sidebar. */
export const SPOKEN_LANGUAGE_CATALOG = [
  "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian",
  "Bulgarian", "Burmese", "Cantonese", "Catalan", "Croatian", "Czech", "Danish", "Dutch", "English", "Estonian",
  "Finnish", "French", "Georgian", "German", "Greek", "Gujarati", "Haitian Creole", "Hausa", "Hebrew", "Hindi",
  "Hmong", "Hungarian", "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese", "Kannada",
  "Kazakh", "Khmer", "Korean", "Kurdish", "Lao", "Latvian", "Lithuanian", "Macedonian", "Malay", "Malayalam",
  "Maltese", "Mandarin", "Marathi", "Mongolian", "Nepali", "Norwegian", "Pashto", "Persian", "Polish", "Portuguese",
  "Punjabi", "Romanian", "Russian", "Serbian", "Sinhala", "Slovak", "Slovenian", "Somali", "Spanish", "Sundanese",
  "Swahili", "Swedish", "Tagalog", "Tamil", "Telugu", "Thai", "Tigrinya", "Turkish", "Ukrainian", "Urdu",
  "Uzbek", "Vietnamese", "Welsh", "Xhosa", "Yoruba", "Zulu", "Sign Language (ASL)",
];

const ALIASES: Record<string, string> = {
  "bahasa": "Indonesian", "bahasa indonesia": "Indonesian", "indonesia": "Indonesian",
  "bahasa melayu": "Malay", "bahasa malaysia": "Malay", "malaysian": "Malay", "melayu": "Malay",
  "mandarin chinese": "Mandarin", "chinese": "Mandarin", "putonghua": "Mandarin", "chinese mandarin": "Mandarin",
  "chinese cantonese": "Cantonese", "farsi": "Persian", "castilian": "Spanish", "espanol": "Spanish", "español": "Spanish",
  "filipino": "Tagalog", "pilipino": "Tagalog", "deutsch": "German", "francais": "French", "français": "French",
  "nihongo": "Japanese", "hangul": "Korean", "brazilian portuguese": "Portuguese", "flemish": "Dutch",
  "asl": "Sign Language (ASL)", "american sign language": "Sign Language (ASL)", "myanmar": "Burmese",
  "tieng viet": "Vietnamese", "kiswahili": "Swahili", "isizulu": "Zulu",
};

/** Maps a typed name or alias to its standard catalog name; unknown names are returned trimmed. */
export function normalizeSpokenLanguage(input: string): string {
  const q = input.trim().replace(/\s+/g, " ");
  const k = q.toLowerCase();
  if (ALIASES[k]) return ALIASES[k];
  return SPOKEN_LANGUAGE_CATALOG.find((n) => n.toLowerCase() === k) ?? q;
}
