import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
interface CodeEditorProps {
  code: string;
}
const CodeEditor = ({
  code
}: CodeEditorProps) => {
  const [value, setValue] = useState(code);
  // Generate line numbers
  const lineNumbers = value.split('\n').map((_, i) => i + 1).join('\n');
  const highlight = (code: string) => {
    return <SyntaxHighlighter language="python" style={vscDarkPlus} customStyle={{
      margin: 0,
      background: 'transparent'
    }}>
        {code}
      </SyntaxHighlighter>;
  };
  return <div className="flex-1 flex overflow-hidden">
      <div className="text-right p-4 pr-2 text-gray-500 bg-[#1e1e1e] font-mono text-xs select-none">
        {lineNumbers.split('\n').map((num, i) => <div key={i} className="h-[1.5em]">
            {num}
          </div>)}
      </div>
      <div className="flex-1 overflow-auto">
        <Editor value={value} onValueChange={code => setValue(code)} highlight={highlight} padding={16} style={{
        fontFamily: '"Fira code", "Fira Mono", monospace',
        fontSize: 14,
        backgroundColor: '#1e1e1e',
        minHeight: '100%'
      }} className="h-full" />
      </div>
    </div>;
};
export default CodeEditor;