import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles,
  Loader2,
  Trash2,
} from 'lucide-react';

interface AISidebarProps {
  onCodeChange: (code: string) => void;
  currentCode: string;
  fileName?: string;
  geminiApiKey: string;
  allFiles?: Map<string, string>;
  folderStructure?: string;
  onClose: () => void;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export const AISidebar: React.FC<AISidebarProps> = ({
  onCodeChange,
  currentCode,
  fileName,
  geminiApiKey,
  allFiles = new Map(),
  folderStructure = '',
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('codevanta_conversation_history');
    if (savedHistory) {
      try {
        setConversationHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      }
    }
  }, []);

  // Save conversation history to localStorage
  useEffect(() => {
    if (conversationHistory.length > 0) {
      localStorage.setItem('codevanta_conversation_history', JSON.stringify(conversationHistory.slice(-20))); // Keep last 20 conversations
    }
  }, [conversationHistory]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      throw new Error('Gemini API key is not configured. Please check your token setup.');
    }

    try {
      // Enhanced AI prompt with personality and context awareness
      let contextInfo = `You are CodeVanta AI, an exceptionally intelligent and friendly coding assistant with a warm, professional personality. You're helping with a web development project and you have deep understanding of modern development practices.

PERSONALITY TRAITS:
- Enthusiastic and encouraging about coding
- Professional yet approachable
- Remember past conversations and build upon them
- Provide detailed explanations when helpful
- Suggest best practices and modern techniques
- Be proactive in offering improvements

CONVERSATION HISTORY (for context):
${conversationHistory.slice(-5).join('\n')}

CURRENT PROJECT CONTEXT:
Current file: ${fileName || 'untitled'}
Current file content:
\`\`\`
${currentCode}
\`\`\`

Project structure:
${folderStructure}

ADDITIONAL PROJECT FILES:`;

      // Add other files context if available
      if (allFiles.size > 0) {
        contextInfo += '\n';
        Array.from(allFiles.entries()).slice(0, 8).forEach(([path, content]) => {
          if (path !== fileName && content.length < 1500) {
            contextInfo += `\n${path}:\n\`\`\`\n${content.substring(0, 800)}${content.length > 800 ? '...' : ''}\n\`\`\`\n`;
          }
        });
      }

      contextInfo += `

CAPABILITIES YOU HAVE:
- Code optimization and refactoring
- Bug detection and fixing
- Feature suggestions and implementation
- Code explanation and documentation
- GitHub operations (PR creation, issue tracking, branch management)
- UI/UX improvements
- Performance optimization
- Security best practices
- Modern web development techniques

USER REQUEST: ${userMessage}

INSTRUCTIONS:
1. Remember our previous conversations and build upon them
2. Be enthusiastic and encouraging
3. Provide practical, actionable advice
4. If suggesting code changes, explain the reasoning
5. Offer to help with GitHub operations like creating PRs or issues
6. Be proactive in suggesting improvements
7. Use a conversational, friendly tone
8. If asked about branches, PRs, or issues, offer to help create them

Respond as CodeVanta AI with your characteristic enthusiasm and expertise!`;

      const requestBody = {
        contents: [{
          parts: [{
            text: contextInfo
          }]
        }]
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to get AI response';
        
        if (response.status === 400) {
          errorMessage = 'Invalid API request. Please check your Gemini API key.';
        } else if (response.status === 401) {
          errorMessage = 'Invalid or expired Gemini API key. Please update your API key in settings.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please check your Gemini API key permissions.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
        } else if (response.status >= 500) {
          errorMessage = 'Gemini API server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        throw new Error('Invalid response format from Gemini API');
      }
      
      return data.candidates[0].content.parts[0].text || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('AI API Error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Network error. Please check your internet connection and try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add to conversation history
    setConversationHistory(prev => [...prev, `User: ${inputValue}`]);
    
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await generateResponse(inputValue);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Add AI response to conversation history
      setConversationHistory(prev => [...prev, `CodeVanta AI: ${aiResponse.substring(0, 200)}...`]);

      // Check if the AI response contains code that should replace the current code
      const codeBlockMatch = aiResponse.match(/```[\s\S]*?\n([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        const extractedCode = codeBlockMatch[1].trim();
        if (extractedCode.length > 50) { // Only replace if it's substantial code
          onCodeChange(extractedCode);
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: error instanceof Error ? error.message : 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConversationHistory([]);
    localStorage.removeItem('codevanta_conversation_history');
  };

  // Initial greeting message
  useEffect(() => {
    if (messages.length === 0) {
      const greetingMessage: Message = {
        id: 'greeting',
        type: 'ai',
        content: `👋 Hey there! I'm CodeVanta AI, your intelligent coding companion! 

I'm here to help you build amazing projects with:
•  Smart code optimization and refactoring
•  Bug detection and fixes
•  Feature suggestions and implementation
•  Code explanations and best practices
•  GitHub operations (PRs, issues, branches)
•  UI/UX improvements

I remember our conversations, so feel free to reference previous discussions. What would you like to work on today?`,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);
    }
  }, []);

  return (
    <div className="bg-gray-800/95 backdrop-blur-xl border-l border-gray-700/50 flex flex-col shadow-lg h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">CodeVanta AI</h3>
            <p className="text-sm text-gray-400">Your Intelligent Coding Companion</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Clear Chat History"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Close AI Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                message.type === 'user'
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white'
                  : 'bg-gray-700/80 text-gray-100 backdrop-blur-sm border border-gray-600/50'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-3 opacity-70 ${
                message.type === 'user' ? 'text-purple-100' : 'text-gray-400'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700/80 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-600/50">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span className="text-sm text-gray-300">CodeVanta AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-700/50 bg-gray-800/50 flex-shrink-0">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask CodeVanta AI anything about your code..."
            className="flex-1 px-4 py-4 border border-gray-600/50 rounded-xl bg-gray-700/80 backdrop-blur-sm text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="p-4 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 text-white rounded-xl hover:from-purple-600 hover:via-pink-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};