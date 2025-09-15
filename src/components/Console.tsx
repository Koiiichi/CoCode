// CoCode Console Component

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/Icon';
import { cn } from '@/lib/utils';

interface ConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info';
  content: string;
  timestamp: number;
}

interface ConsoleProps {
  messages: ConsoleMessage[];
  onClear: () => void;
}

export function Console({ messages, onClear }: ConsoleProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMessageIcon = (type: ConsoleMessage['type']) => {
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

  const getMessageColor = (type: ConsoleMessage['type']) => {
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

  return (
    <div className={cn(
      'bg-bg-2 border-t border-border transition-all duration-200',
      isCollapsed ? 'h-10' : 'h-64'
    )}>
      {/* Console Header */}
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-sm font-medium text-fg hover:text-accent transition-colors"
          >
            <Icon 
              name={isCollapsed ? 'menu' : 'menu'} 
              size="sm" 
            />
            <Icon name="terminal" size="sm" />
            Console
            {messages.length > 0 && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded-full text-xs">
                {messages.length}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon="trash"
            onClick={onClear}
            title="Clear Console"
          />
        </div>
      </div>

      {/* Console Content */}
      {!isCollapsed && (
        <div className="h-52 overflow-auto custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted">
              <div className="text-center">
                <Icon name="terminal" size="lg" className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Console output will appear here</p>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded hover:bg-bg-1 transition-colors"
                >
                  <Icon
                    name={getMessageIcon(message.type)}
                    size="sm"
                    className={cn('mt-0.5 flex-shrink-0', getMessageColor(message.type))}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-mono', getMessageColor(message.type))}>
                      {message.content}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
