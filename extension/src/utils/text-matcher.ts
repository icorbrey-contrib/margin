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
  private isPDF = false;

  constructor() {}

  reset(): void {
    this.textNodes = [];
    this.corpus = '';
    this.indices = [];
    this.built = false;
    this.isPDF = false;
  }

  private ensureBuilt(): void {
    if (!this.built) {
      this.buildMap();
      this.built = true;
    }
  }

  private buildMap(): void {
    this.isPDF = this.detectPDF();

    const root = this.isPDF ? this.getPDFTextRoot() : document.body;

    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Text) => {
        if (!node.parentNode) return NodeFilter.FILTER_REJECT;
        const parent = node.parentNode as Element;
        const tag = parent.tagName;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.textContent?.trim()) return NodeFilter.FILTER_SKIP;
        const htmlParent = parent as HTMLElement;
        if (htmlParent.style) {
          const display = htmlParent.style.display;
          const visibility = htmlParent.style.visibility;
          if (display === 'none' || visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
        }
        if (this.isPDF && !this.isInPDFTextLayer(parent)) {
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

  private detectPDF(): boolean {
    if (document.querySelector('.pdfViewer') || document.querySelector('#viewer.pdfViewer')) {
      return true;
    }
    if (document.querySelectorAll('.textLayer span').length > 0) {
      return true;
    }
    if (/\.pdf(\?|#|$)/i.test(window.location.href)) {
      return true;
    }
    return false;
  }

  private getPDFTextRoot(): Element | null {
    const viewer =
      document.querySelector('.pdfViewer') || document.querySelector('#viewerContainer');
    if (viewer) return viewer;
    return document.body;
  }

  private isInPDFTextLayer(element: Element): boolean {
    if (!this.isPDF) return true;
    let node: Element | null = element;
    while (node) {
      if (node.classList?.contains('textLayer')) return true;
      node = node.parentElement;
    }
    return false;
  }

  findRange(searchText: string, prefix?: string, suffix?: string): Range | null {
    if (!searchText) return null;

    this.ensureBuilt();

    let matchIndex = this.corpus.indexOf(searchText);
    if (matchIndex !== -1) {
      return this.createRange(matchIndex, matchIndex + searchText.length);
    }

    const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
    const normalizedCorpus = this.corpus.replace(/\s+/g, ' ');
    matchIndex = normalizedCorpus.indexOf(normalizedSearch);
    if (matchIndex !== -1) {
      const originalPos = this.mapNormalizedToOriginal(matchIndex, normalizedSearch.length);
      if (originalPos) {
        return this.createRange(originalPos.start, originalPos.end);
      }
    }

    if (prefix || suffix) {
      const contextMatch = this.findWithContext(searchText, prefix, suffix);
      if (contextMatch) {
        return this.createRange(contextMatch.start, contextMatch.end);
      }
    }

    const fuzzyMatch = this.fuzzyFindInCorpus(searchText);
    if (fuzzyMatch) {
      return this.createRange(fuzzyMatch.start, fuzzyMatch.end);
    }

    const substringMatch = this.findLongestSubstring(searchText);
    if (substringMatch) {
      return this.createRange(substringMatch.start, substringMatch.end);
    }

    return null;
  }

  private mapNormalizedToOriginal(
    normalizedIndex: number,
    normalizedLength: number
  ): { start: number; end: number } | null {
    let normPos = 0;
    let origPos = 0;
    let startOrig = -1;

    while (origPos < this.corpus.length && normPos <= normalizedIndex + normalizedLength) {
      if (normPos === normalizedIndex) {
        startOrig = origPos;
      }

      const char = this.corpus[origPos];

      if (/\s/.test(char)) {
        while (origPos + 1 < this.corpus.length && /\s/.test(this.corpus[origPos + 1])) {
          origPos++;
        }
        normPos++;
      } else {
        normPos++;
      }
      origPos++;

      if (normPos === normalizedIndex + normalizedLength) {
        if (startOrig !== -1) {
          return { start: startOrig, end: origPos };
        }
      }
    }
    return null;
  }

  private findWithContext(
    searchText: string,
    prefix?: string,
    suffix?: string
  ): { start: number; end: number } | null {
    const normalizedText = searchText.replace(/\s+/g, ' ').trim();
    const corpusLower = this.corpus.toLowerCase();
    const textLower = normalizedText.toLowerCase();

    let searchStart = 0;
    let bestMatch: { start: number; end: number; score: number } | null = null;

    while (searchStart < corpusLower.length) {
      const idx = corpusLower.indexOf(textLower, searchStart);
      if (idx === -1) break;

      let score = 0;

      if (prefix) {
        const prefixNorm = prefix.replace(/\s+/g, ' ').trim().toLowerCase();
        const contextBefore = corpusLower.slice(Math.max(0, idx - prefixNorm.length - 10), idx);
        if (contextBefore.includes(prefixNorm)) {
          score += prefixNorm.length;
        }
      }

      if (suffix) {
        const suffixNorm = suffix.replace(/\s+/g, ' ').trim().toLowerCase();
        const contextAfter = corpusLower.slice(
          idx + textLower.length,
          idx + textLower.length + suffixNorm.length + 10
        );
        if (contextAfter.includes(suffixNorm)) {
          score += suffixNorm.length;
        }
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { start: idx, end: idx + normalizedText.length, score };
      }

      searchStart = idx + 1;
    }

    return bestMatch && bestMatch.score > 0 ? bestMatch : null;
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

  private findLongestSubstring(searchText: string): { start: number; end: number } | null {
    if (searchText.length < 20) return null;

    const minLen = Math.floor(searchText.length * 0.6);
    const corpusLower = this.corpus.toLowerCase();
    const searchLower = searchText.toLowerCase();

    for (let len = searchLower.length; len >= minLen; len--) {
      const sub = searchLower.slice(0, len);
      const idx = corpusLower.indexOf(sub);
      if (idx !== -1) {
        return { start: idx, end: idx + len };
      }
    }

    for (let len = searchLower.length; len >= minLen; len--) {
      const sub = searchLower.slice(searchLower.length - len);
      const idx = corpusLower.indexOf(sub);
      if (idx !== -1) {
        return { start: idx, end: idx + len };
      }
    }

    return null;
  }

  private createRange(start: number, end: number): Range | null {
    const startPoint = this.mapIndexToPoint(start);
    const endPoint = this.mapIndexToPoint(end);

    if (startPoint && endPoint) {
      const range = document.createRange();
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      return range;
    }
    return null;
  }

  private mapIndexToPoint(corpusIndex: number): TextPoint | null {
    if (this.indices.length === 0) return null;

    let lo = 0;
    let hi = this.indices.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const info = this.indices[mid];

      if (corpusIndex < info.start) {
        hi = mid - 1;
      } else if (corpusIndex >= info.start + info.length) {
        lo = mid + 1;
      } else {
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
