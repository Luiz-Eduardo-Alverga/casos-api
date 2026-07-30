import type { Product } from "../types/assistant.js";

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractProductAliases(nomeProjeto: string): string[] {
  const aliases = new Set<string>();
  const normalized = normalizeForMatch(nomeProjeto);
  aliases.add(normalized);

  const parenMatch = nomeProjeto.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (parenMatch) {
    aliases.add(normalizeForMatch(parenMatch[1].trim()));
    aliases.add(normalizeForMatch(parenMatch[2].trim()));
  }

  return [...aliases].filter((alias) => alias.length >= 2);
}

function hasWordBoundaryMatch(text: string, term: string): boolean {
  const pattern = new RegExp(
    `(?:^|[^a-z0-9])${escapeRegex(term)}(?:[^a-z0-9]|$)`,
    "i",
  );
  return pattern.test(text);
}

/**
 * Pontua o quanto um produto é mencionado explicitamente no texto.
 * Aliases mais longos e específicos recebem pontuação maior.
 */
export function scoreProductMatch(text: string, product: Product): number {
  const normalizedText = normalizeForMatch(text);
  let bestScore = 0;

  for (const alias of extractProductAliases(product.nome_projeto)) {
    if (!hasWordBoundaryMatch(normalizedText, alias)) continue;
    bestScore = Math.max(bestScore, alias.length * 10);
  }

  return bestScore;
}

/**
 * Encontra o produto com melhor correspondência explícita no texto.
 */
export function findBestProductMatch(
  text: string,
  products: Product[],
): Product | undefined {
  let bestProduct: Product | undefined;
  let bestScore = 0;

  for (const product of products) {
    const score = scoreProductMatch(text, product);
    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  return bestProduct;
}

/**
 * Resolve o produto final combinando a resposta da IA com matching programático.
 * Prioriza menções explícitas na descrição sobre inferências da IA.
 */
export function resolveProductMatch(
  content: string,
  aiProduct: Product | undefined,
  products: Product[],
): Product | undefined {
  const trimmedContent = content.trim();
  if (!trimmedContent) return aiProduct;

  const programmaticMatch = findBestProductMatch(trimmedContent, products);
  const aiScore = aiProduct ? scoreProductMatch(trimmedContent, aiProduct) : 0;
  const programmaticScore = programmaticMatch
    ? scoreProductMatch(trimmedContent, programmaticMatch)
    : 0;

  if (programmaticMatch && aiScore === 0) {
    return programmaticMatch;
  }

  if (programmaticMatch && aiProduct && programmaticMatch.id !== aiProduct.id) {
    return programmaticScore >= aiScore ? programmaticMatch : aiProduct;
  }

  if (aiProduct && aiScore > 0) {
    return aiProduct;
  }

  return programmaticMatch;
}

/**
 * Ajusta o prefixo do título quando o produto identificado diverge do retornado pela IA.
 */
export function fixTitleProductPrefix(title: string, product: Product): string {
  const match = title.match(/^([^>]+)(\s*>\s*.+)$/);
  if (!match) return title;

  const currentPrefix = normalizeForMatch(match[1].trim());
  const expectedPrefix = normalizeForMatch(product.nome_projeto);

  if (
    currentPrefix === expectedPrefix ||
    expectedPrefix.startsWith(currentPrefix) ||
    currentPrefix.startsWith(expectedPrefix)
  ) {
    return title;
  }

  return `${product.nome_projeto}${match[2]}`;
}
