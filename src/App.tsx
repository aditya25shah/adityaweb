import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import { TokenSetup } from './components/TokenSetup';
import { GitHubAuth } from './components/GitHubAuth';
import { RepoSelector } from './components/RepoSelector';
import { FileTree } from './components/FileTree';
import { CodeEditor } from './components/CodeEditor';
import { Toolbar } from './components/Toolbar';
import { CommitHistory } from './components/CommitHistory';
import { AISidebar } from './components/AISidebar';
import { RepoCreationModal } from './components/RepoCreationModal';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { Terminal } from './components/Terminal';
import { GitHubAPI } from './utils/github';
import { formatCode, getLanguageFromFilename } from './utils/formatter';
import { GitHubRepo, GitHubBranch, GitHubFile, GitHubCommit, GitHubUser } from './types/github';

const STORAGE_KEYS = {
  GITHUB_TOKEN: 'github_token',
  GEMINI_TOKEN: 'gemini_token',
  THEME: 'editor_theme',
  LAYOUT: 'editor_layout',
  AI_SIDEBAR: 'ai_sidebar_open',
  EXPLORER_WIDTH: 'explorer_width',
  AI_WIDTH: 'ai_width',
};

function App() {
  // Token setup state
  const [tokensConfigured, setTokensConfigured] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [githubAPI, setGithubAPI] = useState<GitHubAPI | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);

  // Repository state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<GitHubBranch | null>(null);

  // File state
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [localFiles, setLocalFiles] = useState<Map<string, string>>(new Map());
  const [folderContents, setFolderContents] = useState<Map<string, GitHubFile[]>>(new Map());

  // UI state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [loading, setLoading] = useState(false);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Map<string, string>>(new Map());
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'push' | 'save' | 'create'>('push');
  const [explorerVisible, setExplorerVisible] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);

  // Initialize theme and check for stored tokens
  useEffect(() => {
    const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark';
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    // Restore AI sidebar state
    const storedAISidebar = localStorage.getItem(STORAGE_KEYS.AI_SIDEBAR);
    if (storedAISidebar === 'true') {
      setAiSidebarOpen(true);
    }

    const storedGithubToken = localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN);
    const storedGeminiToken = localStorage.getItem(STORAGE_KEYS.GEMINI_TOKEN);
    
    if (storedGithubToken && storedGeminiToken) {
      setGeminiApiKey(storedGeminiToken);
      setTokensConfigured(true);
      handleAuth(storedGithubToken);
    }
  }, []);

  // Track changes
  useEffect(() => {
    setHasChanges(fileContent !== originalContent);
  }, [fileContent, originalContent]);

  const triggerCelebration = (type: 'push' | 'save' | 'create') => {
    setCelebrationType(type);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const handleTokensSubmit = (githubToken: string, geminiToken: string) => {
    localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, githubToken);
    localStorage.setItem(STORAGE_KEYS.GEMINI_TOKEN, geminiToken);
    setGeminiApiKey(geminiToken);
    setTokensConfigured(true);
    handleAuth(githubToken);
  };

  const handleAuth = async (token: string) => {
    try {
      setLoading(true);
      const api = new GitHubAPI(token);
      const userData = await api.getUser();
      
      setGithubAPI(api);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Load repositories
      const repoData = await api.getRepositories();
      setRepos(repoData);
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Authentication failed. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setGithubAPI(null);
    setUser(null);
    setRepos([]);
    setSelectedRepo(null);
    setBranches([]);
    setSelectedBranch(null);
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
    setOriginalContent('');
    setLocalFiles(new Map());
    setFolderContents(new Map());
    setTokensConfigured(false);
    setAiSidebarOpen(false);
    localStorage.removeItem(STORAGE_KEYS.GITHUB_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.GEMINI_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.AI_SIDEBAR);
  };

  const handleRepoSelect = async (repo: GitHubRepo) => {
    if (!githubAPI) return;
    
    try {
      setLoading(true);
      setSelectedRepo(repo);
      
      // Load branches
      const [owner, repoName] = repo.full_name.split('/');
      const branchData = await githubAPI.getBranches(owner, repoName);
      setBranches(branchData);
      
      // Select default branch
      const defaultBranch = branchData.find(b => b.name === repo.default_branch) || branchData[0];
      if (defaultBranch) {
        setSelectedBranch(defaultBranch);
        await loadRepoFiles(repo, defaultBranch);
      }
    } catch (error) {
      console.error('Failed to load repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBranchSelect = async (branch: GitHubBranch) => {
    if (!githubAPI || !selectedRepo) return;
    
    setSelectedBranch(branch);
    await loadRepoFiles(selectedRepo, branch);
  };

  const loadRepoFiles = async (repo: GitHubRepo, branch: GitHubBranch) => {
    if (!githubAPI) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = repo.full_name.split('/');
      const fileData = await githubAPI.getRepoContents(owner, repoName, '', branch.name);
      setFiles(fileData);
      
      // Load commits
      const commitData = await githubAPI.getCommits(owner, repoName, branch.name);
      setCommits(commitData);
      
      // Auto-select index.html if it exists
      const indexFile = fileData.find(f => f.name === 'index.html' && f.type === 'file');
      if (indexFile) {
        await handleFileSelect(indexFile);
      }
    } catch (error) {
      console.error('Failed to load repository files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFolderContents = async (folder: GitHubFile) => {
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const contents = await githubAPI.getRepoContents(owner, repoName, folder.path, selectedBranch.name);
      
      setFolderContents(prev => new Map(prev).set(folder.path, contents));
    } catch (error) {
      console.error('Failed to load folder contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: GitHubFile) => {
    if (file.type !== 'file') return;
    
    // Check if it's a local file first
    if (localFiles.has(file.path)) {
      const content = localFiles.get(file.path) || '';
      setSelectedFile(file);
      setFileContent(content);
      setOriginalContent(content);
      return;
    }
    
    // Load from GitHub if it's a GitHub file
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const content = await githubAPI.getFileContent(owner, repoName, file.path, selectedBranch.name);
      
      setSelectedFile(file);
      setFileContent(content);
      setOriginalContent(content);
    } catch (error) {
      console.error('Failed to load file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = (name: string, path: string) => {
    const newFile: GitHubFile = {
      name,
      path,
      type: 'file',
      size: 0,
    };
    
    // Add to files list
    setFiles(prev => [...prev, newFile]);
    
    // Create empty content for the file
    const defaultContent = getDefaultFileContent(name);
    setLocalFiles(prev => new Map(prev).set(path, defaultContent));
    
    // Select the new file
    setSelectedFile(newFile);
    setFileContent(defaultContent);
    setOriginalContent('');
    
    triggerCelebration('create');
  };

  const handleCreateFolder = (name: string, path: string) => {
    const newFolder: GitHubFile = {
      name,
      path,
      type: 'dir',
    };
    
    setFiles(prev => [...prev, newFolder]);
    setExpandedFolders(prev => new Set(prev).add(path));
    triggerCelebration('create');
  };

  const getDefaultFileContent = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeVanta AI Project</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 2.5rem;
            font-weight: 700;
        }
        
        p {
            color: #666;
            font-size: 1.1rem;
            margin-bottom: 2rem;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s ease;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to CodeVanta AI! 🚀</h1>
        <p>Your intelligent coding companion is ready. Start building something amazing!</p>
        <a href="#" class="btn">Get Started</a>
    </div>
</body>
</html>`;
      
      case 'css':
        return `/* CodeVanta AI - Modern CSS */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #f8fafc;
}

/* Container */
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 1rem;
}

p {
    margin-bottom: 1rem;
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 12px 24px;
    background: #3b82f6;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
}

.btn:hover {
    background: #2563eb;
    transform: translateY(-1px);
}

/* Utilities */
.text-center { text-align: center; }
.mt-4 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }
.p-4 { padding: 1rem; }`;
      
      case 'js':
        return `// CodeVanta AI - Modern JavaScript
console.log('Welcome to CodeVanta AI! 🚀');

// Example function
function greet(name) {
    return \`Hello, \${name}! Welcome to intelligent coding.\`;
}

// Example class
class CodeVantaApp {
    constructor() {
        this.init();
    }
    
    init() {
        console.log('CodeVanta AI initialized');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded - Ready to code!');
        });
    }
}

// Initialize app
const app = new CodeVantaApp();

// Example usage
const message = greet('Developer');
console.log(message);`;
      
      case 'ts':
        return `// CodeVanta AI - TypeScript
interface User {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
}

interface AppConfig {
    apiUrl: string;
    version: string;
    debug: boolean;
}

class CodeVantaManager {
    private users: User[] = [];
    private config: AppConfig;
    
    constructor(config: AppConfig) {
        this.config = config;
        this.init();
    }
    
    private init(): void {
        console.log(\`CodeVanta AI v\${this.config.version} initialized\`);
    }
    
    addUser(user: Omit<User, 'id'>): User {
        const newUser: User = {
            id: this.users.length + 1,
            ...user
        };
        this.users.push(newUser);
        return newUser;
    }
    
    getUser(id: number): User | undefined {
        return this.users.find(user => user.id === id);
    }
    
    getActiveUsers(): User[] {
        return this.users.filter(user => user.isActive);
    }
}

// Example usage
const config: AppConfig = {
    apiUrl: 'https://api.codevanta.com',
    version: '1.0.0',
    debug: true
};

const manager = new CodeVantaManager(config);

const newUser = manager.addUser({
    name: 'CodeVanta User',
    email: 'user@codevanta.ai',
    isActive: true
});

console.log('New user created:', newUser);`;
      
      case 'jsx':
        return `import React, { useState, useEffect } from 'react';

const CodeVantaApp = () => {
    const [count, setCount] = useState(0);
    const [message, setMessage] = useState('Welcome to CodeVanta AI!');
    
    useEffect(() => {
        document.title = \`CodeVanta AI - Count: \${count}\`;
    }, [count]);
    
    const handleIncrement = () => {
        setCount(prev => prev + 1);
    };
    
    const handleDecrement = () => {
        setCount(prev => prev - 1);
    };
    
    return (
        <div className="app">
            <header className="app-header">
                <h1>{message}</h1>
                <div className="counter">
                    <button onClick={handleDecrement}>-</button>
                    <span className="count">{count}</span>
                    <button onClick={handleIncrement}>+</button>
                </div>
            </header>
        </div>
    );
};

export default CodeVantaApp;`;
      
      case 'tsx':
        return `import React, { useState, useEffect } from 'react';

interface CounterProps {
    initialValue?: number;
    step?: number;
}

interface User {
    id: number;
    name: string;
    email: string;
}

const Counter: React.FC<CounterProps> = ({ 
    initialValue = 0, 
    step = 1 
}) => {
    const [count, setCount] = useState<number>(initialValue);
    const [users, setUsers] = useState<User[]>([]);
    
    useEffect(() => {
        document.title = \`CodeVanta AI - Count: \${count}\`;
    }, [count]);
    
    const handleIncrement = (): void => {
        setCount(prev => prev + step);
    };
    
    const handleDecrement = (): void => {
        setCount(prev => prev - step);
    };
    
    const handleReset = (): void => {
        setCount(initialValue);
    };
    
    return (
        <div className="counter-container">
            <h2>CodeVanta AI Counter</h2>
            <div className="counter-display">
                <button onClick={handleDecrement}>-</button>
                <span className="count-value">{count}</span>
                <button onClick={handleIncrement}>+</button>
            </div>
            <button onClick={handleReset} className="reset-btn">
                Reset
            </button>
        </div>
    );
};

const CodeVantaApp: React.FC = () => {
    return (
        <div className="app">
            <h1>CodeVanta AI - Intelligent Development</h1>
            <Counter initialValue={0} step={1} />
        </div>
    );
};

export default CodeVantaApp;`;
      
      case 'py':
        return `# CodeVanta AI - Python Script
"""
CodeVanta AI Python Example
Intelligent code generation and assistance
"""

class CodeVantaHelper:
    def __init__(self, name="CodeVanta AI"):
        self.name = name
        self.version = "1.0.0"
        
    def greet(self, user_name):
        """Greet the user with CodeVanta AI"""
        return f"Hello {user_name}! Welcome to {self.name} v{self.version}"
    
    def analyze_code(self, code):
        """Analyze code with AI assistance"""
        lines = code.split('\\n')
        return {
            'lines': len(lines),
            'characters': len(code),
            'words': len(code.split())
        }

def main():
    """Main function"""
    helper = CodeVantaHelper()
    print(helper.greet("Developer"))
    
    sample_code = """
    def hello_world():
        print("Hello from CodeVanta AI!")
    """
    
    analysis = helper.analyze_code(sample_code)
    print(f"Code analysis: {analysis}")

if __name__ == "__main__":
    main()`;
      
      case 'json':
        return `{
  "name": "codevanta-ai-project",
  "version": "1.0.0",
  "description": "A CodeVanta AI powered project",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "build": "webpack --mode production",
    "test": "jest"
  },
  "keywords": [
    "codevanta",
    "ai",
    "javascript",
    "web",
    "intelligent"
  ],
  "author": "CodeVanta AI User",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {}
}`;
      
      case 'md':
        return `# ${fileName.replace('.md', '')}

Welcome to your CodeVanta AI project! 🚀

## Features

- ✅ AI-powered code assistance
- ✅ Intelligent code completion  
- ✅ Smart error detection
- ✅ Advanced code analysis

## Getting Started

Start building with CodeVanta AI's intelligent assistance...

### Code Example

\`\`\`javascript
function greetCodeVanta(name) {
    return \`Hello, \${name}! Ready to code with AI?\`;
}

console.log(greetCodeVanta('Developer'));
\`\`\`

### AI Features

1. Smart code completion
2. Intelligent error detection
3. Code optimization suggestions
4. Natural language code generation

### Quick Commands

- **Ask AI**: Get intelligent code suggestions
- **Optimize**: Let AI improve your code
- **Debug**: AI-powered error detection
- **Explain**: Understand code with AI

---

*Powered by CodeVanta AI* 🤖✨`;
      
      default:
        return `// ${fileName}
// Created with CodeVanta AI on ${new Date().toLocaleDateString()}

console.log('Hello from CodeVanta AI!');

// Your intelligent coding companion is ready to assist
// Ask me anything about your code!
`;
    }
  };

  const handleToggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    // If it's a local file and no repo is selected, show repo creation modal
    if (localFiles.has(selectedFile.path) && !selectedRepo) {
      setPendingFiles(new Map([[selectedFile.path, fileContent]]));
      setShowRepoModal(true);
      return;
    }
    
    // If it's a local file, just update the local storage
    if (localFiles.has(selectedFile.path)) {
      setLocalFiles(prev => new Map(prev).set(selectedFile.path, fileContent));
      setOriginalContent(fileContent);
      triggerCelebration('save');
      return;
    }
    
    // Save to GitHub
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      
      await githubAPI.updateFile(
        owner,
        repoName,
        selectedFile.path,
        fileContent,
        `Update ${selectedFile.name}`,
        selectedFile.sha,
        selectedBranch.name
      );
      
      setOriginalContent(fileContent);
      triggerCelebration('save');
      
      // Reload commits
      const commitData = await githubAPI.getCommits(owner, repoName, selectedBranch.name);
      setCommits(commitData);
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo && localFiles.size > 0) {
      setPendingFiles(localFiles);
      setShowRepoModal(true);
      return;
    }
    await handleSave();
    triggerCelebration('push');
  };

  const handleCreateRepo = async (repoName: string, description: string, isPrivate: boolean) => {
    if (!githubAPI || !user) return;
    
    try {
      setLoading(true);
      
      // Create repository
      const newRepo = await githubAPI.createRepository(repoName, description, isPrivate);
      
      // Add to repos list
      setRepos(prev => [newRepo, ...prev]);
      setSelectedRepo(newRepo);
      
      // Create default branch
      const defaultBranch: GitHubBranch = {
        name: 'main',
        commit: { sha: '', url: '' }
      };
      setBranches([defaultBranch]);
      setSelectedBranch(defaultBranch);
      
      // Push pending files
      for (const [path, content] of pendingFiles) {
        await githubAPI.createFile(
          user.login,
          repoName,
          path,
          content,
          `Add ${path.split('/').pop()}`
        );
      }
      
      // Reload repository files
      await loadRepoFiles(newRepo, defaultBranch);
      
      setPendingFiles(new Map());
      setShowRepoModal(false);
      triggerCelebration('push');
    } catch (error) {
      console.error('Failed to create repository:', error);
      alert('Failed to create repository. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormat = async () => {
    if (!selectedFile) return;
    
    const language = getLanguageFromFilename(selectedFile.name);
    const formatted = await formatCode(fileContent, language);
    setFileContent(formatted);
  };

  const handleToggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
  };

  const handleToggleAI = () => {
    const newState = !aiSidebarOpen;
    setAiSidebarOpen(newState);
    localStorage.setItem(STORAGE_KEYS.AI_SIDEBAR, newState.toString());
  };

  const handleCreateBranch = async (branchName: string) => {
    if (!githubAPI || !selectedRepo || !selectedBranch) return;
    
    try {
      setLoading(true);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      
      await githubAPI.createBranch(owner, repoName, branchName, selectedBranch.commit.sha);
      
      // Reload branches
      const branchData = await githubAPI.getBranches(owner, repoName);
      setBranches(branchData);
      
      // Select the new branch
      const newBranch = branchData.find(b => b.name === branchName);
      if (newBranch) {
        setSelectedBranch(newBranch);
      }
      
      triggerCelebration('create');
    } catch (error) {
      console.error('Failed to create branch:', error);
      alert('Failed to create branch. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = () => {
    setShowTerminal(true);
  };

  const handleDownload = () => {
    if (!selectedFile || !fileContent) return;
    
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (!selectedFile || !fileContent) return;
    
    try {
      await navigator.clipboard.writeText(fileContent);
      alert('Code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy code:', error);
      alert('Failed to copy code to clipboard.');
    }
  };

  // Generate folder structure for AI context
  const generateFolderStructure = (): string => {
    const structure: string[] = [];
    
    const addToStructure = (fileList: GitHubFile[], level: number = 0) => {
      fileList.forEach(file => {
        const indent = '  '.repeat(level);
        structure.push(`${indent}${file.type === 'dir' ? '📁' : '📄'} ${file.name}`);
        
        if (file.type === 'dir' && folderContents.has(file.path)) {
          addToStructure(folderContents.get(file.path) || [], level + 1);
        }
      });
    };
    
    addToStructure(files);
    return structure.join('\n');
  };

  const getSplitSizes = () => {
    if (!explorerVisible && !aiSidebarOpen) return [100];
    if (!explorerVisible && aiSidebarOpen) return [70, 30];
    if (explorerVisible && !aiSidebarOpen) return [25, 75];
    return [22, 48, 30];
  };

  const getSplitMinSizes = () => {
    if (!explorerVisible && !aiSidebarOpen) return [400];
    if (!explorerVisible && aiSidebarOpen) return [400, 350];
    if (explorerVisible && !aiSidebarOpen) return [250, 400];
    return [250, 400, 350];
  };

  // Show token setup if not configured
  if (!tokensConfigured) {
    return <TokenSetup onTokensSubmit={handleTokensSubmit} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-700/50">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl font-bold text-white">CV</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                CodeVanta AI
              </h1>
              <p className="text-gray-400">
                Intelligent Code Editor with AI Assistance
              </p>
            </div>
            
            <GitHubAuth
              onAuth={handleAuth}
              isAuthenticated={isAuthenticated}
              user={user || undefined}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    );
  }

  const getEditorLanguage = () => {
    if (!selectedFile) return 'html';
    return getLanguageFromFilename(selectedFile.name);
  };

  return (
    <div className={`h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''} bg-gray-50 dark:bg-gray-900 relative overflow-hidden`}>
      {/* Celebration Overlay */}
      {showCelebration && (
        <CelebrationOverlay type={celebrationType} />
      )}

      {/* Floating Profile Icon */}
      {user && (
        <div className="fixed top-4 right-4 z-50">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-gray-900/90 backdrop-blur-xl rounded-full p-3 border border-gray-700/50 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={user.avatar_url} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full border-2 border-green-500"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse"></div>
                </div>
                <div className="hidden group-hover:block">
                  <GitHubAuth
                    onAuth={handleAuth}
                    isAuthenticated={isAuthenticated}
                    user={user || undefined}
                    onLogout={handleLogout}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Combined Row */}
      <div className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 shadow-lg z-10 flex-shrink-0">
        {/* Combined Repository Selection and Toolbar */}
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Side - Repository and Branch Selection */}
          <div className="flex items-center gap-4">
            <RepoSelector
              repos={repos}
              branches={branches}
              selectedRepo={selectedRepo || undefined}
              selectedBranch={selectedBranch || undefined}
              onRepoSelect={handleRepoSelect}
              onBranchSelect={handleBranchSelect}
              onCreateBranch={handleCreateBranch}
              loading={loading}
            />
          </div>
          
          {/* Right Side - All Actions */}
          <Toolbar
            onSave={handleSave}
            onPush={handlePush}
            onFormat={handleFormat}
            onToggleTheme={handleToggleTheme}
            onShowHistory={() => setShowHistory(true)}
            onRunCode={handleRunCode}
            onDownload={handleDownload}
            onShare={handleShare}
            onToggleAI={handleToggleAI}
            onToggleExplorer={() => setExplorerVisible(!explorerVisible)}
            theme={theme}
            hasChanges={hasChanges}
            isLoading={loading}
            aiSidebarOpen={aiSidebarOpen}
            explorerVisible={explorerVisible}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Split
          key={`split-${explorerVisible}-${aiSidebarOpen}`}
          className="flex h-full"
          sizes={getSplitSizes()}
          minSize={getSplitMinSizes()}
          expandToMin={false}
          gutterSize={6}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
          gutterStyle={() => ({
            backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            borderRadius: '3px',
            border: '1px solid rgba(107, 114, 128, 0.2)',
          })}
        >
          {/* File Explorer */}
          {explorerVisible && (
            <div className="bg-gray-800/95 backdrop-blur-xl border-r border-gray-700/50 overflow-hidden shadow-lg">
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-sm flex-shrink-0">
                  <h3 className="text-sm font-semibold text-gray-200">EXPLORER</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedRepo ? selectedRepo.name : 'No repository selected'}
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FileTree
                    files={files}
                    onFileSelect={handleFileSelect}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                    onLoadFolderContents={handleLoadFolderContents}
                    selectedFile={selectedFile || undefined}
                    expandedFolders={expandedFolders}
                    onToggleFolder={handleToggleFolder}
                    folderContents={folderContents}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Code Editor */}
          <div className="bg-gray-900/95 backdrop-blur-xl flex flex-col shadow-lg">
            <div className="flex-1 overflow-hidden">
              {selectedFile ? (
                <CodeEditor
                  value={fileContent}
                  onChange={setFileContent}
                  language={getEditorLanguage()}
                  theme={theme}
                  onFormat={handleFormat}
                  fileName={selectedFile.name}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 bg-gray-900">
                  <div className="text-center max-w-lg">
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
                      <span className="text-4xl">🚀</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4 text-white">Ready to code with AI?</h2>
                    <p className="text-lg text-gray-400 mb-6 leading-relaxed">
                      Select a file from the explorer or create a new one to start coding. 
                      Your AI assistant is ready to help you build amazing projects!
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                      <span>💡 AI-powered suggestions</span>
                      <span>⚡ Smart code completion</span>
                      <span>🔧 Intelligent debugging</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Sidebar */}
          {aiSidebarOpen && (
            <AISidebar
              onCodeChange={setFileContent}
              currentCode={fileContent}
              fileName={selectedFile?.name}
              geminiApiKey={geminiApiKey}
              allFiles={localFiles}
              folderStructure={generateFolderStructure()}
              onClose={() => setAiSidebarOpen(false)}
            />
          )}
        </Split>
      </div>

      <CommitHistory
        commits={commits}
        onClose={() => setShowHistory(false)}
        isOpen={showHistory}
      />

      <RepoCreationModal
        isOpen={showRepoModal}
        onClose={() => setShowRepoModal(false)}
        onCreateRepo={handleCreateRepo}
        githubAPI={githubAPI}
        loading={loading}
      />

      <Terminal
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        currentCode={fileContent}
        fileName={selectedFile?.name}
        allFiles={localFiles}
      />
    </div>
  );
}

export default App;