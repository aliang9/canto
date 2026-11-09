import type { Item, Lang, Script } from '../lib/types';
import { Hanzi } from './Hanzi';
import { Speaker } from './Speaker';

interface Props {
  item: Item;
  script: Script;
  /** Which language to show first when the two words differ. */
  primary: Lang;
  size?: 'md' | 'lg';
}

const OTHER_SCRIPT_LABEL: Record<Script, string> = { s: 'Traditional', t: 'Simplified' };

function AltScript({ primary, other, script }: { primary: string; other: string; script: Script }) {
  if (primary === other) return null;
  return (
    <div className="iv-alt">
      {OTHER_SCRIPT_LABEL[script]} <span lang="zh">{other}</span>
    </div>
  );
}

/** The full picture of one item: both languages, both scripts, both readings. */
export function ItemView({ item, script, primary, size = 'lg' }: Props) {
  const other: Script = script === 's' ? 't' : 's';

  if (item.same) {
    return (
      <div className="iv">
        <div className="iv-line">
          <Hanzi text={item.m[script]} top={item.m.py} topLang="m" bottom={item.c.jp} bottomLang="c" size={size} />
          <span className="iv-audio">
            <Speaker item={item} lang="m" />
            <Speaker item={item} lang="c" />
          </span>
        </div>
        <AltScript primary={item.m[script]} other={item.m[other]} script={script} />
        <div className="iv-tag">Same word in both. Mandarin reading above, Cantonese below.</div>
      </div>
    );
  }

  const mandarin = (
    <div className="iv-block" key="m">
      <div className="iv-label lbl-m">Mandarin</div>
      <div className="iv-line">
        <Hanzi text={item.m[script]} top={item.m.py} topLang="m" size={size} />
        <span className="iv-audio">
          <Speaker item={item} lang="m" />
        </span>
      </div>
      <AltScript primary={item.m[script]} other={item.m[other]} script={script} />
    </div>
  );
  const cantonese = (
    <div className="iv-block" key="c">
      <div className="iv-label lbl-c">Cantonese</div>
      <div className="iv-line">
        <Hanzi text={item.c[script]} top={item.c.jp} topLang="c" size={size} />
        <span className="iv-audio">
          <Speaker item={item} lang="c" />
        </span>
      </div>
      <AltScript primary={item.c[script]} other={item.c[other]} script={script} />
    </div>
  );
  return <div className="iv">{primary === 'm' ? [mandarin, cantonese] : [cantonese, mandarin]}</div>;
}
