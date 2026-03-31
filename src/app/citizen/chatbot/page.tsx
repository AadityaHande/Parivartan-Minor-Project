'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2, Trash2, Sparkles, MessageCircle } from 'lucide-react';
import { chatbotFlow } from '@/ai/flows/chatbot-flow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

const quickQuestions = [
    '🚧 How to report?',
    '📍 Track my reports',
    '❓ Report status help',
];

type Message = {
    role: 'user' | 'model';
    content: string;
    timestamp?: string;
};

const STORAGE_KEY = 'parivartan_chat_history';

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved messages on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
    if (messages.length === 0) {
      setMessages([{
        role: 'model',
        content: "👋 Hello! I'm **Roadie**, your Parivartan Assistant.\n\nI can help you with:\n- 🚧 Reporting road problems\n- 📍 Tracking your complaints\n- ❓ Understanding report statuses\n\nHow can I assist you today?",
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question?: string) => {
    const text = question || input;
    if (text.trim() === '') return;

    const userMessage: Message = { 
      role: 'user', 
      content: text,
      timestamp: new Date().toISOString()
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
        const result = await chatbotFlow({ history: newMessages });
        const botMessage: Message = { 
          role: 'model', 
          content: result.response,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMessage]);
    } catch (error) {
        const errorMessage: Message = { 
          role: 'model', 
          content: "😔 I'm sorry, I'm having trouble connecting right now. Please try again later.",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        console.error("Chatbot flow error:", error);
    } finally {
        setIsLoading(false);
        inputRef.current?.focus();
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([{
      role: 'model',
      content: "👋 Hello! I'm **Roadie**, your Parivartan Assistant.\n\nHow can I help you today?",
      timestamp: new Date().toISOString()
    }]);
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };
  
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                Roadie
                <Sparkles className="h-4 w-4 text-yellow-300" />
              </h1>
              <p className="text-xs text-white/80">AI Assistant • Always here to help</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearHistory}
            className="text-white hover:bg-white/20 rounded-full h-10 w-10"
            title="Clear chat history"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={cn(
                "flex items-end gap-2",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'model' && (
                <Avatar className="h-8 w-8 border-2 border-emerald-100 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                msg.role === 'user' 
                  ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-br-md' 
                  : 'bg-white text-gray-800 rounded-bl-md border border-gray-100'
              )}>
                {msg.role === 'model' ? (
                  <ReactMarkdown
                    className="text-sm leading-relaxed"
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p className="whitespace-pre-wrap mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-emerald-700" {...props} />,
                      a: ({node, ...props}) => <a className="text-emerald-600 underline" {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <p className={cn(
                  "text-[10px] mt-1",
                  msg.role === 'user' ? 'text-white/70' : 'text-gray-400'
                )}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
              {msg.role === 'user' && (
                <Avatar className="h-8 w-8 border-2 border-emerald-100 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-end gap-2">
              <Avatar className="h-8 w-8 border-2 border-emerald-100 shadow-sm">
                <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-green-500 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-400">Typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Questions & Input */}
      <div className="bg-white border-t shadow-lg px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Quick Questions */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {quickQuestions.map(q => (
              <Button 
                key={q} 
                variant="outline" 
                size="sm" 
                onClick={() => handleSend(q.replace(/[🚧📍❓]/g, '').trim())} 
                disabled={isLoading}
                className="flex-shrink-0 rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 text-xs"
              >
                {q}
              </Button>
            ))}
          </div>
          
          {/* Input */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input 
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Type your message..."
                disabled={isLoading}
                className="rounded-full pl-4 pr-4 py-5 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400"
              />
            </div>
            <Button 
              onClick={() => handleSend()} 
              disabled={isLoading || !input.trim()}
              className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
