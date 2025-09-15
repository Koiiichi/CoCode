// CoCode Firebase Key Encoding Utilities

/**
 * Encode a file path to be safe for Firebase keys
 * Firebase keys cannot contain: . # $ [ ]
 */
export function encodeFirebaseKey(key: string): string {
  return key
    .replace(/\./g, '%2E')
    .replace(/\#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D')
    .replace(/\//g, '%2F'); // Also encode forward slashes for nested paths
}

/**
 * Decode a Firebase-safe key back to original format
 */
export function decodeFirebaseKey(key: string): string {
  return key
    .replace(/%2E/g, '.')
    .replace(/%23/g, '#')
    .replace(/%24/g, '$')
    .replace(/%5B/g, '[')
    .replace(/%5D/g, ']')
    .replace(/%2F/g, '/');
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Infer language/type from file extension
 */
export function inferLanguageFromExtension(filename: string): string {
  const ext = getFileExtension(filename);
  
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    
    // Web
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    
    // Python
    py: 'python',
    pyw: 'python',
    
    // C/C++
    c: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    h: 'c',
    hpp: 'cpp',
    
    // Java
    java: 'java',
    
    // C#
    cs: 'csharp',
    
    // Go
    go: 'go',
    
    // Rust
    rs: 'rust',
    
    // PHP
    php: 'php',
    
    // Ruby
    rb: 'ruby',
    
    // Shell
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    
    // Config/Data
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    
    // Markdown
    md: 'markdown',
    markdown: 'markdown',
    
    // SQL
    sql: 'sql',
    
    // Docker
    dockerfile: 'dockerfile',
    
    // Default
    txt: 'plaintext',
  };
  
  return languageMap[ext] || 'plaintext';
}

/**
 * Get icon name for file type
 */
export function getFileIcon(_filename: string, isFolder = false): 'folder' | 'folder-open' | 'file' {
  if (isFolder) return 'folder';
  return 'file';
}

/**
 * Validate filename for Firebase compatibility
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || filename.trim() === '') return false;
  if (filename.includes('..')) return false; // Prevent directory traversal
  if (filename.startsWith('/') || filename.endsWith('/')) return false;
  
  // Check for invalid characters that might cause issues
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  return !invalidChars.test(filename);
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .trim()
    .replace(/[<>:"|?*\x00-\x1f]/g, '_')
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/\/+/g, '/'); // Collapse multiple slashes
}
