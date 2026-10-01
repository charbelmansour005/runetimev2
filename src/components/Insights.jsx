import Reveal from './Reveal';
import SectionHead from './SectionHead';
import { GLYPHS } from '../data/glyphs';
import { useContent } from '../content/ContentProvider';
import { formatDate, itemKey, linkProps } from '../content/format';
import './Insights.css';

const PAD = 0.2;
// The home page shows the newest few; /insights lists them all.
const HOME_COUNT = 4;

export const newestFirst = (items) => [...items].sort((a, b) => b.date.localeCompare(a.date));

function PostCover({ from, to, glow, glyph }) {
  const def = GLYPHS[glyph] ?? GLYPHS.spark;
  return (
    <div className="post-cover" style={{ '--from': from, '--to': to, '--glow': glow }} aria-hidden="true">
      <svg className="post-cover__glyph" viewBox={`${-PAD} ${-PAD} ${def.w + PAD * 2} ${def.h + PAD * 2}`}>
        {def.paths.map(({ d, closed }, i) => {
          const points = d.map(([x, y]) => `${x},${y}`).join(' ');
          return closed ? <polygon key={i} points={points} /> : <polyline key={i} points={points} />;
        })}
      </svg>
      <span className="shard post-cover__shard" />
    </div>
  );
}

// Articles without a link are listed but not clickable.
export function PostCard({ post, delay = 0 }) {
  const content = (
    <>
      <div className="post-card__media">
        <PostCover {...post.art} />
      </div>
      <h3 className="post-card__title">{post.title}</h3>
      <p className="post-card__meta">
        <time dateTime={post.date}>{formatDate(post.date)}</time> <span aria-hidden="true">|</span> {post.tag}
      </p>
    </>
  );
  const external = post.url && /^https?:\/\//i.test(post.url);
  return (
    <Reveal as="article" className={`post-card${post.url ? ' is-linked' : ''}`} delay={delay}>
      {post.url ? (
        <a className="post-card__link" {...linkProps(post.url)}>
          {content}
          {external && <span className="sr-only">(opens in a new tab)</span>}
        </a>
      ) : (
        <div className="post-card__link">{content}</div>
      )}
    </Reveal>
  );
}

export default function Insights() {
  const { insights } = useContent();
  if (!insights.items.length) return null;
  return (
    <section className="section insights" id="insights" aria-labelledby="insights-title">
      <div className="container">
        <SectionHead
          id="insights-title"
          title={insights.title}
          intro={insights.intro}
          action={{ label: 'View all', href: '/insights' }}
        />
        <div className="insights__grid">
          {newestFirst(insights.items)
            .slice(0, HOME_COUNT)
            .map((post, i) => (
              <PostCard key={itemKey(post, i)} post={post} delay={i * 80} />
            ))}
        </div>
      </div>
    </section>
  );
}
