console.log("Script loaded successfully!");

// Configure Monaco Editor path
require.config({ paths: { vs: 'monaco-editor/min/vs' } });

// Initialize Monaco Editor
require(['vs/editor/editor.main'], function () {
  const editor = monaco.editor.create(document.getElementById('editor'), {
    value: '// Start coding here...',
    language: 'javascript', // Change to 'python', 'html', etc., for other languages
    theme: 'vs-dark', // Choose 'vs-dark' or 'vs-light'
  });
});
