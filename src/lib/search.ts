// CoCode Search Utilities

import type { FileItem } from '@/hooks/useFiles';

export interface SearchResult {
  filePath: string;
  fileName: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
  contextBefore?: string;
  contextAfter?: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  useRegex?: boolean;
  includeContext?: boolean;
  maxResults?: number;
}

/**
 * Search across all files in the project
 */
export function searchInFiles(
  files: Record<string, FileItem>,
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  if (!query.trim()) return [];

  const {
    caseSensitive = false,
    wholeWord = false,
    useRegex = false,
    includeContext = true,
    maxResults = 100
  } = options;

  const results: SearchResult[] = [];
  let searchPattern: RegExp;

  try {
    if (useRegex) {
      const flags = caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(query, flags);
    } else {
      let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (wholeWord) {
        escapedQuery = `\\b${escapedQuery}\\b`;
      }
      
      const flags = caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(escapedQuery, flags);
    }
  } catch (error) {
    // Invalid regex, return empty results
    return [];
  }

  for (const [filePath, file] of Object.entries(files)) {
    if (!file.content) continue;

    const lines = file.content.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match;
      
      // Reset regex lastIndex for global search
      searchPattern.lastIndex = 0;
      
      while ((match = searchPattern.exec(line)) !== null) {
        const result: SearchResult = {
          filePath,
          fileName: filePath.split('/').pop() || filePath,
          lineNumber: lineIndex + 1,
          lineContent: line,
          matchStart: match.index,
          matchEnd: match.index + match[0].length
        };

        if (includeContext) {
          if (lineIndex > 0) {
            result.contextBefore = lines[lineIndex - 1];
          }
          if (lineIndex < lines.length - 1) {
            result.contextAfter = lines[lineIndex + 1];
          }
        }

        results.push(result);

        if (results.length >= maxResults) {
          return results;
        }

        // Prevent infinite loop on zero-width matches
        if (match[0].length === 0) {
          searchPattern.lastIndex++;
        }
      }
    }
  }

  return results;
}

/**
 * Search for file names matching a pattern
 */
export function searchFileNames(
  files: Record<string, FileItem>,
  query: string,
  options: Pick<SearchOptions, 'caseSensitive' | 'useRegex'> = {}
): string[] {
  if (!query.trim()) return [];

  const { caseSensitive = false, useRegex = false } = options;
  const filePaths = Object.keys(files);

  try {
    if (useRegex) {
      const flags = caseSensitive ? '' : 'i';
      const pattern = new RegExp(query, flags);
      return filePaths.filter(path => pattern.test(path));
    } else {
      const searchTerm = caseSensitive ? query : query.toLowerCase();
      return filePaths.filter(path => {
        const fileName = caseSensitive ? path : path.toLowerCase();
        return fileName.includes(searchTerm);
      });
    }
  } catch (error) {
    // Invalid regex, fallback to simple string search
    const searchTerm = caseSensitive ? query : query.toLowerCase();
    return filePaths.filter(path => {
      const fileName = caseSensitive ? path : path.toLowerCase();
      return fileName.includes(searchTerm);
    });
  }
}

/**
 * Highlight search matches in text
 */
export function highlightMatches(
  text: string,
  query: string,
  options: Pick<SearchOptions, 'caseSensitive' | 'wholeWord' | 'useRegex'> = {}
): string {
  if (!query.trim()) return text;

  const { caseSensitive = false, wholeWord = false, useRegex = false } = options;

  try {
    let searchPattern: RegExp;

    if (useRegex) {
      const flags = caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(query, flags);
    } else {
      let escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      if (wholeWord) {
        escapedQuery = `\\b${escapedQuery}\\b`;
      }
      
      const flags = caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(escapedQuery, flags);
    }

    return text.replace(searchPattern, '<mark>$&</mark>');
  } catch (error) {
    // Invalid regex, return original text
    return text;
  }
}

/**
 * Get search statistics
 */
export function getSearchStats(results: SearchResult[]): {
  totalMatches: number;
  filesWithMatches: number;
  fileStats: Record<string, number>;
} {
  const fileStats: Record<string, number> = {};
  
  for (const result of results) {
    fileStats[result.filePath] = (fileStats[result.filePath] || 0) + 1;
  }

  return {
    totalMatches: results.length,
    filesWithMatches: Object.keys(fileStats).length,
    fileStats
  };
}
