/**
 * AIKnowledgeBase
 * ────────────────
 * Admin panel for managing the AI knowledge base:
 *  - Upload PDFs, DOCX, TXT, CSV, MD files with metadata
 *  - View all indexed documents with type/department chips
 *  - Delete documents from the vector store
 *  - Real-time vector store stats
 *  - AI engine health check
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { aiAdminService } from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface IndexedDocument {
  source_file: string;
  doc_type: string;
  department?: string;
  upload_date?: string;
  total_chunks: number;
}

interface VectorStats { total_chunks: number; unique_documents: number; }
interface HealthStatus { status: string; components: Record<string, any>; }

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

// ─── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { value: 'policy',    label: '📋 Policy',       desc: 'University rules & regulations' },
  { value: 'notice',    label: '📢 Notice',        desc: 'Announcements & circulars' },
  { value: 'handbook',  label: '📚 Handbook',      desc: 'Student/faculty handbooks' },
  { value: 'timetable', label: '📅 Timetable',     desc: 'Class & exam schedules' },
  { value: 'catalog',   label: '🗂️ Catalog',       desc: 'Course catalog' },
  { value: 'placement', label: '💼 Placement',     desc: 'Placement brochures & stats' },
  { value: 'exam',      label: '📝 Exam',          desc: 'Exam schedules & syllabi' },
  { value: 'faculty',   label: '👨‍🏫 Faculty',      desc: 'Faculty handbook & info' },
  { value: 'admission', label: '🎓 Admission',     desc: 'Admission guidelines' },
  { value: 'scholarship',label:'💰 Scholarship',  desc: 'Scholarship policies' },
  { value: 'attendance',label: '✅ Attendance',    desc: 'Attendance policy' },
  { value: 'general',   label: '📄 General',       desc: 'General institutional docs' },
];

const SEMESTERS = [1,2,3,4,5,6,7,8];
const ALLOWED_EXTENSIONS = ['.pdf','.docx','.txt','.csv','.md'];
const MAX_SIZE_MB = 50;

const DOC_TYPE_COLORS: Record<string,string> = {
  policy: 'bg-blue-100 text-blue-700 border-blue-200',
  notice: 'bg-amber-100 text-amber-700 border-amber-200',
  handbook: 'bg-purple-100 text-purple-700 border-purple-200',
  timetable: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  catalog: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  placement: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  exam: 'bg-rose-100 text-rose-700 border-rose-200',
  faculty: 'bg-violet-100 text-violet-700 border-violet-200',
  admission: 'bg-orange-100 text-orange-700 border-orange-200',
  scholarship: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  attendance: 'bg-teal-100 text-teal-700 border-teal-200',
  general: 'bg-slate-100 text-slate-700 border-slate-200',
};

// ─── Helper: format bytes ─────────────────────────────────────────────────────
const fmtBytes = (b: number) => {
  if (b === 0) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return (b / Math.pow(k,i)).toFixed(1) + ' ' + s[i];
};

const fmtDate = (ds?: string) => {
  if (!ds) return '—';
  return new Date(ds).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
};

// ─── Upload Form Component ────────────────────────────────────────────────────
interface UploadFormProps {
  onUploaded: () => void;
}

const UploadForm: React.FC<UploadFormProps> = ({ onUploaded }) => {
  const [file, setFile]           = useState<File|null>(null);
  const [docType, setDocType]     = useState('');
  const [department, setDept]     = useState('all');
  const [semester, setSemester]   = useState('');
  const [acadYear, setAcadYear]   = useState('');
  const [state, setState]         = useState<UploadState>('idle');
  const [message, setMessage]     = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const fileRef                   = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string|null => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) return `File type ${ext} not supported. Use: ${ALLOWED_EXTENSIONS.join(', ')}`;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File exceeds ${MAX_SIZE_MB}MB limit`;
    return null;
  };

  const pickFile = (f: File) => {
    const err = validateFile(f);
    if (err) { setMessage(err); setState('error'); return; }
    setFile(f);
    setState('idle');
    setMessage('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docType) { setMessage('Please select a file and document type.'); setState('error'); return; }
    setState('uploading');
    setMessage('');
    try {
      await aiAdminService.uploadDocument(file, docType, department, semester ? Number(semester) : undefined, acadYear || undefined);
      setState('success');
      setMessage(`"${file.name}" queued for indexing. It will be searchable within a few seconds.`);
      setFile(null); setDocType(''); setDept('all'); setSemester(''); setAcadYear('');
      if (fileRef.current) fileRef.current.value = '';
      onUploaded();
    } catch (err: any) {
      setState('error');
      const detail = err?.message || 'Upload failed. Please try again.';
      setMessage(detail);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-8 text-center ${
          dragOver ? 'border-indigo-500 bg-indigo-50' :
          file      ? 'border-emerald-400 bg-emerald-50' :
                      'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 bg-slate-50'
        }`}
      >
        <input ref={fileRef} type="file" className="hidden" accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={e => { if (e.target.files?.[0]) pickFile(e.target.files[0]); }} />

        {file ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </div>
            <p className="font-semibold text-sm text-emerald-700">{file.name}</p>
            <p className="text-xs text-emerald-600">{fmtBytes(file.size)} · Click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-700">Drop a file here, or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, CSV, MD · Max {MAX_SIZE_MB}MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Fields row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document Type <span className="text-red-500">*</span></label>
          <select value={docType} onChange={e => setDocType(e.target.value)} required
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">— Select type —</option>
            {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label} · {t.desc}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department</label>
          <input value={department} onChange={e => setDept(e.target.value)} placeholder="all (leave blank for all departments)"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Semester <span className="text-slate-400">(optional)</span></label>
          <select value={semester} onChange={e => setSemester(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            <option value="">All semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Academic Year <span className="text-slate-400">(optional)</span></label>
          <input value={acadYear} onChange={e => setAcadYear(e.target.value)} placeholder="e.g. 2024-25"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm border ${
          state==='error'   ? 'bg-red-50 border-red-200 text-red-700' :
          state==='success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                              'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {state==='error'   && <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>}
          {state==='success' && <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
          <span>{message}</span>
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={state==='uploading'||!file||!docType}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99]">
        {state==='uploading' ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Uploading & Indexing…</>
        ) : (
          <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>Upload to Knowledge Base</>
        )}
      </button>
    </form>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
const AIKnowledgeBase: React.FC = () => {
  const [docs, setDocs]           = useState<IndexedDocument[]>([]);
  const [stats, setStats]         = useState<VectorStats|null>(null);
  const [health, setHealth]       = useState<HealthStatus|null>(null);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDel]      = useState<string|null>(null);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tab, setTab]             = useState<'documents'|'upload'>('documents');
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, statsRes, healthRes] = await Promise.allSettled([
        aiAdminService.listDocuments() as Promise<any>,
        aiAdminService.getStats() as Promise<any>,
        aiAdminService.health() as Promise<any>,
      ]);
      if (docsRes.status === 'fulfilled') setDocs(docsRes.value?.documents || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (sourceFile: string) => {
    if (deleteConfirm !== sourceFile) { setDeleteConfirm(sourceFile); return; }
    setDel(sourceFile);
    setDeleteConfirm(null);
    try {
      await aiAdminService.deleteDocument(sourceFile);
      setDocs(p => p.filter(d => d.source_file !== sourceFile));
      if (stats) setStats(p => p ? { ...p, unique_documents: Math.max(0, p.unique_documents - 1) } : p);
    } catch (e) { console.error(e); }
    finally { setDel(null); }
  };

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.source_file.toLowerCase().includes(search.toLowerCase()) || d.doc_type.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'all' || d.doc_type === typeFilter;
    return matchSearch && matchType;
  });

  const uniqueTypes = Array.from(new Set(docs.map(d => d.doc_type)));

  const healthColor = health?.status === 'ok' ? 'text-emerald-600' : health?.status === 'degraded' ? 'text-amber-600' : 'text-slate-400';
  const healthDot   = health?.status === 'ok' ? 'bg-emerald-400' : health?.status === 'degraded' ? 'bg-amber-400' : 'bg-slate-400';

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-52 h-52 bg-white rounded-full blur-3xl"/>
          <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-white rounded-full blur-3xl"/>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white">AI Engine</span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-white/10 border-white/20`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${healthDot}`}/>
                <span className="text-xs font-semibold text-white">{health ? health.status.toUpperCase() : 'CHECKING…'}</span>
              </div>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">AI Knowledge Base</h1>
            <p className="text-indigo-200 text-sm mt-1">Upload and manage institutional documents for the AI assistant</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold rounded-xl border border-white/20 transition-all backdrop-blur">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Documents', value: stats?.unique_documents ?? '—', icon:'📄', color:'bg-indigo-50 border-indigo-200 text-indigo-700' },
          { label:'Vector Chunks', value: stats?.total_chunks?.toLocaleString() ?? '—', icon:'🧩', color:'bg-violet-50 border-violet-200 text-violet-700' },
          { label:'Document Types', value: uniqueTypes.length || '—', icon:'🗂️', color:'bg-blue-50 border-blue-200 text-blue-700' },
          { label:'Engine Status', value: health?.status || '—', icon:'⚡', color: health?.status==='ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color} shadow-sm`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs font-medium mt-0.5 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Engine health detail ─────────────────────────────────────────────── */}
      {health && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Engine Component Health</h3>
            <span className={`text-xs font-bold uppercase ${healthColor}`}>{health.status}</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(health.components).map(([name, info]: [string, any]) => (
              <div key={name} className={`flex items-center gap-3 p-3 rounded-lg border ${info.status==='ok'||info.status==='configured' ? 'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'}`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${info.status==='ok'||info.status==='configured'?'bg-emerald-400':'bg-red-400'}`}/>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-700 truncate">{name.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</p>
                  <p className="text-xs text-slate-500 truncate">{info.status}{info.chunks!=null?` · ${info.chunks} chunks`:''}{info.model!=null?` · dim ${info.model}`:''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {(['documents','upload'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-6 py-3.5 text-sm font-semibold transition-all border-b-2 ${tab===t ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
              {t === 'documents' ? `📂 Documents (${docs.length})` : '⬆️ Upload New Document'}
            </button>
          ))}
        </div>

        {/* ── Upload tab ────────────────────────────────────────────────────── */}
        {tab === 'upload' && (
          <div className="p-6">
            <div className="max-w-2xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-800">Upload to Knowledge Base</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Documents are automatically extracted, chunked, embedded, and stored in ChromaDB.
                  Students can then ask questions about the content in real time.
                </p>
              </div>

              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <div className="text-sm text-amber-700">
                  <strong>Processing time:</strong> PDFs may take 30–60 seconds per document.
                  Upload returns immediately — indexing happens in the background.
                  Refresh the Documents tab after a minute to verify.
                </div>
              </div>

              <UploadForm onUploaded={() => { setTimeout(load, 2000); setTab('documents'); }} />

              <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Supported Document Types</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DOC_TYPES.map(t => (
                    <div key={t.value} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200">
                      <span className="text-sm">{t.label.split(' ')[0]}</span>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 leading-tight">{t.label.split(' ').slice(1).join(' ')}</p>
                        <p className="text-xs text-slate-400 leading-tight">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Documents tab ──────────────────────────────────────────────────── */}
        {tab === 'documents' && (
          <div>
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[160px]">
                <option value="all">All Types</option>
                {uniqueTypes.map(t => <option key={t} value={t}>{DOC_TYPES.find(d=>d.value===t)?.label||t}</option>)}
              </select>
              <button onClick={() => setTab('upload')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                Add Document
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-slate-500 text-sm">
                <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"/>
                Loading knowledge base…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-700">{docs.length === 0 ? 'No documents yet' : 'No results found'}</p>
                  <p className="text-xs text-slate-500 mt-1">{docs.length === 0 ? 'Upload your first document to get started' : 'Try a different search or filter'}</p>
                </div>
                {docs.length === 0 && (
                  <button onClick={() => setTab('upload')} className="mt-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">Upload First Document</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Document</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Department</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden md:table-cell">Chunks</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider hidden lg:table-cell">Uploaded</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(doc => (
                      <tr key={doc.source_file} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm">{doc.source_file.endsWith('.pdf')?'📄':doc.source_file.endsWith('.docx')?'📝':doc.source_file.endsWith('.csv')?'📊':'📃'}</span>
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-medium text-slate-800 truncate max-w-[200px]" title={doc.source_file}>{doc.source_file}</p>
                              <p className="text-xs text-slate-400">{doc.source_file.split('.').pop()?.toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${DOC_TYPE_COLORS[doc.doc_type]||DOC_TYPE_COLORS.general}`}>
                            {DOC_TYPES.find(t=>t.value===doc.doc_type)?.label||doc.doc_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{doc.department||'all'}</span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{doc.total_chunks}</span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-xs text-slate-500">{fmtDate(doc.upload_date)}</td>
                        <td className="px-5 py-4 text-right">
                          {deleteConfirm === doc.source_file ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-slate-500">Confirm?</span>
                              <button onClick={() => handleDelete(doc.source_file)} disabled={deletingId===doc.source_file}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50">
                                {deletingId===doc.source_file?'…':'Delete'}
                              </button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => handleDelete(doc.source_file)} disabled={deletingId===doc.source_file}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 ml-auto">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
                  Showing {filtered.length} of {docs.length} documents
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIKnowledgeBase;
