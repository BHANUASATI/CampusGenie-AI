import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAssistantService } from '../services/api';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import './AIAssistant.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Source {
  filename: string;
  doc_type: string;
  relevance: number;
  excerpt?: string;
}

interface Message {
  id: number;
  content: string;
  sender_type: 'user' | 'ai';
  created_at: string;
  // Rich fields from the new AI engine (optional — old messages won't have them)
  confidence?: number;
  sources?: Source[];
  follow_up_questions?: string[];
  intent_detected?: string;
  download_suggestions?: {
    should_download: boolean;
    formats: string[];
    content_type: string;
    filename: string;
  };
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
// Handles **bold**, *italic*, `code`, ## headers, bullet lists, numbered lists.
// No external dep needed.
function renderMarkdown(text: string): React.ReactNode[] {
  // Clean up the text - remove JSON-like formatting if present
  let cleanText = text;
  
  // Remove JSON-like structures that might be in the response
  cleanText = cleanText.replace(/\{[\s\S]*?\}/g, ''); // Remove JSON objects
  cleanText = cleanText.replace(/\[[\s\S]*?\]/g, ''); // Remove JSON arrays
  cleanText = cleanText.replace(/"[^"]+"\s*:\s*"[^"]+"/g, ''); // Remove key-value pairs
  cleanText = cleanText.replace(/"[^"]+"\s*:\s*/g, ''); // Remove key with colon
  cleanText = cleanText.replace(/,\s*$/gm, ''); // Remove trailing commas
  cleanText = cleanText.replace(/^\s*-\s+/gm, '• '); // Convert JSON bullets to bullets
  cleanText = cleanText.replace(/^\s*[\r\n]/gm, ''); // Remove empty lines
  cleanText = cleanText.replace(/\n\s*\n/g, '\n\n'); // Fix multiple newlines
  cleanText = cleanText.trim();
  
  const lines = cleanText.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    if (listType === 'ul') {
      nodes.push(
        <ul key={key} className="cg-ai-list">
          {listBuffer.map((item, i) => (
            <li key={i}>{inlineFormat(item)}</li>
          ))}
        </ul>
      );
    } else {
      nodes.push(
        <ol key={key} className="cg-ai-list cg-ai-list-ol">
          {listBuffer.map((item, i) => (
            <li key={i}>{inlineFormat(item)}</li>
          ))}
        </ol>
      );
    }
    listBuffer = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    // Skip empty lines after JSON cleanup
    if (!line.trim()) return;
    
    // H1/H2
    if (/^## /.test(line)) {
      flushList(`fl${i}`);
      nodes.push(<h3 key={i} className="cg-ai-h3">{inlineFormat(line.slice(3))}</h3>);
    } else if (/^# /.test(line)) {
      flushList(`fl${i}`);
      nodes.push(<h2 key={i} className="cg-ai-h2">{inlineFormat(line.slice(2))}</h2>);
    }
    // Unordered list
    else if (/^[•\-\*] /.test(line)) {
      if (listType === 'ol') flushList(`fl${i}`);
      listType = 'ul';
      listBuffer.push(line.slice(2));
    }
    // Ordered list
    else if (/^\d+\. /.test(line)) {
      if (listType === 'ul') flushList(`fl${i}`);
      listType = 'ol';
      listBuffer.push(line.replace(/^\d+\. /, ''));
    }
    // Normal paragraph line
    else {
      flushList(`fl${i}`);
      nodes.push(<p key={i} className="cg-ai-p">{inlineFormat(line)}</p>);
    }
  });
  flushList('final');
  return nodes;
}

