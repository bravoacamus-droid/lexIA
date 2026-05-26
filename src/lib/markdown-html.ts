/**
 * Conversión simple markdown ↔ HTML para el editor TipTap.
 * Sin librerías pesadas para mantener el bundle ligero. Maneja:
 * h1-h3, párrafos, **bold**, *italic*, listas (- y 1.), hr (---).
 */

const ESCAPE_HTML: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESCAPE_HTML[c] || c);
}

function inlineMd(text: string): string {
  let out = escapeHtml(text);
  // bold
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // italic
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // inline code
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return out;
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  const out: string[] = [];

  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      out.push(`<p>${inlineMd(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  }
  function closeList() {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === '') {
      flushParagraph();
      closeList();
      continue;
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      closeList();
      out.push('<hr />');
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      flushParagraph();
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${inlineMd(h[2])}</h${level}>`);
      continue;
    }

    // Unordered list
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    if (ul) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inlineMd(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ol) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inlineMd(ol[1])}</li>`);
      continue;
    }

    // Paragraph accumulation
    closeList();
    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return out.join('\n');
}

/**
 * Inversa: HTML del editor → markdown.
 * No es 100% lossless, pero alcanza para los elementos que produce nuestro markdownToHtml.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html;

  const div = window.document.createElement('div');
  div.innerHTML = html;

  function inline(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(inline).join('');
    if (tag === 'strong' || tag === 'b') return `**${inner}**`;
    if (tag === 'em' || tag === 'i') return `*${inner}*`;
    if (tag === 'code') return `\`${inner}\``;
    if (tag === 'br') return '\n';
    return inner;
  }

  function walk(nodes: NodeListOf<ChildNode> | ChildNode[]): string[] {
    const out: string[] = [];
    for (const node of Array.from(nodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim();
        if (t) out.push(t);
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      switch (tag) {
        case 'h1':
          out.push(`# ${inline(el).trim()}`);
          out.push('');
          break;
        case 'h2':
          out.push(`## ${inline(el).trim()}`);
          out.push('');
          break;
        case 'h3':
          out.push(`### ${inline(el).trim()}`);
          out.push('');
          break;
        case 'p':
          out.push(inline(el).trim());
          out.push('');
          break;
        case 'hr':
          out.push('---');
          out.push('');
          break;
        case 'ul':
          for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
            out.push(`- ${inline(li).trim()}`);
          }
          out.push('');
          break;
        case 'ol':
          {
            let idx = 1;
            for (const li of Array.from(el.querySelectorAll(':scope > li'))) {
              out.push(`${idx}. ${inline(li).trim()}`);
              idx += 1;
            }
            out.push('');
          }
          break;
        case 'blockquote':
          out.push(`> ${inline(el).trim()}`);
          out.push('');
          break;
        default:
          out.push(inline(el).trim());
      }
    }
    return out;
  }

  return walk(div.childNodes).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
