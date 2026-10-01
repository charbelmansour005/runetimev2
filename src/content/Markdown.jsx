import { createElement, useMemo } from 'react';
import { slugify } from '../data/insights';
import { linkProps } from './format';

// A small Markdown renderer for articles written in the CMS. It builds React
// elements (never raw HTML), so article text can't inject markup. Supports
// ## headings, paragraphs, **bold**, *italic*, `code`, [links](https://…),
// - and 1. lists, > quotes, ``` code blocks, | tables |, --- rules and
// ![images](/api/media/…).

const SAFE_LINK = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i;
const SAFE_IMAGE = /^\/(?!\/)/; // images uploaded to this site

// ---------- Blocks ----------

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const HEADING = /^(#{1,4})\s+(.+?)(?:\s+#+)?\s*$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const IMAGE = /^\s*!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)\s*$/;
const QUOTE = /^\s*>/;
const LIST_ITEM = /^\s*([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

const isBlank = (line) => !line.trim();
const isTableStart = (lines, i) => lines[i].includes('|') && TABLE_DIVIDER.test(lines[i + 1] ?? '');
const startsBlock = (lines, i) =>
  [FENCE, HEADING, RULE, IMAGE, QUOTE, LIST_ITEM].some((re) => re.test(lines[i])) || isTableStart(lines, i);

// "| a | b \| c |" → ["a", "b | c"]
function tableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .replace(/\\\|/g, '\u0000')
    .split('|')
    .map((cell) => cell.trim().replace(/\u0000/g, '|'));
}

export function parseBlocks(source) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (isBlank(line)) {
      i += 1;
    } else if ((m = FENCE.exec(line))) {
      const code = [];
      for (i += 1; i < lines.length && !lines[i].trim().startsWith(m[1]); i += 1) code.push(lines[i]);
      i += 1;
      blocks.push({ type: 'code', lang: m[2], text: code.join('\n') });
    } else if ((m = HEADING.exec(line))) {
      // The page title is the h1, so article headings start at h2.
      blocks.push({ type: 'heading', level: Math.max(2, m[1].length), text: m[2] });
      i += 1;
    } else if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
    } else if ((m = IMAGE.exec(line))) {
      blocks.push({ type: 'image', alt: m[1], src: m[2], caption: m[3] ?? '' });
      i += 1;
    } else if (QUOTE.test(line)) {
      const quoted = [];
      for (; i < lines.length && QUOTE.test(lines[i]); i += 1) quoted.push(lines[i].replace(/^\s*>\s?/, ''));
      blocks.push({ type: 'quote', children: parseBlocks(quoted.join('\n')) });
    } else if ((m = LIST_ITEM.exec(line))) {
      const ordered = /\d/.test(m[1]);
      const items = [];
      while (i < lines.length) {
        const item = LIST_ITEM.exec(lines[i]);
        if (item && /\d/.test(item[1]) === ordered) {
          items.push(item[2]);
        } else if (items.length && /^\s{2,}\S/.test(lines[i])) {
          items[items.length - 1] += ` ${lines[i].trim()}`; // a wrapped item
        } else {
          break;
        }
        i += 1;
      }
      blocks.push({ type: 'list', ordered, start: ordered ? parseInt(m[1], 10) : 1, items });
    } else if (isTableStart(lines, i)) {
      const head = tableCells(line);
      const align = tableCells(lines[i + 1]).map((cell) =>
        cell.endsWith(':') ? (cell.startsWith(':') ? 'center' : 'right') : undefined,
      );
      const rows = [];
      for (i += 2; i < lines.length && lines[i].includes('|') && !isBlank(lines[i]); i += 1) {
        rows.push(tableCells(lines[i]));
      }
      blocks.push({ type: 'table', head, align, rows });
    } else {
      const text = [line.trim()];
      for (i += 1; i < lines.length && !isBlank(lines[i]) && !startsBlock(lines, i); i += 1) text.push(lines[i].trim());
      blocks.push({ type: 'paragraph', text: text.join(' ') });
    }
  }
  return blocks;
}

// ---------- Inline ----------

