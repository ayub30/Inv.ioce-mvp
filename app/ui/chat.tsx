'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  role: 'user' | 'bot' | 'error';
  text: string;
}

const API_URL = '/api/llm/ask'

export default function Chat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const addMessage = (role: Message['role'], text: string) => {
    setMessages(prev => [...prev, { id: ++idRef.current, role, text }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    addMessage('user', text);
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      const answer = data.answer ?? data.response ?? data.text ?? JSON.stringify(data);
      addMessage('bot', answer);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('Failed to fetch')
          ? 'Could not reach the server. Please try again.'
          : err instanceof Error
          ? err.message
          : 'Something went wrong.';
      addMessage('error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat panel */}
      <div
        className={`
          flex flex-col w-80 bg-base-100 rounded-2xl border border-base-200 shadow-xl
          transition-all duration-200 origin-bottom-right overflow-hidden
          ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
        `}
        style={{ height: open ? '420px' : '0px' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-base-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-3.5 h-3.5 fill-primary-content" viewBox="0 0 24 24">
                <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-base-content leading-tight">Invoice Assistant</p>
              <p className="text-xs text-base-content/40">Ask me anything</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-xs btn-circle text-base-content/50 hover:text-base-content"
            onClick={() => setOpen(false)}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-base-content/25 gap-2 select-none h-full">
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H5.17L4 17.17V4h16v12z" />
              </svg>
              <span className="text-xs">Start a conversation</span>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
            >
              <div
                className={`chat-bubble text-xs ${
                  msg.role === 'user'
                    ? 'chat-bubble-primary'
                    : msg.role === 'error'
                    ? 'chat-bubble-error'
                    : 'bg-base-200 text-base-content'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat chat-start">
              <div className="chat-bubble bg-base-200 text-base-content py-3 px-4">
                <span className="loading loading-dots loading-xs text-base-content/40" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-base-200 flex gap-2 items-center flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            className="input input-bordered input-xs flex-1 text-sm focus:outline-none focus:border-primary"
            placeholder="Ask about an invoice…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="btn btn-primary btn-xs px-3"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>

      {/* FAB toggle button */}
      <button
        className="btn btn-primary btn-circle shadow-lg w-14 h-14"
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle chat"
      >
        {open ? (
          <svg className="w-5 h-5 fill-primary-content" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 fill-primary-content" viewBox="0 0 24 24">
            <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
