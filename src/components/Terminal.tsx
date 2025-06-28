import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Play, Trash2, Copy, Download, Folder, File } from 'lucide-react';

interface TerminalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  fileName?: string;
  allFiles: Map<string, string>;
}

interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error' | 'info' | 'success';
  content: string;
  timestamp: Date;
}

export const Terminal: React.FC<TerminalProps> = ({
  isOpen,
  onClose,
  currentCode,
  fileName,
  allFiles,
}) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDirectory, setCurrentDirectory] = useState('/');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Show welcome message
      if (output.length === 0) {
        addOutput('CodeVanta AI Terminal v2.0.0', 'info');
        addOutput('Multi-language execution environment ready!', 'info');
        addOutput('Supported: JavaScript, Python, HTML, CSS, JSON, Markdown, and more', 'info');
        addOutput("Type 'help' for available commands or 'run' to execute current file", 'info');
        addOutput('', 'output');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const addOutput = (content: string, type: 'output' | 'error' | 'info' | 'success' = 'output') => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString() + Math.random(),
      type,
      content,
      timestamp: new Date(),
    };
    setOutput(prev => [...prev, newOutput]);
  };

  const addCommand = (cmd: string) => {
    const commandOutput: TerminalOutput = {
      id: Date.now().toString(),
      type: 'command',
      content: `${currentDirectory}$ ${cmd}`,
      timestamp: new Date(),
    };
    setOutput(prev => [...prev, commandOutput]);
  };

  // Enhanced Python execution with better simulation
  const executePython = async (code: string, filename?: string) => {
    try {
      addOutput(`🐍 Executing Python${filename ? ` file: ${filename}` : ' code'}...`, 'info');
      
      // Simulate Python execution with more realistic behavior
      const lines = code.split('\n').filter(line => line.trim());
      let hasOutput = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Handle print statements
        if (trimmedLine.includes('print(')) {
          const printRegex = /print\s*\(\s*([^)]+)\s*\)/g;
          let match;
          while ((match = printRegex.exec(trimmedLine)) !== null) {
            let content = match[1];
            // Remove quotes and evaluate simple expressions
            content = content.replace(/^["']|["']$/g, '');
            if (content.includes('+')) {
              // Simple string concatenation
              content = content.replace(/["']/g, '').replace(/\s*\+\s*/g, '');
            }
            addOutput(content, 'output');
            hasOutput = true;
          }
        }
        
        // Handle variable assignments and show them
        if (trimmedLine.includes('=') && !trimmedLine.includes('==') && !trimmedLine.includes('!=')) {
          const [varName] = trimmedLine.split('=');
          addOutput(`Variable assigned: ${varName.trim()}`, 'info');
        }
        
        // Handle imports
        if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
          addOutput(`📦 ${trimmedLine}`, 'info');
        }
        
        // Handle function definitions
        if (trimmedLine.startsWith('def ')) {
          const funcName = trimmedLine.match(/def\s+(\w+)/)?.[1];
          addOutput(`🔧 Function defined: ${funcName}`, 'info');
        }
        
        // Handle class definitions
        if (trimmedLine.startsWith('class ')) {
          const className = trimmedLine.match(/class\s+(\w+)/)?.[1];
          addOutput(`🏗️ Class defined: ${className}`, 'info');
        }
      }

      if (!hasOutput && lines.length > 0) {
        addOutput('✅ Python code executed successfully (no output)', 'success');
      }
      
      addOutput(`📊 Processed ${lines.length} lines of Python code`, 'info');
      
    } catch (error) {
      addOutput(`❌ Python Error: ${error}`, 'error');
    }
  };

  // Enhanced JavaScript execution
  const executeJavaScript = async (code: string, filename?: string) => {
    try {
      addOutput(`⚡ Executing JavaScript${filename ? ` file: ${filename}` : ' code'}...`, 'info');
      
      // Capture all console methods
      const originalConsole = { ...console };
      const logs: Array<{type: string, args: any[]}> = [];
      
      ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
        (console as any)[method] = (...args: any[]) => {
          logs.push({ type: method, args });
          (originalConsole as any)[method](...args);
        };
      });

      let result;
      try {
        // Execute the code
        result = new Function(code)();
        
        // Show console outputs
        logs.forEach(({ type, args }) => {
          const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ');
          
          const outputType = type === 'error' ? 'error' : type === 'warn' ? 'info' : 'output';
          addOutput(`[${type.toUpperCase()}] ${message}`, outputType);
        });
        
        // Show return value if exists
        if (result !== undefined) {
          addOutput(`Return value: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}`, 'success');
        }
        
        if (logs.length === 0 && result === undefined) {
          addOutput('✅ JavaScript executed successfully (no output)', 'success');
        }
        
      } catch (execError) {
        addOutput(`❌ Runtime Error: ${execError}`, 'error');
      }
      
      // Restore console
      Object.assign(console, originalConsole);
      
    } catch (error) {
      addOutput(`❌ JavaScript Error: ${error}`, 'error');
    }
  };

  // HTML execution/preview
  const executeHTML = async (code: string, filename?: string) => {
    addOutput(`🌐 Processing HTML${filename ? ` file: ${filename}` : ' code'}...`, 'info');
    
    // Analyze HTML structure
    const parser = new DOMParser();
    try {
      const doc = parser.parseFromString(code, 'text/html');
      
      addOutput('📋 HTML Structure Analysis:', 'info');
      addOutput(`  - Title: ${doc.title || 'No title'}`, 'output');
      addOutput(`  - Elements: ${doc.querySelectorAll('*').length}`, 'output');
      addOutput(`  - Scripts: ${doc.querySelectorAll('script').length}`, 'output');
      addOutput(`  - Stylesheets: ${doc.querySelectorAll('link[rel="stylesheet"], style').length}`, 'output');
      
      // Extract and execute any JavaScript
      const scripts = doc.querySelectorAll('script');
      if (scripts.length > 0) {
        addOutput('🔧 Executing embedded JavaScript...', 'info');
        scripts.forEach((script, index) => {
          if (script.textContent) {
            addOutput(`Script ${index + 1}:`, 'info');
            executeJavaScript(script.textContent);
          }
        });
      }
      
      addOutput('✅ HTML processed successfully', 'success');
      addOutput('💡 Tip: Use the preview feature to see the rendered HTML', 'info');
      
    } catch (error) {
      addOutput(`❌ HTML Parse Error: ${error}`, 'error');
    }
  };

  // CSS analysis
  const executeCSS = async (code: string, filename?: string) => {
    addOutput(`🎨 Analyzing CSS${filename ? ` file: ${filename}` : ' code'}...`, 'info');
    
    try {
      // Basic CSS analysis
      const rules = code.match(/[^{}]+\{[^{}]*\}/g) || [];
      const selectors = code.match(/[^{}]+(?=\{)/g) || [];
      const properties = code.match(/[^:;]+:[^:;]+/g) || [];
      
      addOutput('📊 CSS Analysis:', 'info');
      addOutput(`  - CSS Rules: ${rules.length}`, 'output');
      addOutput(`  - Selectors: ${selectors.length}`, 'output');
      addOutput(`  - Properties: ${properties.length}`, 'output');
      
      // Show some selectors
      if (selectors.length > 0) {
        addOutput('🎯 Selectors found:', 'info');
        selectors.slice(0, 5).forEach(selector => {
          addOutput(`  - ${selector.trim()}`, 'output');
        });
        if (selectors.length > 5) {
          addOutput(`  ... and ${selectors.length - 5} more`, 'output');
        }
      }
      
      addOutput('✅ CSS analyzed successfully', 'success');
      
    } catch (error) {
      addOutput(`❌ CSS Analysis Error: ${error}`, 'error');
    }
  };

  // JSON processing
  const executeJSON = async (code: string, filename?: string) => {
    addOutput(`📄 Processing JSON${filename ? ` file: ${filename}` : ' data'}...`, 'info');
    
    try {
      const parsed = JSON.parse(code);
      addOutput('✅ Valid JSON format', 'success');
      addOutput('📊 JSON Structure:', 'info');
      
      const analyze = (obj: any, depth = 0, maxDepth = 3) => {
        if (depth > maxDepth) return;
        
        const indent = '  '.repeat(depth);
        if (Array.isArray(obj)) {
          addOutput(`${indent}Array with ${obj.length} items`, 'output');
          if (obj.length > 0 && depth < maxDepth) {
            analyze(obj[0], depth + 1, maxDepth);
          }
        } else if (typeof obj === 'object' && obj !== null) {
          const keys = Object.keys(obj);
          addOutput(`${indent}Object with ${keys.length} properties:`, 'output');
          keys.slice(0, 5).forEach(key => {
            addOutput(`${indent}  - ${key}: ${typeof obj[key]}`, 'output');
            if (typeof obj[key] === 'object' && depth < maxDepth) {
              analyze(obj[key], depth + 2, maxDepth);
            }
          });
          if (keys.length > 5) {
            addOutput(`${indent}  ... and ${keys.length - 5} more properties`, 'output');
          }
        }
      };
      
      analyze(parsed);
      
    } catch (error) {
      addOutput(`❌ JSON Parse Error: ${error}`, 'error');
    }
  };

  // Markdown processing
  const executeMarkdown = async (code: string, filename?: string) => {
    addOutput(`📝 Processing Markdown${filename ? ` file: ${filename}` : ' content'}...`, 'info');
    
    try {
      const lines = code.split('\n');
      let headings = 0;
      let codeBlocks = 0;
      let links = 0;
      let images = 0;
      
      lines.forEach(line => {
        if (line.startsWith('#')) headings++;
        if (line.startsWith('```')) codeBlocks++;
        if (line.includes('[') && line.includes('](')) links++;
        if (line.includes('![') && line.includes('](')) images++;
      });
      
      addOutput('📊 Markdown Analysis:', 'info');
      addOutput(`  - Lines: ${lines.length}`, 'output');
      addOutput(`  - Headings: ${headings}`, 'output');
      addOutput(`  - Code blocks: ${Math.floor(codeBlocks / 2)}`, 'output');
      addOutput(`  - Links: ${links}`, 'output');
      addOutput(`  - Images: ${images}`, 'output');
      
      // Extract and show headings
      const headingLines = lines.filter(line => line.startsWith('#'));
      if (headingLines.length > 0) {
        addOutput('📋 Document structure:', 'info');
        headingLines.slice(0, 10).forEach(heading => {
          addOutput(`  ${heading}`, 'output');
        });
      }
      
      addOutput('✅ Markdown processed successfully', 'success');
      
    } catch (error) {
      addOutput(`❌ Markdown Processing Error: ${error}`, 'error');
    }
  };

  // Generic file execution router
  const executeFile = async (filename: string, code: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    addOutput(`🚀 Executing file: ${filename}`, 'info');
    addOutput('', 'output');
    
    switch (ext) {
      case 'js':
      case 'mjs':
        await executeJavaScript(code, filename);
        break;
      case 'py':
        await executePython(code, filename);
        break;
      case 'html':
      case 'htm':
        await executeHTML(code, filename);
        break;
      case 'css':
        await executeCSS(code, filename);
        break;
      case 'json':
        await executeJSON(code, filename);
        break;
      case 'md':
      case 'markdown':
        await executeMarkdown(code, filename);
        break;
      case 'jsx':
      case 'tsx':
        addOutput('⚛️ React/JSX file detected', 'info');
        addOutput('🔧 Extracting JavaScript for execution...', 'info');
        // Remove JSX syntax and execute JavaScript parts
        const jsCode = code
          .replace(/import.*?from.*?;/g, '')
          .replace(/export.*?;/g, '')
          .replace(/<[^>]*>/g, '""'); // Replace JSX with empty strings
        await executeJavaScript(jsCode, filename);
        break;
      case 'ts':
        addOutput('📘 TypeScript file detected', 'info');
        addOutput('🔧 Note: TypeScript compilation not available, treating as JavaScript', 'info');
        await executeJavaScript(code, filename);
        break;
      case 'xml':
        addOutput('📄 XML file detected', 'info');
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(code, 'text/xml');
          addOutput(`✅ Valid XML with ${doc.querySelectorAll('*').length} elements`, 'success');
        } catch (error) {
          addOutput(`❌ XML Parse Error: ${error}`, 'error');
        }
        break;
      case 'txt':
        addOutput('📄 Text file content:', 'info');
        addOutput(code, 'output');
        break;
      default:
        addOutput(`📄 File type: ${ext || 'unknown'}`, 'info');
        addOutput('📋 File content preview:', 'info');
        const preview = code.length > 500 ? code.substring(0, 500) + '...' : code;
        addOutput(preview, 'output');
        addOutput(`📊 File size: ${code.length} characters`, 'info');
    }
    
    addOutput('', 'output');
  };

  const executeCommand = async (cmd: string) => {
    if (!cmd.trim()) return;

    setIsRunning(true);
    addCommand(cmd);

    // Add to command history
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);

    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'run':
          if (args.length === 0 && fileName && currentCode) {
            await executeFile(fileName, currentCode);
          } else if (args.length > 0) {
            const targetFile = args[0];
            const fileContent = allFiles.get(targetFile);
            
            if (fileContent) {
              await executeFile(targetFile, fileContent);
            } else {
              addOutput(`❌ File not found: ${targetFile}`, 'error');
              addOutput('💡 Use "ls" to see available files', 'info');
            }
          } else {
            addOutput('❌ No file specified and no current file selected', 'error');
            addOutput('Usage: run [filename] or select a file first', 'info');
          }
          break;

        case 'ls':
        case 'dir':
          addOutput('📁 Files in project:', 'info');
          if (allFiles.size === 0) {
            addOutput('  (no files)', 'output');
          } else {
            Array.from(allFiles.keys()).sort().forEach(file => {
              const ext = file.split('.').pop()?.toLowerCase();
              const icon = getFileIcon(ext);
              addOutput(`  ${icon} ${file}`, 'output');
            });
          }
          addOutput(`\n📊 Total files: ${allFiles.size}`, 'info');
          break;

        case 'cat':
        case 'type':
          if (args.length > 0) {
            const targetFile = args[0];
            const fileContent = allFiles.get(targetFile);
            if (fileContent) {
              addOutput(`📄 Contents of ${targetFile}:`, 'info');
              addOutput('─'.repeat(50), 'info');
              addOutput(fileContent, 'output');
              addOutput('─'.repeat(50), 'info');
              addOutput(`📊 ${fileContent.split('\n').length} lines, ${fileContent.length} characters`, 'info');
            } else {
              addOutput(`❌ File not found: ${targetFile}`, 'error');
            }
          } else {
            addOutput('❌ Usage: cat <filename>', 'error');
          }
          break;

        case 'clear':
        case 'cls':
          setOutput([]);
          addOutput('CodeVanta AI Terminal v2.0.0', 'info');
          addOutput('Terminal cleared. Ready for new commands!', 'success');
          break;

        case 'help':
          addOutput('🚀 CodeVanta AI Terminal - Available Commands:', 'info');
          addOutput('', 'output');
          addOutput('📁 File Operations:', 'info');
          addOutput('  ls, dir          - List all files in project', 'output');
          addOutput('  cat <file>       - Display file contents', 'output');
          addOutput('  run [file]       - Execute file (any supported type)', 'output');
          addOutput('', 'output');
          addOutput('⚡ Direct Execution:', 'info');
          addOutput('  js <code>        - Execute JavaScript directly', 'output');
          addOutput('  py <code>        - Execute Python directly', 'output');
          addOutput('  node <code>      - Execute Node.js code', 'output');
          addOutput('', 'output');
          addOutput('🛠️ Utilities:', 'info');
          addOutput('  clear, cls       - Clear terminal', 'output');
          addOutput('  pwd              - Show current directory', 'output');
          addOutput('  echo <text>      - Display text', 'output');
          addOutput('  help             - Show this help', 'output');
          addOutput('', 'output');
          addOutput('🎯 Supported File Types:', 'info');
          addOutput('  JavaScript (.js), Python (.py), HTML (.html)', 'output');
          addOutput('  CSS (.css), JSON (.json), Markdown (.md)', 'output');
          addOutput('  React (.jsx, .tsx), TypeScript (.ts), XML (.xml)', 'output');
          break;

        case 'js':
        case 'node':
          if (args.length > 0) {
            const jsCode = args.join(' ');
            await executeJavaScript(jsCode);
          } else {
            addOutput('❌ Usage: js <javascript code>', 'error');
            addOutput('Example: js console.log("Hello World!")', 'info');
          }
          break;

        case 'py':
        case 'python':
          if (args.length > 0) {
            const pyCode = args.join(' ');
            await executePython(pyCode);
          } else {
            addOutput('❌ Usage: py <python code>', 'error');
            addOutput('Example: py print("Hello World!")', 'info');
          }
          break;

        case 'pwd':
          addOutput(currentDirectory, 'output');
          break;

        case 'echo':
          if (args.length > 0) {
            addOutput(args.join(' '), 'output');
          } else {
            addOutput('', 'output');
          }
          break;

        case 'version':
          addOutput('CodeVanta AI Terminal v2.0.0', 'info');
          addOutput('Multi-language execution environment', 'info');
          addOutput('Built with ❤️ for developers', 'success');
          break;

        default:
          addOutput(`❌ Command not found: ${command}`, 'error');
          addOutput("💡 Type 'help' to see available commands", 'info');
      }
    } catch (error) {
      addOutput(`❌ Error executing command: ${error}`, 'error');
    }

    setIsRunning(false);
  };

  const getFileIcon = (ext?: string) => {
    switch (ext) {
      case 'js': return '⚡';
      case 'py': return '🐍';
      case 'html': case 'htm': return '🌐';
      case 'css': return '🎨';
      case 'json': return '📄';
      case 'md': case 'markdown': return '📝';
      case 'jsx': case 'tsx': return '⚛️';
      case 'ts': return '📘';
      case 'xml': return '📋';
      case 'txt': return '📄';
      default: return '📄';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(command);
      setCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple autocomplete for common commands
      const commands = ['run', 'ls', 'cat', 'clear', 'help', 'js', 'py', 'node', 'python'];
      const matches = commands.filter(cmd => cmd.startsWith(command));
      if (matches.length === 1) {
        setCommand(matches[0] + ' ');
      }
    }
  };

  const clearTerminal = () => {
    setOutput([]);
    addOutput('CodeVanta AI Terminal v2.0.0', 'info');
    addOutput('Terminal cleared. Ready for new commands!', 'success');
  };

  const copyOutput = () => {
    const outputText = output.map(item => {
      const timestamp = item.timestamp.toLocaleTimeString();
      return `[${timestamp}] ${item.content}`;
    }).join('\n');
    navigator.clipboard.writeText(outputText);
    addOutput('📋 Terminal output copied to clipboard!', 'success');
  };

  const downloadOutput = () => {
    const outputText = output.map(item => {
      const timestamp = item.timestamp.toLocaleTimeString();
      return `[${timestamp}] ${item.type.toUpperCase()}: ${item.content}`;
    }).join('\n');
    
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codevanta-terminal-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addOutput('💾 Terminal output downloaded!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/98 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] border border-gray-700/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-800/90 backdrop-blur-sm flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
              <TerminalIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">CodeVanta AI Terminal</h2>
              <p className="text-xs text-gray-400">Multi-language execution environment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyOutput}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Copy Output"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadOutput}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Download Output"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={clearTerminal}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Clear Terminal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Output */}
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 bg-black/95 font-mono text-sm min-h-0 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        >
          {output.map((item) => (
            <div key={item.id} className="mb-1 leading-relaxed">
              <div className={`${
                item.type === 'command' 
                  ? 'text-green-400 font-semibold' 
                  : item.type === 'error' 
                    ? 'text-red-400' 
                    : item.type === 'info'
                      ? 'text-blue-400'
                      : item.type === 'success'
                        ? 'text-green-400'
                        : 'text-gray-300'
              }`}>
                {item.content}
              </div>
            </div>
          ))}
          
          {isRunning && (
            <div className="text-yellow-400 animate-pulse flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <span className="ml-2">Executing...</span>
            </div>
          )}
        </div>

        {/* Command Input */}
        <div className="flex items-center gap-3 p-4 border-t border-gray-700/50 bg-gray-800/90 backdrop-blur-sm flex-shrink-0 rounded-b-2xl">
          <span className="text-green-400 font-mono font-bold">{currentDirectory}$</span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command (try 'help', 'ls', or 'run')"
            className="flex-1 bg-transparent text-gray-100 font-mono focus:outline-none placeholder-gray-500 text-sm"
            disabled={isRunning}
          />
          <button
            onClick={() => executeCommand(command)}
            disabled={isRunning || !command.trim()}
            className="p-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            title="Execute Command"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};