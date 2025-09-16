// CoCode Preview Runner Component

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';

interface PreviewRunnerProps {
  files: Record<string, { content: string; type: string }>;
  onConsoleMessage?: (message: { type: 'log' | 'error' | 'warn' | 'info'; content: string; timestamp: number }) => void;
  autoRun?: boolean;
  onAutoRunChange?: (enabled: boolean) => void;
}

export function PreviewRunner({ files, onConsoleMessage, autoRun = false, onAutoRunChange }: PreviewRunnerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunContent, setLastRunContent] = useState<string>('');
  const [previewConsoleMessages, setPreviewConsoleMessages] = useState<Array<{type: 'log' | 'error' | 'warn' | 'info', content: string, timestamp: number}>>([]);
  const [showPreviewConsole, setShowPreviewConsole] = useState(false);
  const hasPreviewContent = useMemo(() => Object.keys(files).some(path => /\.(html|css|js)$/i.test(path)), [files]);

  const pushConsoleMessage = useCallback((type: 'log' | 'error' | 'warn' | 'info', content: string) => {
    const message = { type, content, timestamp: Date.now() };
    setPreviewConsoleMessages(prev => [...prev, message]);
    onConsoleMessage?.(message);
  }, [onConsoleMessage]);

  const generatePreviewHTML = () => {
    const htmlFile = Object.entries(files).find(([path]) => path.endsWith('.html'))?.[1]?.content || '';
    const cssFiles = Object.entries(files).filter(([path]) => path.endsWith('.css'));
    const jsFiles = Object.entries(files).filter(([path]) => path.endsWith('.js'));

    let html = htmlFile;

    // If no HTML file, create a basic structure
    if (!html.trim()) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoCode Preview</title>
</head>
<body>
    <div id="app">
        <h1>CoCode Preview</h1>
        <p>Create an HTML file to see your preview here.</p>
    </div>
</body>
</html>`;
    }

    // Inject CSS
    const cssContent = cssFiles.map(([, file]) => file.content).join('\n');
    if (cssContent) {
      const styleTag = `<style>${cssContent}</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else {
        html = `<style>${cssContent}</style>\n${html}`;
      }
    }

    // Inject console bridge and JavaScript
    const jsContent = jsFiles.map(([, file]) => file.content).join('\n');
    const consoleBridge = `
      <script>
        // Console bridge to communicate with parent
        const originalConsole = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info
        };

        ['log', 'error', 'warn', 'info'].forEach(method => {
          console[method] = function(...args) {
            // Call original console method
            originalConsole[method].apply(console, args);
            
            // Send message to parent
            try {
              window.parent.postMessage({
                type: 'console',
                method: method,
                content: args.map(arg => 
                  typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' '),
                timestamp: Date.now()
              }, '*');
            } catch (e) {
              // Ignore errors when posting messages
            }
          };
        });

        // Catch unhandled errors
        window.addEventListener('error', function(e) {
          const errorMsg = e.filename ? 
            \`\${e.message} at \${e.filename.split('/').pop()}:\${e.lineno}:\${e.colno}\` :
            e.message;
          console.error('Runtime Error:', errorMsg);
        });

        window.addEventListener('unhandledrejection', function(e) {
          console.error('Unhandled Promise Rejection:', e.reason);
        });

        // Catch CSS parsing errors
        window.addEventListener('DOMContentLoaded', function() {
          const styles = document.querySelectorAll('style');
          styles.forEach(function(style, index) {
            try {
              // Basic CSS validation - check for common syntax errors
              const cssText = style.textContent || '';
              const openBraces = (cssText.match(/{/g) || []).length;
              const closeBraces = (cssText.match(/}/g) || []).length;
              if (openBraces !== closeBraces) {
                console.warn('CSS Syntax Warning: Mismatched braces in style block', index + 1);
              }
            } catch (err) {
              console.error('CSS Error in style block', index + 1, ':', err.message);
            }
          });
        });
      </script>
    `;

    const scriptTag = jsContent ? `<script>${jsContent}</script>` : '';
    const fullScript = consoleBridge + scriptTag;

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${fullScript}\n</body>`);
    } else {
      html = html + fullScript;
    }

    return html;
  };

  const runPreview = () => {
    if (!iframeRef.current) return;

    setIsRunning(true);
    setError(null);

    try {
      const html = generatePreviewHTML();

      // Basic HTML validation
      validateHTML(html);

      setLastRunContent(html);

      if (iframeRef.current) {
        iframeRef.current.srcdoc = html;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run preview';
      setError(message);
      pushConsoleMessage('error', message);
    } finally {
      setIsRunning(false);
    }
  };

  const validateHTML = (html: string) => {
    // Basic tag balance check for common tags
    const commonTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th'];
    
    commonTags.forEach(tag => {
      const openCount = (html.match(new RegExp(`<${tag}[^>]*>`, 'gi')) || []).length;
      const closeCount = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length;

      if (openCount !== closeCount) {
        pushConsoleMessage('warn', `HTML warning: mismatched <${tag}> tags (${openCount} open, ${closeCount} close)`);
      }
    });

    // Check for missing alt attributes on images
    const imgTags = html.match(/<img[^>]*>/gi) || [];
    imgTags.forEach((img, index) => {
      if (!img.includes('alt=')) {
        pushConsoleMessage('warn', `Accessibility warning: image ${index + 1} missing alt attribute`);
      }
    });
  };

  const clearPreview = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = '';
    }
    setLastRunContent('');
    setPreviewConsoleMessages([]);
  };

  const clearPreviewConsole = () => {
    setPreviewConsoleMessages([]);
  };

  const getMessageIcon = (type: 'log' | 'error' | 'warn' | 'info') => {
    switch (type) {
      case 'error':
        return 'alert-circle';
      case 'warn':
        return 'alert-circle';
      case 'info':
        return 'message-square';
      default:
        return 'terminal';
    }
  };

  const getMessageColor = (type: 'log' | 'error' | 'warn' | 'info') => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-fg';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Listen for console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        const message = {
          type: event.data.method,
          content: event.data.content,
          timestamp: event.data.timestamp
        };
        
        pushConsoleMessage(message.type, message.content);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pushConsoleMessage]);

  // Auto-run with debounce when enabled
  useEffect(() => {
    if (!autoRun) return;

    const currentContent = generatePreviewHTML();
    if (currentContent === lastRunContent) return;

    const timeoutId = setTimeout(() => {
      runPreview();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [files, autoRun, lastRunContent, pushConsoleMessage]);

  return (
    <div className="h-full flex flex-col bg-bg-1">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Icon name="play" size="sm" className="text-muted" />
          <span className="text-sm font-medium text-fg">Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon="play"
            onClick={runPreview}
            disabled={isRunning || !hasPreviewContent}
            title="Run Preview"
          >
            {isRunning ? 'Running...' : 'Run'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon="stop"
            onClick={clearPreview}
            title="Clear Preview"
          >
            Clear
          </Button>
          <Button
            variant={autoRun ? "primary" : "ghost"}
            size="sm"
            icon="settings"
            onClick={() => onAutoRunChange?.(!autoRun)}
            title={autoRun ? "Disable Auto-run" : "Enable Auto-run"}
            disabled={!hasPreviewContent}
          >
            Auto
          </Button>
          <Button
            variant={showPreviewConsole ? "primary" : "ghost"}
            size="sm"
            icon="terminal"
            onClick={() => setShowPreviewConsole(!showPreviewConsole)}
            title={showPreviewConsole ? "Hide Console" : "Show Console"}
          >
            Console
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-2 text-red-400">
            <Icon name="alert-circle" size="sm" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Preview Content */}
      <div className="flex-1 flex flex-col">
        <div className={`flex-1 relative ${showPreviewConsole ? 'h-1/2' : ''}`}>
          {hasPreviewContent ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Code Preview"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted text-sm">
              <div className="text-center max-w-xs px-6">
                <Icon name="code" size="lg" className="mx-auto mb-3 opacity-50" />
                <p>Create an HTML, CSS, or JavaScript file to see the live preview here.</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Preview Console */}
        {showPreviewConsole && (
          <div className="h-1/2 border-t border-border bg-bg-2 flex flex-col">
            {/* Console Header */}
            <div className="flex items-center justify-between p-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Icon name="terminal" size="sm" />
                <span className="text-sm font-medium text-fg">Preview Console</span>
                {previewConsoleMessages.length > 0 && (
                  <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs">
                    {previewConsoleMessages.length}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon="trash"
                onClick={clearPreviewConsole}
                title="Clear Console"
              />
            </div>
            
            {/* Console Messages */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              {previewConsoleMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted">
                  <div className="text-center">
                    <Icon name="terminal" size="lg" className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Console output from your code will appear here</p>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {previewConsoleMessages.map((message, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 rounded hover:bg-bg-1 transition-colors"
                    >
                      <Icon
                        name={getMessageIcon(message.type)}
                        size="sm"
                        className={`mt-0.5 flex-shrink-0 ${getMessageColor(message.type)}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-mono ${getMessageColor(message.type)}`}>
                          {message.content}
                        </div>
                        <div className="text-xs text-muted mt-1">
                          {formatTimestamp(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
