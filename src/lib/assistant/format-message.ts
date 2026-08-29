export type InlineSegment = {
  bold: boolean;
  text: string;
};

export type MessageBlock =
  | { type: "paragraph"; segments: InlineSegment[] }
  | { type: "list"; ordered: boolean; items: InlineSegment[][] };

/**
 * Turns a chat reply's lightweight Markdown into a structured block list
 * for rendering (issue #43: assistant replies were shown as raw text, so a
 * list came out as literal `**Name**` and `- item` lines). Deliberately not
 * a full Markdown parser -- no headings, code blocks, links, or nested
 * lists -- this only needs to cover bold text, bullet/numbered lists, and
 * paragraphs, which is what the assistant's own reply style actually
 * produces.
 */
export function parseAssistantMessage(content: string): MessageBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];

  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let inList = false;

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "paragraph", segments: parseInline(paragraphLines.join(" ")) });
      paragraphLines = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ type: "list", ordered: listOrdered, items: listItems.map(parseInline) });
      listItems = [];
    }
    inList = false;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.*)$/);

    if (bulletMatch || numberedMatch) {
      flushParagraph();
      const ordered = Boolean(numberedMatch);

      if (inList && listOrdered !== ordered) {
        flushList();
      }

      inList = true;
      listOrdered = ordered;
      listItems.push((bulletMatch ?? numberedMatch)![1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ bold: false, text: text.slice(lastIndex, match.index) });
    }

    segments.push({ bold: true, text: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ bold: false, text: text.slice(lastIndex) });
  }

  return segments;
}
