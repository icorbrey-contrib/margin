interface TextNodeIndex {
  start: number;
  node: Text;
  length: number;
}

interface TextPoint {
  node: Text;
  offset: number;
}

export class DOMTextMatcher {
  private textNodes: Text[] = [];
  private corpus = '';
  private indices: TextNodeIndex[] = [];
  private built = false;

  constructor() {}

  private ensureBuilt(): void {
    if (!this.built) {
      this.buildMap();
      this.built = true;
    }
  }

  private buildMap(): void {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Text) => {
        if (!node.parentNode) return NodeFilter.FILTER_REJECT;
        const parent = node.parentNode as Element;
        const tag = parent.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent?.trim()) return NodeFilter.FILTER_SKIP;
        const htmlParent = parent as HTMLElement;
        if (
          htmlParent.style &&
          (htmlParent.style.display === 'none' || htmlParent.style.visibility === 'hidden')
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let currentNode: Text | null;
    let index = 0;
    const parts: string[] = [];

    while ((currentNode = walker.nextNode() as Text | null)) {
      const text = currentNode.textContent || '';
      this.textNodes.push(currentNode);
      parts.push(text);
      this.indices.push({
        start: index,
        node: currentNode,
        length: text.length,
      });
      index += text.length;
    }

    this.corpus = parts.join('');
  }

  findRange(searchText: string): Range | null {
    if (!searchText) return null;

    this.ensureBuilt();

    let matchIndex = this.corpus.indexOf(searchText);

    if (matchIndex === -1) {
      const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
      matchIndex = this.corpus.indexOf(normalizedSearch);

      if (matchIndex === -1) {
        const fuzzyMatch = this.fuzzyFindInCorpus(searchText);
        if (fuzzyMatch) {
          const start = this.mapIndexToPoint(fuzzyMatch.start);
          const end = this.mapIndexToPoint(fuzzyMatch.end);
          if (start && end) {
            const range = document.createRange();
            range.setStart(start.node, start.offset);
            range.setEnd(end.node, end.offset);
            return range;
          }
        }
        return null;
      }
    }

    const start = this.mapIndexToPoint(matchIndex);
    const end = this.mapIndexToPoint(matchIndex + searchText.length);

    if (start && end) {
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      return range;
    }
    return null;
  }

  private fuzzyFindInCorpus(searchText: string): { start: number; end: number } | null {
    const searchWords = searchText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (searchWords.length === 0) return null;

    const corpusLower = this.corpus.toLowerCase();
    const firstWord = searchWords[0].toLowerCase();
    let searchStart = 0;

    while (searchStart < corpusLower.length) {
      const wordStart = corpusLower.indexOf(firstWord, searchStart);
      if (wordStart === -1) break;

      let corpusPos = wordStart;
      let matched = true;
      let lastMatchEnd = wordStart;

      for (const word of searchWords) {
        const wordLower = word.toLowerCase();
        while (corpusPos < corpusLower.length && /\s/.test(this.corpus[corpusPos])) {
          corpusPos++;
        }
        const corpusSlice = corpusLower.slice(corpusPos, corpusPos + wordLower.length);
        if (corpusSlice !== wordLower) {
          matched = false;
          break;
        }
        corpusPos += wordLower.length;
        lastMatchEnd = corpusPos;
      }

      if (matched) {
        return { start: wordStart, end: lastMatchEnd };
      }
      searchStart = wordStart + 1;
    }

    return null;
  }

  private mapIndexToPoint(corpusIndex: number): TextPoint | null {
    for (const info of this.indices) {
      if (corpusIndex >= info.start && corpusIndex < info.start + info.length) {
        return { node: info.node, offset: corpusIndex - info.start };
      }
    }
    if (this.indices.length > 0) {
      const last = this.indices[this.indices.length - 1];
      if (corpusIndex === last.start + last.length) {
        return { node: last.node, offset: last.length };
      }
    }
    return null;
  }
}

export function findCanonicalUrl(range: Range): string | null {
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== document.body) {
    const element = node as Element;
    if (
      (element.tagName === 'BLOCKQUOTE' || element.tagName === 'Q') &&
      element.hasAttribute('cite')
    ) {
      if (element.contains(range.commonAncestorContainer)) {
        return element.getAttribute('cite');
      }
    }
    node = node.parentNode;
  }
  return null;
}
