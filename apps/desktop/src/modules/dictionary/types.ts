export interface Sense {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  examples: string[];
}

export interface Entry {
  part_of_speech: string;
  senses: Sense[];
}

export interface DictionaryResponse {
  word: string;
  entries: Entry[];
}

interface DictionaryError {
  message: string;
}