const SPECIAL = /[\\`*_[]/;

export function parseInline(text) {
  const nodes = [];
  let plain = '';
  let rest = String(text);
  const flush = () => {
    if (plain) nodes.push(plain);
    plain = '';
  };
  const take = (length, node) => {
    flush();
    nodes.push(node);
    rest = rest.slice(length);
  };

  while (rest) {
    const next = rest.search(SPECIAL);
    if (next !== 0) {
      plain += next < 0 ? rest : rest.slice(0, next);
      rest = next < 0 ? '' : rest.slice(next);
      continue;
    }
    let m;
    if ((m = /^\\([\\`*_[\]()#+\-.!|>~])/.exec(rest))) {
      plain += m[1];
      rest = rest.slice(2);
    } else if ((m = /^(`+)(?!`)([\s\S]*?[^`])\1(?!`)/.exec(rest))) {
      take(m[0].length, { type: 'code', text: m[2].replace(/^ ([\s\S]*) $/, '$1') });
    } else if ((m = /^\*\*(?=\S)([\s\S]*?\S)\*\*/.exec(rest))) {
      take(m[0].length, { type: 'strong', children: parseInline(m[1]) });
    } else if ((m = /^\*(?=[^\s*])([\s\S]*?[^\s*])\*(?!\*)/.exec(rest))) {
      take(m[0].length, { type: 'em', children: parseInline(m[1]) });
    } else if (!/[a-z0-9]$/i.test(plain) && (m = /^_(?=\S)([\s\S]*?\S)_(?![a-z0-9])/i.exec(rest))) {
      take(m[0].length, { type: 'em', children: parseInline(m[1]) });
    } else if ((m = /^\[([^\]]+)\]\(\s*((?:[^\s()]|\([^\s()]*\))+)\s*\)/.exec(rest))) {
      take(m[0].length, { type: 'link', href: m[2], children: parseInline(m[1]) });
    } else {
      plain += rest[0];
      rest = rest.slice(1);
    }
  }
  flush();
  return nodes;
}

const plainText = (nodes) =>
  nodes.map((node) => (typeof node === 'string' ? node : node.text ?? plainText(node.children))).join('');

// Gives each heading an id from its text, so a section can be linked to.
function withHeadingIds(blocks, used = new Map()) {
  return blocks.map((block) => {
    if (block.type === 'quote') return { ...block, children: withHeadingIds(block.children, used) };
    if (block.type !== 'heading') return block;
    const nodes = parseInline(block.text);
    const base = slugify(plainText(nodes)) || 'section';
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return { ...block, nodes, id: count > 1 ? `${base}-${count}` : base };
  });
}

// ---------- Rendering ----------

function Inline({ nodes }) {
  return nodes.map((node, i) => {
    if (typeof node === 'string') return node;
    if (node.type === 'code') return <code key={i}>{node.text}</code>;
    const children = <Inline nodes={node.children} />;
    if (node.type === 'strong') return <strong key={i}>{children}</strong>;
    if (node.type === 'em') return <em key={i}>{children}</em>;
    if (!SAFE_LINK.test(node.href)) return <span key={i}>{children}</span>;
    const props = linkProps(node.href);
    return (
      <a key={i} {...props}>
        {children}
        {props.target && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  });
}

const inline = (text) => <Inline nodes={parseInline(text)} />;

function Blocks({ blocks }) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case 'heading':
        return createElement(`h${block.level}`, { key: i, id: block.id }, <Inline nodes={block.nodes} />);
      case 'paragraph':
        return <p key={i}>{inline(block.text)}</p>;
      case 'list': {
        const items = block.items.map((item, j) => <li key={j}>{inline(item)}</li>);
        return block.ordered ? (
          <ol key={i} start={block.start === 1 ? undefined : block.start}>
            {items}
          </ol>
        ) : (
          <ul key={i}>{items}</ul>
        );
      }
      case 'quote':
        return (
          <blockquote key={i}>
            <Blocks blocks={block.children} />
          </blockquote>
        );
      case 'code':
        // Focusable, so long lines can be scrolled with the keyboard.
        return (
          <pre key={i} tabIndex={0}>
            <code data-lang={block.lang || undefined}>{block.text}</code>
          </pre>
        );
      case 'table':
        return (
          <div key={i} className="md-table">
            <table>
              <thead>
                <tr>
                  {block.head.map((cell, j) => (
                    <th key={j} scope="col" style={{ textAlign: block.align[j] }}>
                      {inline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {block.head.map((_, j) => (
                      <td key={j} style={{ textAlign: block.align[j] }}>
                        {inline(row[j] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'image':
        if (!SAFE_IMAGE.test(block.src)) return null;
        return (
          <figure key={i}>
            <img src={block.src} alt={block.alt} loading="lazy" decoding="async" />
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        );
      case 'rule':
        return <hr key={i} />;
      default:
        return null;
    }
  });
}

export default function Markdown({ source, className }) {
  const blocks = useMemo(() => withHeadingIds(parseBlocks(source)), [source]);
  return (
    <div className={className}>
      <Blocks blocks={blocks} />
    </div>
  );
}
