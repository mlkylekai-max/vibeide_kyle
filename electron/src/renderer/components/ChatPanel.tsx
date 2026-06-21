import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-title">Agent 对话</div>
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-msg chat-msg--${msg.role}${msg.error ? ' chat-msg--error' : ''}`}>
            <span className="chat-msg-role">{msg.role === 'user' ? 'You' : 'Agent'}</span>
            <p className="chat-msg-text">{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入采集任务，例如：采集抖音 AI 潮玩 20 条"
        />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
