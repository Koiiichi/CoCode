// CoCode Search Panel Component

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { searchInFiles, searchFileNames, getSearchStats, highlightMatches } from '@/lib/search';
import type { FileItem } from '@/hooks/useFiles';
import type { SearchResult, SearchOptions } from '@/lib/search';

interface SearchPanelProps {
  files: Record<string, FileItem>;
  onFileSelect?: (filePath: string) => void;
  onNavigateToLine?: (filePath: string, lineNumber: number) => void;
}

export function SearchPanel({ files, onFileSelect, onNavigateToLine }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'content' | 'files'>('content');
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    includeContext: true,
    maxResults: 100
  });
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Perform search with debouncing
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    if (searchMode === 'content') {
      return searchInFiles(files, query, options);
    } else {
      const fileMatches = searchFileNames(files, query, options);
      return fileMatches.map(filePath => ({
        filePath,
        fileName: filePath.split('/').pop() || filePath,
        lineNumber: 1,
        lineContent: '',
        matchStart: 0,
        matchEnd: 0
      }));
    }
  }, [files, query, searchMode, options]);

  const searchStats = useMemo(() => {
    return getSearchStats(searchResults);
  }, [searchResults]);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchMode, options]);

  const handleFileToggle = (filePath: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleResultClick = (result: SearchResult) => {
    if (searchMode === 'files') {
      onFileSelect?.(result.filePath);
    } else {
      onNavigateToLine?.(result.filePath, result.lineNumber);
    }
  };

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of searchResults) {
      if (!groups[result.filePath]) {
        groups[result.filePath] = [];
      }
      groups[result.filePath].push(result);
    }
    return groups;
  }, [searchResults]);

  return (
    <div className="h-full flex flex-col bg-bg-1">
      {/* Search Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="search" size="sm" className="text-muted" />
          <span className="text-sm font-medium text-fg">Search</span>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchMode === 'content' ? 'Search in files...' : 'Search file names...'}
            className="w-full px-3 py-2 bg-bg border border-border rounded text-sm text-fg placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {isSearching && (
            <div className="absolute right-2 top-2">
              <Icon name="search" size="sm" className="text-muted animate-pulse" />
            </div>
          )}
        </div>

        {/* Search Mode Toggle */}
        <div className="flex gap-1 mb-3">
          <Button
            variant={searchMode === 'content' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSearchMode('content')}
            className="flex-1"
          >
            Content
          </Button>
          <Button
            variant={searchMode === 'files' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSearchMode('files')}
            className="flex-1"
          >
            Files
          </Button>
        </div>

        {/* Search Options */}
        {searchMode === 'content' && (
          <div className="flex flex-wrap gap-2 text-xs">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={options.caseSensitive}
                onChange={(e) => setOptions(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                className="w-3 h-3"
              />
              <span className="text-muted">Aa</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={options.wholeWord}
                onChange={(e) => setOptions(prev => ({ ...prev, wholeWord: e.target.checked }))}
                className="w-3 h-3"
              />
              <span className="text-muted">Ab</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={options.useRegex}
                onChange={(e) => setOptions(prev => ({ ...prev, useRegex: e.target.checked }))}
                className="w-3 h-3"
              />
              <span className="text-muted">.*</span>
            </label>
          </div>
        )}

        {/* Search Stats */}
        {query && searchResults.length > 0 && (
          <div className="mt-2 text-xs text-muted">
            {searchStats.totalMatches} matches in {searchStats.filesWithMatches} files
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {!query ? (
          <div className="p-4 text-center text-muted text-sm">
            Enter a search term to find content or files
          </div>
        ) : searchResults.length === 0 ? (
          <div className="p-4 text-center text-muted text-sm">
            No results found for "{query}"
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedResults).map(([filePath, results]) => (
              <div key={filePath} className="mb-2">
                {/* File Header */}
                <div
                  className="flex items-center gap-2 p-2 hover:bg-bg-2 cursor-pointer rounded"
                  onClick={() => handleFileToggle(filePath)}
                >
                  <Icon
                    name={expandedFiles.has(filePath) ? 'chevron-down' : 'chevron-right'}
                    size="xs"
                    className="text-muted"
                  />
                  <Icon name="file" size="sm" className="text-muted" />
                  <span className="text-sm text-fg truncate flex-1">
                    {results[0].fileName}
                  </span>
                  <span className="text-xs text-muted">
                    {results.length}
                  </span>
                </div>

                {/* File Results */}
                {expandedFiles.has(filePath) && (
                  <div className="ml-6 space-y-1">
                    {results.map((result, index) => (
                      <div
                        key={`${result.filePath}-${result.lineNumber}-${index}`}
                        className="p-2 hover:bg-bg-2 cursor-pointer rounded text-xs"
                        onClick={() => handleResultClick(result)}
                      >
                        {searchMode === 'content' ? (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-accent font-mono">
                                {result.lineNumber}
                              </span>
                              <span className="text-muted">:</span>
                            </div>
                            <div
                              className="text-fg font-mono whitespace-pre-wrap break-all"
                              dangerouslySetInnerHTML={{
                                __html: highlightMatches(result.lineContent, query, options)
                              }}
                            />
                          </>
                        ) : (
                          <div className="text-fg">
                            {result.fileName}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
