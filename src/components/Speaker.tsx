import { speakItem } from '../lib/speech';
import type { Item, Lang } from '../lib/types';

const NAME: Record<Lang, string> = { m: 'Mandarin', c: 'Cantonese' };
const MARK: Record<Lang, string> = { m: '普', c: '粵' };

/** A button that plays an item aloud in Mandarin or Cantonese. */
export function Speaker({ item, lang }: { item: Item; lang: Lang }) {
  return (
    <button
      type="button"
      className={`spk spk-${lang}`}
      title={`Play ${NAME[lang]} (${lang.toUpperCase()})`}
      aria-label={`Play ${NAME[lang]}`}
      onClick={(e) => {
        e.stopPropagation();
        speakItem(item, lang);
      }}
    >
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
        <path d="M13 7a4 4 0 0 1 0 6M15 4.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span lang="zh">{MARK[lang]}</span>
    </button>
  );
}
