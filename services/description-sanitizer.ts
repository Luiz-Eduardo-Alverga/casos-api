const PLACEHOLDER_TEXT =
  /^(?:n[aã]o\s+informado|nao\s+informado|n\/a|n\.a\.|-|—|–|\.)[\s.]*$/i;

const SECTION_HEADERS = [
  "Comportamento atual:",
  "Comportamento esperado:",
  "Passos para reproduzir:",
  "Contexto/Problema:",
  "Melhoria proposta:",
  "Resultado esperado:",
  "Critérios de aceitação:",
  "Objetivo:",
  "Descrição do requisito:",
  "Regras de negócio:",
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlaceholderLine(line: string): boolean {
  const withoutListPrefix = line.trim().replace(/^\d+\.\s*/, "");
  return PLACEHOLDER_TEXT.test(withoutListPrefix.trim());
}

function isPlaceholderContent(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (PLACEHOLDER_TEXT.test(trimmed)) return true;

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return true;

  return lines.every(isPlaceholderLine);
}

function buildHeaderRegex(): RegExp {
  const headers = SECTION_HEADERS.map(escapeRegex).join("|");
  return new RegExp(`(^|\\n\\n|\\n)(${headers})\\s*\\n`, "gi");
}

/**
 * Remove seções da description cujo conteúdo seja vazio ou placeholder ("Não informado", etc.).
 */
export function sanitizeDescription(description: string): string {
  const headerRegex = buildHeaderRegex();
  const matches: Array<{ header: string; contentStart: number; sectionStart: number }> =
    [];

  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(description)) !== null) {
    matches.push({
      header: match[2],
      sectionStart: match.index + match[1].length,
      contentStart: match.index + match[0].length,
    });
  }

  if (matches.length === 0) {
    return description
      .split("\n")
      .filter((line) => !isPlaceholderLine(line))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const keptSections: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const contentEnd =
      i + 1 < matches.length ? matches[i + 1].sectionStart : description.length;
    const content = description.slice(matches[i].contentStart, contentEnd).trim();

    if (!isPlaceholderContent(content)) {
      keptSections.push(`${matches[i].header}\n\n${content}`);
    }
  }

  return keptSections.join("\n\n").trim();
}
