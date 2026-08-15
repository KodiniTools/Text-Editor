import { computed, type Ref } from 'vue'

export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
  sentences: number
  paragraphs: number
  readingMinutes: number
  speakingMinutes: number
}

const WORDS_PER_MINUTE_READ = 200
const WORDS_PER_MINUTE_SPEAK = 130

/** Berechnet Textstatistiken reaktiv aus einer content-Ref. */
export function useTextStats(content: Ref<string>) {
  const stats = computed<TextStats>(() => {
    const text = content.value
    const wordCount = (text.match(/\S+/g) ?? []).length
    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: wordCount,
      lines: text === '' ? 0 : text.split(/\r?\n/).length,
      sentences: (text.match(/[.!?\u2026]+(\s|$)/g) ?? []).length,
      paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim() !== '').length,
      readingMinutes: Math.max(
        wordCount === 0 ? 0 : 1,
        Math.ceil(wordCount / WORDS_PER_MINUTE_READ),
      ),
      speakingMinutes: Math.max(
        wordCount === 0 ? 0 : 1,
        Math.ceil(wordCount / WORDS_PER_MINUTE_SPEAK),
      ),
    }
  })

  return { stats }
}
