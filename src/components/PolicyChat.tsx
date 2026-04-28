import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import API_URL from '../config';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  'What are the NAAQS annual limits for PM2.5 and NO₂?',
  'What are the GRAP Stage IV emergency restrictions in Delhi-NCR?',
  'What is the EC penalty formula for Red category industries under CPCB 2017?',
  'What consent timelines apply for Red vs Green category industries?',
  'What are Punjab\'s stubble burning prevention measures for 2026-27?',
  'What does the Environment Protection Act 1986 say about penalties for violations?',
  'What are the key obligations under E-Waste Management Rules 2022?',
  'How does climate change affect health and disease burden in India per NPCCHH?',
];

const PolicyChat: React.FC = () => {
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: data.answer, sources: data.sources ?? [], timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: "Couldn't reach the backend. Please try again later.", timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080c12] flex flex-col text-gray-900 dark:text-white">
      <style>{':root{--tt-bg:#fff;--tt-border:#e5e7eb;--tt-text:#111827}.dark{--tt-bg:#0f1520;--tt-border:rgba(255,255,255,0.1);--tt-text:#fff}'}</style>

      <div className="border-b border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-400 bg-clip-text text-transparent">
              Clarity.AI — Policy Assistant
            </h1>
            <p className="text-gray-400 dark:text-white/35 text-xs mt-0.5">Grounded in official Indian environmental law. Cites sources, never guesses.</p>
          </div>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div className="w-full max-w-2xl text-center mb-6">
            <div className="w-14 h-14 rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
              <Bot size={26} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">How can I help you?</h2>
            <p className="text-gray-500 dark:text-white/50 text-sm max-w-md mx-auto">
              Ask about pollution standards, industry compliance, CPCB penalties, consent procedures, waste management rules, or climate health impacts.
            </p>
          </div>
          <div className="w-full max-w-2xl mb-5">
            <div className="flex gap-3 rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] px-4 py-3 focus-within:border-blue-400 dark:focus-within:border-blue-400/60">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="e.g. What is the penalty for EPR non-compliance?"
                className="flex-1 text-sm focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25" />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl flex items-center gap-2 text-sm font-medium transition-colors shrink-0">
                {loading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />} Send
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-2xl">
            {SUGGESTED_QUESTIONS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-left px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.04] text-sm text-gray-700 dark:text-white/70 hover:border-blue-400 dark:hover:border-blue-400/60 transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-gradient-to-br from-blue-600 to-purple-600' : 'bg-gray-900 dark:bg-white/10'}`}>
                    {msg.role === 'assistant' ? <Bot size={18} className="text-white" /> : <User size={18} className="text-white" />}
                  </div>
                  <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-white dark:bg-white/[0.04] border border-gray-100 dark:border-white/8 text-gray-800 dark:text-white/90 rounded-tl-sm'
                        : 'bg-gray-900 dark:bg-white/10 text-white rounded-tr-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            p:          ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            strong:     ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                            em:         ({ children }) => <em className="italic text-gray-700 dark:text-white/70">{children}</em>,
                            ul:         ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 pl-1">{children}</ul>,
                            ol:         ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 pl-1">{children}</ol>,
                            li:         ({ children }) => <li className="text-gray-700 dark:text-white/80">{children}</li>,
                            h1:         ({ children }) => <h1 className="text-base font-bold text-gray-900 dark:text-white mt-3 mb-1">{children}</h1>,
                            h2:         ({ children }) => <h2 className="text-sm font-bold text-gray-900 dark:text-white mt-3 mb-1">{children}</h2>,
                            h3:         ({ children }) => <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90 mt-2 mb-1">{children}</h3>,
                            code:       ({ children }) => <code className="bg-gray-100 dark:bg-white/8 text-blue-700 dark:text-blue-300 rounded px-1 py-0.5 text-xs font-mono">{children}</code>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-400 pl-3 my-2 text-gray-600 dark:text-white/50 italic">{children}</blockquote>,
                            hr:         () => <hr className="my-3 border-gray-200 dark:border-white/10" />,
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      ) : msg.text}
                    </div>
                    {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-1 mt-1">
                        {msg.sources.map(src => (
                          <span key={src} className="text-xs bg-blue-50 dark:bg-blue-500/12 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">📄 {src}</span>
                        ))}
                      </div>
                    )}
                    <span className="text-gray-300 dark:text-white/25 text-xs px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div className="rounded-2xl border border-gray-100 dark:border-white/8 bg-white dark:bg-white/[0.04] rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1 items-center h-5">
                      <span className="w-2 h-2 bg-gray-300 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-300 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-300 dark:bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-white/6 bg-white dark:bg-white/[0.02] px-6 py-4">
            <div className="max-w-4xl mx-auto flex gap-3">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
                placeholder="Ask about pollution standards, CPCB penalties, consent procedures..."
                className="flex-1 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 dark:focus:border-blue-400" />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
                {loading ? <Loader size={16} className="animate-spin" /> : <Send size={16} />} Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PolicyChat;
