import type { Lang } from '../lib/types';

interface Props {
  text: string;
  /** Readings aligned one per character; shown above and below the characters. */
  top?: string[];
  topLang?: Lang;
  bottom?: string[];
  bottomLang?: Lang;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/** Chinese text with an optional reading above and below each character. */
export function Hanzi({ text, top, topLang = 'm', bottom, bottomLang = 'c', size = 'md' }: Props) {
  return (
    <span className={`hz hz-${size}`} lang="zh">
      {Array.from(text).map((ch, i) => (
        <span className="hz-cell" key={i}>
          {top && <span className={`hz-rd rd-${topLang}`}>{top[i] || ' '}</span>}
          <span className="hz-ch">{ch}</span>
          {bottom && <span className={`hz-rd rd-${bottomLang}`}>{bottom[i] || ' '}</span>}
        </span>
      ))}
    </span>
  );
}
