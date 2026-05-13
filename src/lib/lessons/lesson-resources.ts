export type LessonResource = {
  href?: string;
  kind: "attachment-note" | "image" | "link";
  label: string;
};

const markdownResourcePattern = /!?\[([^\]]+)\]\(([^)]+)\)/;
const urlPattern = /^https?:\/\/\S+$/i;

export function parseLessonResources(value: string): LessonResource[] {
  return value
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s+/, ""))
    .filter(Boolean)
    .map(parseResourceLine);
}

function parseResourceLine(line: string): LessonResource {
  const markdownResource = line.match(markdownResourcePattern);

  if (markdownResource) {
    const href = markdownResource[2].trim();

    return {
      href: isSafeHref(href) ? href : undefined,
      kind: line.startsWith("!") ? "image" : "link",
      label: markdownResource[1].trim(),
    };
  }

  if (urlPattern.test(line)) {
    return {
      href: line,
      kind: "link",
      label: line,
    };
  }

  return {
    kind: "attachment-note",
    label: line,
  };
}

function isSafeHref(href: string) {
  return href.startsWith("https://") || href.startsWith("http://") || href.startsWith("/");
}
