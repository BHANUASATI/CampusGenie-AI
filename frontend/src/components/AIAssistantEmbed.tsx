/**
 * AIAssistantEmbed
 * ─────────────────
 * Inline AI chat panel rendered inside the Student Dashboard as a full view.
 * No overlay/modal — lives in the main content area.
 * Shares full feature parity with AIAssistant.tsx (markdown, confidence, sources, follow-ups).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAssistantService } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Source { filename: string; doc_type: string; relevance: number; excerpt?: string; }
interface Message {
  id: number; content: string; sender_type: 'user' | 'ai'; created_at: string;
  confidence?: number; sources?: Source[]; follow_up_questions?: string[]; intent_detected?: string;
}
interface Conversation { id: number; title: string; created_at: string; updated_at: string; }
interface Props { isDark: boolean; studentProfile?: any; }

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text: string, dark: boolean): React.ReactNode[] {
  const textColor = dark ? 'text-slate-200' : 'text-slate-800';
  const mutedColor = dark ? 'text-slate-400' : 'text-slate-600';
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = []; let listType: 'ul'|'ol'|null = null;
  const flushList = (k: string) => {
    if (!listBuf.length) return;
    const Tag = listType === 'ul' ? 'ul' : 'ol';
    nodes.push(<Tag key={k} className={`my-1.5 pl-5 space-y-0.5 text-sm ${mutedColor} ${listType==='ol'?'list-decimal':'list-disc'}`}>{listBuf.map((item,i)=><li key={i}>{inlineFmt(item,dark)}</li>)}</Tag>);
    listBuf=[]; listType=null;
  };
  lines.forEach((line,i) => {
    if (/^## /.test(line)) { flushList(`f${i}`); nodes.push(<h3 key={i} className={`font-bold text-sm mt-3 mb-1 ${textColor}`}>{inlineFmt(line.slice(3),dark)}</h3>); }
    else if (/^# /.test(line)) { flushList(`f${i}`); nodes.push(<h2 key={i} className={`font-bold text-base mt-3 mb-1 ${textColor}`}>{inlineFmt(line.slice(2),dark)}</h2>); }
    else if (/^[•\-\*] /.test(line)) { if(listType==='ol') flushList(`f${i}`); listType='ul'; listBuf.push(line.slice(2)); }
    else if (/^\d+\. /.test(line)) { if(listType==='ul') flushList(`f${i}`); listType='ol'; listBuf.push(line.replace(/^\d+\. /,'')); }
    else if (!line.trim()) { flushList(`f${i}`); nodes.push(<br key={i}/>); }
    else { flushList(`f${i}`); nodes.push(<p key={i} className={`text-sm leading-relaxed ${mutedColor}`}>{inlineFmt(line,dark)}</p>); }
  });
  flushList('final'); return nodes;
}

function inlineFmt(text: string, dark: boolean): React.ReactNode {
  const parts: React.ReactNode[] = []; const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last=0; let m: RegExpExecArray|null;
  while((m=regex.exec(text))!==null) {
    if(m.index>last) parts.push(text.slice(last,m.index));
    if(m[2]) parts.push(<strong key={m.index} className={dark?'text-slate-100':'text-slate-900'}>{m[2]}</strong>);
    else if(m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
    else if(m[4]) parts.push(<code key={m.index} className={`px-1.5 py-0.5 rounded text-xs font-mono ${dark?'bg-indigo-900/40 text-indigo-300 border border-indigo-700/40':'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>{m[4]}</code>);
    last=m.index+m[0].length;
  }
  if(last<text.length) parts.push(text.slice(last));
  return parts.length===1?parts[0]:<>{parts}</>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRel = (ds: string) => {
  const d=new Date(ds), diff=Date.now()-d.getTime();
  if(diff<60000) return 'just now';
  if(diff<3600000) return `${Math.floor(diff/60000)}m ago`;
  if(diff<86400000) return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
};

const QUICK = [
  'What is the minimum attendance required?',
  'Show my upcoming assignment deadlines',
  'What courses am I enrolled in?',
  'What is the university fee structure?',
];

const DOC_TYPES = ['policy','notice','handbook','timetable','catalog','placement','exam','faculty','general'];

// ─── Main Component ───────────────────────────────────────────────────────────
const AIAssistantEmbed: React.FC<Props> = ({ isDark, studentProfile }) => {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<Conversation|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [view, setView] = useState<'list'|'chat'>('list');
  const [error, setError] = useState<string|null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const bg = isDark ? 'bg-slate-900/60 border-slate-700/50' : 'bg-white border-slate-200';
  const cardBg = isDark ? 'bg-slate-800/60 border-slate-700/40' : 'bg-slate-50 border-slate-200';
  const textMain = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';

  const scroll = useCallback(() => endRef.current?.scrollIntoView({behavior:'smooth'}),[]);
  useEffect(()=>{ scroll(); },[messages]);
  useEffect(()=>{ loadConvs(); },[]);
  useEffect(()=>{ if(view==='chat') setTimeout(()=>inputRef.current?.focus(),100); },[view]);

  const loadConvs = async () => {
    setLoadingConvs(true);
    try { const d = await aiAssistantService.getConversations() as Conversation[]; setConvs(d); }
    catch(e){ console.error(e); } finally { setLoadingConvs(false); }
  };

  const newConv = async () => {
    try {
      setError(null);
      const c = await aiAssistantService.createConversation() as Conversation;
      setConvs(p=>[c,...p]); setCurrentConv(c); setMessages([]); setView('chat');
    } catch(e){ setError('Failed to start chat.'); }
  };

  const openConv = async (id: number) => {
    try {
      setError(null);
      const d = await aiAssistantService.getConversation(id.toString()) as any;
      setCurrentConv(d); setMessages(d.messages||[]); setView('chat');
    } catch(e){ setError('Failed to load conversation.'); }
  };

  const deleteConv = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await aiAssistantService.deleteConversation(id.toString());
      setConvs(p=>p.filter(c=>c.id!==id));
      if(currentConv?.id===id){ setCurrentConv(null); setMessages([]); setView('list'); }
    } catch(e){ console.error(e); }
  };

  const send = async (override?: string) => {
    const text = (override??input).trim();
    if(!text||!currentConv||loading) return;
    setInput(''); setLoading(true); setError(null);
    const tmp: Message = { id:Date.now(), content:text, sender_type:'user', created_at:new Date().toISOString() };
    setMessages(p=>[...p,tmp]);
    try {
      const r = await aiAssistantService.sendMessage(currentConv.id.toString(), text) as any;
      setMessages(p=>[...p.filter(m=>m.id!==tmp.id), r.user_message, r.ai_message]);
    } catch(e:any) {
      setMessages(p=>p.filter(m=>m.id!==tmp.id));
      setError('Failed to send. Please try again.');
    } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height='auto';
    e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in h-full flex flex-col gap-4">
      {/* Page header */}
      <div className={`relative overflow-hidden rounded-2xl p-5 lg:p-6 ${isDark?'bg-gradient-to-br from-indigo-950 via-violet-950/60 to-slate-900 border border-indigo-700/30':'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600'}`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white rounded-full blur-3xl"/>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white rounded-full blur-3xl"/>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white">Agentic AI</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">● Live</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">CampusGenie AI Assistant</h2>
            <p className="text-indigo-200 text-sm">Gemini 2.5 Flash · RAG · ChromaDB · Intent Classification</p>
          </div>
          {view==='list'
            ? <button onClick={newConv} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl border border-white/20 transition-all text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                New Conversation
              </button>
            : <button onClick={()=>setView('list')} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white rounded-xl border border-white/20 transition-all text-sm font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                All Conversations
              </button>
          }
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          {error}
          <button onClick={()=>setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {/* ── Conversation list ──────────────────────────────────────────────── */}
      {view==='list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          {/* Capabilities panel */}
          <div className={`rounded-2xl border p-5 ${isDark?'bg-slate-800/60 border-slate-700/50':'bg-white border-slate-200'} shadow-sm`}>
            <h3 className={`font-bold text-sm mb-3 ${textMain}`}>What I can help with</h3>
            <div className="space-y-2">
              {[
                {icon:'📚',label:'Course Info',desc:'Credits, prerequisites, curriculum'},
                {icon:'📊',label:'Attendance Rules',desc:'Minimum %, eligibility, condonation'},
                {icon:'📋',label:'University Policies',desc:'Rules, fee structure, scholarships'},
                {icon:'📢',label:'Notices & Events',desc:'Announcements, circulars, events'},
                {icon:'👨‍🏫',label:'Faculty Info',desc:'Office hours, contact, specialization'},
                {icon:'💼',label:'Placements',desc:'Stats, companies, packages'},
                {icon:'📅',label:'Exam & Timetables',desc:'Schedules, seating, results'},
              ].map(cap=>(
                <div key={cap.label} className={`flex items-start gap-3 p-2.5 rounded-xl ${isDark?'hover:bg-slate-700/40':'hover:bg-slate-50'} transition-colors`}>
                  <span className="text-lg flex-shrink-0">{cap.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${textMain}`}>{cap.label}</div>
                    <div className={`text-xs ${textMuted}`}>{cap.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className={`lg:col-span-2 rounded-2xl border ${bg} shadow-sm flex flex-col overflow-hidden`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark?'border-slate-700/50':'border-slate-200'}`}>
              <div>
                <h3 className={`font-bold text-sm ${textMain}`}>Recent Conversations</h3>
                <p className={`text-xs mt-0.5 ${textMuted}`}>{convs.length} conversation{convs.length!==1?'s':''}</p>
              </div>
              <button onClick={newConv} className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
                New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {loadingConvs ? (
                <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
                  <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>Loading…
                </div>
              ) : convs.length===0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark?'bg-slate-700':'bg-slate-100'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={textMuted}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div>
                    <p className={`font-semibold text-sm ${textMain}`}>No conversations yet</p>
                    <p className={`text-xs mt-1 ${textMuted}`}>Start a new chat to get AI-powered help</p>
                  </div>
                  <button onClick={newConv} className="mt-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    Start First Chat
                  </button>
                </div>
              ) : convs.map(c=>(
                <div key={c.id} onClick={()=>openConv(c.id)} className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all mb-1 ${isDark?'hover:bg-slate-700/60':'hover:bg-slate-50'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark?'bg-indigo-900/40 border border-indigo-700/40':'bg-indigo-50 border border-indigo-200'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-medium truncate ${textMain}`}>{c.title}</p>
                    <p className={`text-xs ${textMuted}`}>{fmtRel(c.updated_at)}</p>
                  </div>
                  <button onClick={e=>deleteConv(e,c.id)} className={`opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${isDark?'hover:bg-red-900/30 text-slate-500 hover:text-red-400':'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Chat view ─────────────────────────────────────────────────────── */}
      {view==='chat' && (
        <div className={`flex-1 flex flex-col rounded-2xl border ${bg} shadow-sm overflow-hidden`} style={{minHeight:'520px'}}>
          {/* Chat header */}
          <div className={`flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0 ${isDark?'border-slate-700/50 bg-slate-800/40':'border-slate-200 bg-slate-50/50'}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="6" y="8" width="12" height="10" rx="2.5" fill="#818cf8"/><circle cx="9.5" cy="12" r="1.5" fill="white"/><circle cx="14.5" cy="12" r="1.5" fill="white"/></svg>
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${textMain}`}>{currentConv?.title||'AI Chat'}</p>
              <p className={`text-xs ${textMuted}`}>RAG · Grounded answers from university documents</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-xs font-medium text-emerald-400">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {messages.length===0&&!loading&&(
              <div className="flex flex-col items-center text-center py-8 gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark?'bg-indigo-900/30 border border-indigo-700/30':'bg-indigo-50 border border-indigo-200'}`}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="6" y="8" width="12" height="10" rx="2.5" fill="#818cf8"/><circle cx="9.5" cy="12" r="1.5" fill="white"/><circle cx="14.5" cy="12" r="1.5" fill="white"/><line x1="12" y1="8" x2="12" y2="5.5" stroke="#818cf8" strokeWidth="1.5"/><circle cx="12" cy="4.5" r="1.2" fill="#a78bfa"/></svg>
                </div>
                <div>
                  <p className={`font-semibold text-sm ${textMain}`}>Ask me anything!</p>
                  <p className={`text-xs mt-1 max-w-sm ${textMuted}`}>I'll search university documents and your academic data to give you accurate, cited answers.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                  {QUICK.map(q=>(
                    <button key={q} onClick={()=>send(q)} className={`text-left text-xs p-3 rounded-xl border transition-all ${isDark?'bg-slate-800/60 border-slate-700/40 hover:border-indigo-500/40 hover:bg-indigo-900/20 text-slate-400 hover:text-indigo-300':'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700'}`}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg=>(
              <div key={msg.id} className={`flex items-start gap-3 ${msg.sender_type==='user'?'flex-row-reverse':'flex-row'}`}>
                {msg.sender_type==='ai'&&(
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="6" y="8" width="12" height="10" rx="2.5" fill="#818cf8"/><circle cx="9.5" cy="12" r="1.5" fill="white"/><circle cx="14.5" cy="12" r="1.5" fill="white"/></svg>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 max-w-[80%]">
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.sender_type==='user'
                      ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-tr-sm'
                      : isDark?'bg-slate-700/60 border border-slate-600/40 text-slate-200 rounded-tl-sm':'bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.sender_type==='ai'?renderMarkdown(msg.content,isDark):<span>{msg.content}</span>}
                  </div>

                  {msg.sender_type==='ai'&&(
                    <div className="pl-1 space-y-2">
                      {typeof msg.confidence==='number'&&(
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${textMuted}`}>Confidence</span>
                          <div className={`h-1.5 w-24 rounded-full overflow-hidden ${isDark?'bg-slate-700':'bg-slate-200'}`}>
                            <div className="h-full rounded-full transition-all" style={{width:`${Math.round(msg.confidence*100)}%`,background:msg.confidence>=0.8?'#10b981':msg.confidence>=0.6?'#f59e0b':'#ef4444'}}/>
                          </div>
                          <span className="text-xs font-bold" style={{color:msg.confidence>=0.8?'#10b981':msg.confidence>=0.6?'#f59e0b':'#ef4444'}}>{Math.round(msg.confidence*100)}%</span>
                        </div>
                      )}
                      {msg.sources&&msg.sources.length>0&&(
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className={`text-xs font-medium ${textMuted}`}>📄</span>
                          {msg.sources.map((s,i)=>(
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-medium truncate max-w-[160px]" title={s.filename}>{s.filename}</span>
                          ))}
                        </div>
                      )}
                      {msg.follow_up_questions&&msg.follow_up_questions.length>0&&(
                        <div className="space-y-1">
                          <p className={`text-xs font-medium ${textMuted}`}>💡 Follow up</p>
                          {msg.follow_up_questions.slice(0,3).map((q,i)=>(
                            <button key={i} onClick={()=>send(q)} className={`block text-left text-xs w-full px-3 py-1.5 rounded-lg border transition-all ${isDark?'bg-slate-800/60 border-slate-700/40 hover:border-indigo-500/40 text-indigo-400':'bg-indigo-50 border-indigo-200 hover:border-indigo-400 text-indigo-600'}`}>{q}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <span className={`text-xs ${textMuted} ${msg.sender_type==='user'?'text-right':''}`}>{fmtRel(msg.created_at)}</span>
                </div>
              </div>
            ))}

            {loading&&(
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="6" y="8" width="12" height="10" rx="2.5" fill="#818cf8"/><circle cx="9.5" cy="12" r="1.5" fill="white"/><circle cx="14.5" cy="12" r="1.5" fill="white"/></svg>
                </div>
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm border flex items-center gap-3 ${isDark?'bg-slate-700/60 border-slate-600/40':'bg-slate-100 border-slate-200'}`}>
                  <div className="flex gap-1">
                    {[0,0.2,0.4].map((d,i)=><div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:`${d}s`}}/>)}
                  </div>
                  <span className={`text-xs italic ${textMuted}`}>Searching documents and generating answer…</span>
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Input */}
          <div className={`border-t px-4 py-3 flex-shrink-0 ${isDark?'border-slate-700/50 bg-slate-800/40':'border-slate-200 bg-slate-50/50'}`}>
            <div className={`flex items-end gap-3 rounded-xl border px-3 py-2.5 transition-all ${isDark?'bg-slate-800 border-slate-600 focus-within:border-indigo-500/60 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.1)]':'bg-white border-slate-300 focus-within:border-indigo-400 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)]'}`}>
              <textarea ref={inputRef} className={`flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed ${inputBg.split(' ').filter(c=>c.startsWith('text-')||c.startsWith('placeholder-')).join(' ')}`} placeholder="Ask anything about courses, attendance, policies…  (Enter to send)" value={input} onChange={autoResize} onKeyDown={handleKey} rows={1} disabled={loading}/>
              <button onClick={()=>send()} disabled={!input.trim()||loading} className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                {loading?<div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
              </button>
            </div>
            <p className={`text-center text-xs mt-2 ${textMuted}`}>Answers grounded in university knowledge base · Powered by Gemini 2.5 Flash</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantEmbed;