function inlineFormat(text: string): React.ReactNode {
  // Clean up any remaining JSON-like artifacts
  let cleanText = text;
  cleanText = cleanText.replace(/"\s*:\s*/g, ': '); // Clean up JSON colons
  cleanText = cleanText.replace(/,\s*$/gm, ''); // Remove trailing commas
  cleanText = cleanText.replace(/^\s*-\s+/gm, '• '); // Convert JSON bullets to bullets
  cleanText = cleanText.trim();
  
  // Process **bold**, *italic*, `code` inline
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleanText)) !== null) {
    if (match.index > last) parts.push(cleanText.slice(last, match.index));
    if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={match.index} className="cg-ai-code">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < cleanText.length) parts.push(cleanText.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ─── Confidence bar ───────────────────────────────────────────────────────────
const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
  
  return (
    <div className="cg-confidence">
      <span className="cg-confidence-label">Confidence</span>
      <div className="cg-confidence-track">
        <div className="cg-confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="cg-confidence-value" style={{ color }}>{pct}%</span>
    </div>
  );
};

// ─── Source chips ─────────────────────────────────────────────────────────────
const SourceChips: React.FC<{ sources: Source[] }> = ({ sources }) => {
  if (!sources?.length) return null;
  return (
    <div className="cg-sources">
      <span className="cg-sources-label">📄 Sources</span>
      <div className="cg-sources-chips">
        {sources.map((s, i) => (
          <span key={i} className="cg-source-chip" title={s.excerpt || s.filename}>
            {s.filename}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Follow-up suggestions ────────────────────────────────────────────────────
const FollowUpSuggestions: React.FC<{ questions: string[]; onSelect: (q: string) => void }> = ({ questions, onSelect }) => {
  if (!questions?.length) return null;
  return (
    <div className="cg-followup">
      <span className="cg-followup-label">💡 You might also ask</span>
      <div className="cg-followup-pills">
        {questions.slice(0, 3).map((q, i) => (
          <button key={i} className="cg-followup-pill" onClick={() => onSelect(q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Download suggestions ──────────────────────────────────────────────────────
const DownloadSuggestions: React.FC<{ 
  suggestions: Message['download_suggestions']; 
  content: string;
  onDownload: (content: string, format: string, filename?: string) => void;
}> = ({ suggestions, content, onDownload }) => {
  if (!suggestions?.should_download) return null;
  
  return (
    <div className="cg-download">
      <span className="cg-download-label">📥 Download as</span>
      <div className="cg-download-buttons">
        {suggestions.formats.map((format) => (
          <button 
            key={format} 
            className="cg-download-btn"
            onClick={() => onDownload(content, format, suggestions.filename)}
          >
            {format.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'list' | 'chat'>('list');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Voice functionality
  const voiceRecognition = useVoiceRecognition({ continuous: false, lang: 'en-US' });
  const textToSpeech = useTextToSpeech({ lang: 'en-US' });
  const [voiceMode, setVoiceMode] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
      setView('list');
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [view]);

  // Auto-send voice message when speech recognition completes
  useEffect(() => {
    if (voiceRecognition.transcript && !voiceRecognition.isListening) {
      setInputMessage(voiceRecognition.transcript);
      // Auto-send after a short delay to allow user to see the transcript
      const timer = setTimeout(() => {
        if (voiceRecognition.transcript.trim()) {
          sendMessage(voiceRecognition.transcript);
          voiceRecognition.resetTranscript();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [voiceRecognition.transcript, voiceRecognition.isListening]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const data = await aiAssistantService.getConversations() as Conversation[];
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const createNewConversation = async () => {
    try {
      setError(null);
      const conv = await aiAssistantService.createConversation() as Conversation;
      
      // Validate the conversation object
      if (!conv || !conv.id) {
        throw new Error('Invalid conversation response from server');
      }
      
      setConversations(prev => [conv, ...prev]);
      setCurrentConversation(conv);
      setMessages([]);
      setView('chat');
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError(err?.message || 'Failed to start a new chat. Please try again.');
    }
  };

  const openConversation = async (conversationId: number) => {
    try {
      setError(null);
      const data = await aiAssistantService.getConversation(conversationId.toString()) as any;
      
      // Validate the response
      if (!data || !data.id) {
        throw new Error('Invalid conversation data received');
      }
      
      setCurrentConversation(data);
      // Messages arrive from the backend already ordered by (created_at, id) ASC.
      // Trust that order — no client-side sort needed.
      setMessages(data.messages || []);
      setView('chat');
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err?.message || 'Failed to load conversation.');
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? inputMessage).trim();
    if (!text || !currentConversation || isLoading) return;

    setInputMessage('');
    setIsLoading(true);
    setError(null);

    // 1. Optimistically show the user bubble immediately (real-time feel)
    const tempId = Date.now();
    const tempUserMsg: Message = {
      id: tempId,
      content: text,
      sender_type: 'user',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      // Check if conversation ID is valid
      if (!currentConversation.id) {
        throw new Error('Invalid conversation ID');
      }

      const response = await aiAssistantService.sendMessage(
        currentConversation.id.toString(),
        text,
      ) as any;

      // 2. Build rich AI message from response (includes confidence, sources, follow-ups)
      const richAiMsg: Message = {
        ...response.ai_message,
        confidence: response.ai_message.confidence ?? undefined,
        sources: response.ai_message.sources ?? undefined,
        follow_up_questions: response.ai_message.follow_up_questions ?? undefined,
        intent_detected: response.ai_message.intent_detected ?? undefined,
        download_suggestions: response.ai_message.download_suggestions ?? undefined,
      };

      // 3. Replace temp bubble with server-confirmed user msg + append AI msg.
      // We do NOT sort here — existing messages are already in chronological order,
      // and the two new messages (user confirmation + AI reply) belong at the end.
      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.id !== tempId);
        const tail: Message[] = [];
        if (response.user_message) {
          tail.push(response.user_message);
        }
        tail.push(richAiMsg);
        return [...withoutTemp, ...tail];
      });

      // 4. Update conversation title in both header and sidebar list
      if (response.conversation_title) {
        const newTitle = response.conversation_title;
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : prev);
        setConversations(prev =>
          prev.map(c =>
            c.id === currentConversation.id ? { ...c, title: newTitle } : c
          )
        );
      }

      // 5. Auto-speak the AI response if voice mode is enabled
      if (voiceMode && richAiMsg.content) {
        textToSpeech.speak(richAiMsg.content);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      // On error remove the optimistic bubble and show error banner
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError(err?.message || 'Failed to send message. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      await aiAssistantService.deleteConversation(convId.toString());
      setConversations(prev => prev.filter(c => c.id !== convId));
      if (currentConversation?.id === convId) {
        setCurrentConversation(null);
        setMessages([]);
        setView('list');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleDownload = async (content: string, format: string, filename?: string) => {
    try {
      const response = await fetch('http://localhost:8002/api/ai/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          content,
          format,
          filename,
        }),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFilename = filename || `download.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          downloadFilename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download content. Please try again.');
    }
  };

  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
    if (!voiceMode) {
      textToSpeech.stop();
    }
  };

  const handleVoiceInput = () => {
    if (voiceRecognition.isListening) {
      voiceRecognition.stopListening();
    } else {
      voiceRecognition.startListening();
    }
  };

  const formatRelative = (dateStr: string) => {
    if (!dateStr) return 'just now';
    
    let d: Date;
    
    // Handle different date formats
    if (dateStr.includes('T') && dateStr.includes('Z')) {
      // ISO format with timezone
      d = new Date(dateStr);
    } else if (dateStr.includes(',')) {
      // Locale format like "8/7/2026, 8:30:00 PM"
      d = new Date(dateStr);
    } else {
      // Try parsing as is
      d = new Date(dateStr);
    }
    
    if (isNaN(d.getTime())) return 'just now';
    
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // Handle future dates (server time might be ahead)
    if (diff < 0) return 'just now';
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <div className="cg-ai-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cg-ai-panel">

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="cg-ai-header">
          <div className="cg-ai-header-left">
            {view === 'chat' && (
              <button className="cg-ai-back" onClick={() => setView('list')} title="Back to conversations">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </button>
            )}
            <div className="cg-ai-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="cg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8"/>
                    <stop offset="100%" stopColor="#a78bfa"/>
                  </linearGradient>
                </defs>
                <rect x="6" y="8" width="12" height="10" rx="2.5" fill="url(#cg-grad)"/>
                <circle cx="9.5" cy="12" r="1.5" fill="white" opacity="0.9"/>
                <circle cx="14.5" cy="12" r="1.5" fill="white" opacity="0.9"/>
                <rect x="10" y="15" width="4" height="1" rx="0.5" fill="white" opacity="0.7"/>
                <line x1="12" y1="8" x2="12" y2="5.5" stroke="url(#cg-grad)" strokeWidth="1.5"/>
                <circle cx="12" cy="4.5" r="1.2" fill="#818cf8"/>
              </svg>
            </div>
            <div className="cg-ai-header-text">
              <span className="cg-ai-title">
                {view === 'chat' && currentConversation
                  ? currentConversation.title
                  : 'CampusGenie AI'}
              </span>
              <span className="cg-ai-subtitle">
                {view === 'chat' ? 'Powered by Gemini 2.5 Flash + RAG' : 'Your academic assistant'}
              </span>
            </div>
          </div>
          <div className="cg-ai-header-right">
            {view === 'list' && (
              <button className="cg-ai-new-btn" onClick={createNewConversation} title="New chat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Chat
              </button>
            )}
            <button className="cg-ai-close" onClick={onClose} title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </header>

        {/* ── Error banner ────────────────────────────────────── */}
        {error && (
          <div className="cg-ai-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            {error}
            <button onClick={() => setError(null)} className="cg-ai-error-dismiss">✕</button>
          </div>
        )}

        {/* ── Conversation list ────────────────────────────────── */}
        {view === 'list' && (
          <div className="cg-ai-list-view">
            {/* Hero */}
            <div className="cg-ai-hero">
              <div className="cg-ai-hero-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <defs>
                    <linearGradient id="hero-g" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#818cf8"/>
                      <stop offset="100%" stopColor="#a78bfa"/>
                    </linearGradient>
                  </defs>
                  <rect x="12" y="16" width="24" height="20" rx="5" fill="url(#hero-g)"/>
                  <circle cx="19" cy="24" r="3" fill="white" opacity="0.9"/>
                  <circle cx="29" cy="24" r="3" fill="white" opacity="0.9"/>
                  <rect x="20" y="29" width="8" height="2" rx="1" fill="white" opacity="0.7"/>
                  <line x1="24" y1="16" x2="24" y2="10" stroke="#818cf8" strokeWidth="3"/>
                  <circle cx="24" cy="8" r="3" fill="#a78bfa"/>
                </svg>
                <div className="cg-ai-hero-pulse"/>
              </div>
              <h2 className="cg-ai-hero-title">Hi! I'm CampusGenie 👋</h2>
              <p className="cg-ai-hero-desc">
                Ask me anything about courses, attendance, policies, notices, faculty, exams, or placements.
              </p>
              <div className="cg-ai-capabilities">
                {['📚 Course Info', '📊 Attendance Rules', '📋 Policies', '📢 Notices', '👨‍🏫 Faculty', '💼 Placements'].map(cap => (
                  <span key={cap} className="cg-ai-cap-chip">{cap}</span>
                ))}
              </div>
            </div>

            {/* Conversation list */}
            <div className="cg-ai-convs-header">
              <span>Recent Conversations</span>
              <span className="cg-ai-conv-count">{conversations.length}</span>
            </div>

            <div className="cg-ai-convs-list">
              {loadingConversations ? (
                <div className="cg-ai-loading-state">
                  <div className="cg-ai-spinner"/>
                  <span>Loading conversations…</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="cg-ai-empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p>No conversations yet</p>
                  <span>Start a new chat to get help</span>
                </div>
              ) : (
                conversations.map(conv => (
                  <div key={conv.id} className="cg-ai-conv-item" onClick={() => openConversation(conv.id)}>
                    <div className="cg-ai-conv-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div className="cg-ai-conv-info">
                      <span className="cg-ai-conv-title">{conv.title}</span>
                      <span className="cg-ai-conv-date">{formatRelative(conv.updated_at)}</span>
                    </div>
                    <button
                      className="cg-ai-conv-delete"
                      onClick={(e) => deleteConversation(e, conv.id)}
                      title="Delete"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Start chat CTA */}
            <div className="cg-ai-start-cta">
              <button className="cg-ai-start-btn" onClick={createNewConversation}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Start New Conversation
              </button>
            </div>
          </div>
        )}

        {/* ── Chat view ─────────────────────────────────────────── */}
        {view === 'chat' && (
          <div className="cg-ai-chat-view">
            {/* Messages */}
            <div className="cg-ai-messages">
              {messages.length === 0 && !isLoading && (
                <div className="cg-ai-chat-welcome">
                  <div className="cg-ai-chat-welcome-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="chat-g" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8"/>
                          <stop offset="100%" stopColor="#a78bfa"/>
                        </linearGradient>
                      </defs>
                      <rect x="6" y="8" width="12" height="10" rx="2.5" fill="url(#chat-g)"/>
                      <circle cx="9.5" cy="12" r="1.5" fill="white"/>
                      <circle cx="14.5" cy="12" r="1.5" fill="white"/>
                      <line x1="12" y1="8" x2="12" y2="5.5" stroke="#818cf8" strokeWidth="1.5"/>
                      <circle cx="12" cy="4.5" r="1.2" fill="#a78bfa"/>
                    </svg>
                  </div>
                  <p className="cg-ai-chat-welcome-text">
                    Ask me anything — I'll search university documents and your data to give you accurate answers.
                  </p>
                  <div className="cg-ai-quick-prompts">
                    {[
                      'What is the minimum attendance required?',
                      'Show me my upcoming assignment deadlines',
                      'What courses am I enrolled in?',
                    ].map(q => (
                      <button key={q} className="cg-ai-quick-btn" onClick={() => sendMessage(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <div
                  key={`${msg.id}-${index}`}
                  className={`cg-ai-bubble-wrapper ${msg.sender_type === 'user' ? 'cg-user' : 'cg-bot'}`}
                >
                  {msg.sender_type === 'ai' && (
                    <div className="cg-ai-avatar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="6" y="8" width="12" height="10" rx="2.5" fill="#818cf8"/>
                        <circle cx="9.5" cy="12" r="1.5" fill="white"/>
                        <circle cx="14.5" cy="12" r="1.5" fill="white"/>
                      </svg>
                    </div>
                  )}
                  <div className="cg-ai-bubble">
                    <div className="cg-ai-bubble-content">
                      {msg.sender_type === 'ai'
                        ? renderMarkdown(msg.content)
                        : <p className="cg-ai-p">{msg.content}</p>
                      }
                    </div>

                    {/* Rich metadata for AI messages — only render the wrapper when there is something to show */}
                    {msg.sender_type === 'ai' && (
                      typeof msg.confidence === 'number' ||
                      (msg.sources && msg.sources.length > 0) ||
                      (msg.follow_up_questions && msg.follow_up_questions.length > 0) ||
                      (msg.download_suggestions && msg.download_suggestions.should_download)
                    ) && (
                      <div className="cg-ai-bubble-meta">
                        {typeof msg.confidence === 'number' && (
                          <ConfidenceBar value={msg.confidence} />
                        )}
                        {msg.sources && msg.sources.length > 0 && (
                          <SourceChips sources={msg.sources} />
                        )}
                        {msg.follow_up_questions && msg.follow_up_questions.length > 0 && (
                          <FollowUpSuggestions
                            questions={msg.follow_up_questions}
                            onSelect={(q) => sendMessage(q)}
                          />
                        )}
                        {msg.download_suggestions && msg.download_suggestions.should_download && (
                          <DownloadSuggestions
                            suggestions={msg.download_suggestions}
                            content={msg.content}
                            onDownload={handleDownload}
                          />
                        )}
                      </div>
                    )}

                    <span className="cg-ai-bubble-time">{formatRelative(msg.created_at)}</span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="cg-ai-bubble-wrapper cg-bot">
                  <div className="cg-ai-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="6" y="8" width="12" height="10" rx="2.5" fill="#818cf8"/>
                      <circle cx="9.5" cy="12" r="1.5" fill="white"/>
                      <circle cx="14.5" cy="12" r="1.5" fill="white"/>
                    </svg>
                  </div>
                  <div className="cg-ai-bubble cg-ai-typing-bubble">
                    <div className="cg-ai-dots">
                      <span/><span/><span/>
                    </div>
                    <span className="cg-ai-thinking">Thinking…</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef}/>
            </div>

            {/* Input area */}
            <div className="cg-ai-input-area">
              <div className="cg-ai-input-wrapper">
                {/* Voice input button */}
                {voiceRecognition.isSupported && (
                  <button
                    className={`cg-ai-voice-btn ${voiceRecognition.isListening ? 'cg-ai-voice-active' : ''}`}
                    onClick={handleVoiceInput}
                    disabled={isLoading}
                    title={voiceRecognition.isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {voiceRecognition.isListening ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                        <line x1="12" y1="19" x2="12" y2="23"/>
                        <line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    )}
                  </button>
                )}

                <textarea
                  ref={inputRef}
                  className="cg-ai-textarea"
                  value={voiceRecognition.isListening ? voiceRecognition.transcript : inputMessage}
                  onChange={autoResize}
                  onKeyDown={handleKey}
                  placeholder={
                    voiceRecognition.isListening 
                      ? 'Listening...' 
                      : 'Ask me anything… (Enter to send, Shift+Enter for new line)'
                  }
                  rows={1}
                  disabled={isLoading || voiceRecognition.isListening}
                />

                {/* Voice mode toggle button */}
                {textToSpeech.isSupported && (
                  <button
                    className={`cg-ai-tts-btn ${voiceMode ? 'cg-ai-tts-active' : ''}`}
                    onClick={toggleVoiceMode}
                    disabled={isLoading}
                    title={voiceMode ? 'Disable voice responses' : 'Enable voice responses'}
                  >
                    {voiceMode ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <line x1="23" y1="9" x2="17" y2="15"/>
                        <line x1="17" y1="9" x2="23" y2="15"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    )}
                  </button>
                )}

                <button
                  className="cg-ai-send"
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  title="Send message"
                >
                  {isLoading ? (
                    <div className="cg-ai-spinner-sm"/>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                </button>
              </div>
              
              {/* Voice status indicator */}
              {voiceRecognition.isListening && (
                <div className="cg-ai-voice-status">
                  <span className="cg-ai-voice-pulse"/>
                  <span className="cg-ai-voice-text">Listening... {voiceRecognition.transcript}</span>
                </div>
              )}

              {/* Voice mode indicator */}
              {voiceMode && (
                <div className="cg-ai-tts-status">
                  <span>🔊 Voice responses enabled</span>
                </div>
              )}

              <p className="cg-ai-footer-note">
                Answers grounded in university documents · Powered by Gemini 2.5 Flash
                {voiceRecognition.isSupported && ' · Voice input available'}
                {textToSpeech.isSupported && ' · Voice responses available'}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AIAssistant;
