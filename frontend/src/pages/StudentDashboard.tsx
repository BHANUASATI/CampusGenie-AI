import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { authService, studentService, facultyService, adminService, calendarService, documentService } from '../services/api';
import { Student } from '../types';
import AIAssistantButton from '../components/AIAssistantButton';
import AIAssistantEmbed from '../components/AIAssistantEmbed';
import {
  Bell, Search, Menu, X as CloseIcon, Settings, LogOut, User,
  Trophy, Users, BookOpen, Calendar, AlertTriangle, AlertCircle,
  CheckCircle, XCircle, Info, Briefcase, Library, DollarSign,
  MessageSquare, HelpCircle, Building, UserCheck, Home, BarChart3,
  FileText, CreditCard, Plus, Filter, Clock, Flag, Play, Code,
  Brain, Beaker, Presentation, FileText as DocumentIcon,
  Search as ResearchIcon, FolderOpen as ProjectIcon, Lock,
  Upload, Download, Eye, Trash2, File, Folder, Paperclip,
  Check, AlertTriangle as WarningIcon, CalendarDays, CalendarCheck,
  CalendarPlus, TrendingUp, ChevronDown, Sun, Moon, Shield, Key,
  Star, Zap, Award, Activity, GraduationCap, Sparkles
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

type TaskPriority = 'high' | 'medium' | 'low' | 'urgent';
type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'locked';
type TaskType = 'document' | 'code' | 'exam' | 'lab' | 'presentation' | 'research' | 'project';

interface Task {
  id: number;
  title: string;
  description: string;
  course: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  type: TaskType;
  submitted: boolean;
  prerequisites?: number[];
  unlocksCategory?: string;
}

interface CategoryProgress {
  type: string;
  unlocked: boolean;
  requiredCompleted: number;
  totalRequired: number;
}

type DocumentStatus = 'pending' | 'uploaded' | 'reviewing' | 'approved' | 'rejected';
type DocumentCategory = 'academic' | 'personal' | 'research' | 'project' | 'administrative';

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  category: DocumentCategory;
  status: DocumentStatus;
  uploadDate: Date;
  url: string;
  description: string;
  tags: string[];
}

type CalendarType = 'academic' | 'personal';
type TodoStatus = 'pending' | 'in-progress' | 'completed';

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: CalendarType;
  status: TodoStatus;
  priority: TaskPriority;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  alertDate?: string;
  alertMessage?: string;
  alertEnabled?: boolean;
  alertSent?: boolean;
}

export const StudentDashboard: React.FC = () => {
  const { state, logout } = useApp();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { currentUser } = state;
  const currentStudent = currentUser as Student;

  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [studentDocuments, setStudentDocuments] = useState<any[]>([]);
  const [studentTasks, setStudentTasks] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [documentTypesStatus, setDocumentTypesStatus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const profileData = await studentService.getProfile() as any;
        setStudentProfile(profileData);
        const documentsData = await studentService.getDocuments() as any[];
        setStudentDocuments(documentsData);
        const documentStatusData = await studentService.getDocumentsStatus() as any[];
        setDocumentTypesStatus(documentStatusData);
        const transformedDocuments = documentsData.map((doc: any) => ({
          id: doc.id.toString(),
          name: doc.file_name || doc.document_type?.name || 'Document',
          type: doc.document_type?.name || 'document',
          size: (doc.file_size_mb || 0) * 1024 * 1024,
          category: 'academic' as DocumentCategory,
          status: doc.verification_status === 'verified' ? 'approved' as DocumentStatus :
                  doc.verification_status === 'rejected' ? 'rejected' as DocumentStatus : 'pending' as DocumentStatus,
          uploadDate: new Date(doc.uploaded_at || doc.created_at || Date.now()),
          url: doc.file_path ? `/uploads/documents/${doc.student?.enrollment_number}/${doc.file_name}` : '#',
          description: `${doc.document_type?.name || 'Document'} - ${doc.verification_status || 'pending'}`,
          tags: [doc.verification_status || 'pending', doc.document_type?.name?.toLowerCase() || 'document'],
          document_type_id: doc.document_type_id,
          verification_status: doc.verification_status
        }));
        setUploadedDocuments(transformedDocuments);
        const tasksData = await studentService.getTasks() as any[];
        setStudentTasks(tasksData);
        const transformedTasks = tasksData.map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          course: `${task.task_type?.toUpperCase()}${task.department_id ? ` - Dept ${task.department_id}` : ''}`,
          dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No due date',
          priority: (task.priority || 'medium') as TaskPriority,
          status: (task.status === 'published' ? 'pending' : task.status === 'completed' ? 'completed' : 'pending') as TaskStatus,
          progress: 0,
          type: (task.task_type || 'document') as TaskType,
          submitted: false,
          prerequisites: [],
          unlocksCategory: undefined
        }));
        setTasks(transformedTasks);
        const statsData = await studentService.getDashboardStats() as any;
        setDashboardStats(statsData);
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) fetchStudentData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchCalendarData = async () => {
      try {
        const eventsData = await calendarService.getEvents() as any;
        const transformedEvents = eventsData.events.map((event: any) => ({
          id: event.id.toString(), title: event.title, description: event.description,
          date: new Date(event.start_date), type: event.event_type, status: event.status,
          priority: event.priority, riskLevel: event.risk_level, category: event.category,
          location: event.location, startDate: event.start_date, endDate: event.end_date,
          alertDate: event.alert_date, alertMessage: event.alert_message,
          alertEnabled: event.alert_enabled, alertSent: event.alert_sent
        }));
        setCalendarEvents(transformedEvents);
      } catch (error) { console.error('Error fetching calendar data:', error); }
    };
    fetchCalendarData();
  }, [currentUser]);

  const generateAlertMessages = () => {
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);
    const academicEvents = calendarEvents.filter(e => e.type === 'academic');
    const personalEvents = calendarEvents.filter(e => e.type === 'personal');
    const academicAlerts: string[] = []; const personalAlerts: string[] = [];
    const pendingAcademic = academicEvents.filter(e => e.status === 'pending' || e.status === 'in-progress');
    const urgentAcademic = pendingAcademic.filter(e => e.startDate && new Date(e.startDate) <= tomorrow);
    const highPriorityAcademic = pendingAcademic.filter(e => e.priority === 'high' || e.priority === 'urgent');
    const highRiskAcademic = pendingAcademic.filter(e => e.riskLevel === 'high' || e.riskLevel === 'critical');
    if (urgentAcademic.length > 0) academicAlerts.push(`🔴 URGENT: ${urgentAcademic.length} academic task(s) due today or tomorrow!`);
    if (highPriorityAcademic.length > 0) academicAlerts.push(`⚠️ PRIORITY: ${highPriorityAcademic.length} high priority academic task(s) pending`);
    if (highRiskAcademic.length > 0) academicAlerts.push(`⚡ RISK: ${highRiskAcademic.length} high risk academic task(s) require attention`);
    const upcomingAcademic = academicEvents.filter(e => e.startDate && new Date(e.startDate) > tomorrow && new Date(e.startDate) <= nextWeek);
    if (upcomingAcademic.length > 0) academicAlerts.push(`📅 UPCOMING: ${upcomingAcademic.length} academic task(s) due this week`);
    const pendingPersonal = personalEvents.filter(e => e.status === 'pending' || e.status === 'in-progress');
    const urgentPersonal = pendingPersonal.filter(e => e.startDate && new Date(e.startDate) <= tomorrow);
    const highPriorityPersonal = pendingPersonal.filter(e => e.priority === 'high' || e.priority === 'urgent');
    if (urgentPersonal.length > 0) personalAlerts.push(`🔴 URGENT: ${urgentPersonal.length} personal task(s) due today or tomorrow!`);
    if (highPriorityPersonal.length > 0) personalAlerts.push(`⚠️ PRIORITY: ${highPriorityPersonal.length} high priority personal task(s) pending`);
    const upcomingPersonal = personalEvents.filter(e => e.startDate && new Date(e.startDate) > tomorrow && new Date(e.startDate) <= nextWeek);
    if (upcomingPersonal.length > 0) personalAlerts.push(`📅 UPCOMING: ${upcomingPersonal.length} personal task(s) due this week`);
    setAlertMessages({ academic: academicAlerts, personal: personalAlerts });
    return academicAlerts.length > 0 || personalAlerts.length > 0;
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'tasks' | 'documents' | 'placements' | 'library' | 'fees' | 'messages' | 'help' | 'services' | 'attendance' | 'ai-assistant'>('tasks');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('document');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([
    { type: 'document', unlocked: true, requiredCompleted: 0, totalRequired: 9 },
    { type: 'code', unlocked: false, requiredCompleted: 0, totalRequired: 1 },
    { type: 'lab', unlocked: false, requiredCompleted: 0, totalRequired: 2 },
    { type: 'exam', unlocked: false, requiredCompleted: 0, totalRequired: 2 },
    { type: 'presentation', unlocked: false, requiredCompleted: 0, totalRequired: 1 },
    { type: 'research', unlocked: false, requiredCompleted: 0, totalRequired: 1 },
    { type: 'project', unlocked: false, requiredCompleted: 0, totalRequired: 2 }
  ]);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documentPreview, setDocumentPreview] = useState<{url: string, name: string} | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    const pollDocumentStatus = async () => {
      try {
        const [documentsData, documentStatusData] = await Promise.all([
          studentService.getDocuments() as Promise<any[]>,
          studentService.getDocumentsStatus() as Promise<any[]>
        ]);
        setDocumentTypesStatus(documentStatusData);
        const transformedDocuments = documentsData.map((doc: any) => ({
          id: doc.id.toString(), name: doc.file_name || doc.document_type?.name || 'Document',
          type: doc.document_type?.name || 'document', size: (doc.file_size_mb || 0) * 1024 * 1024,
          category: 'academic' as DocumentCategory,
          status: doc.verification_status === 'verified' ? 'approved' as DocumentStatus :
                  doc.verification_status === 'rejected' ? 'rejected' as DocumentStatus : 'pending' as DocumentStatus,
          uploadDate: new Date(doc.uploaded_at || doc.created_at || Date.now()),
          url: doc.file_path ? `/uploads/documents/${doc.student?.enrollment_number}/${doc.file_name}` : '#',
          description: `${doc.document_type?.name || 'Document'} - ${doc.verification_status || 'pending'}`,
          tags: [doc.verification_status || 'pending', doc.document_type?.name?.toLowerCase() || 'document'],
          document_type_id: doc.document_type_id, verification_status: doc.verification_status
        }));
        setUploadedDocuments(prev => {
          const hasChanges = transformedDocuments.some((newDoc: any) => {
            const oldDoc = prev.find(d => d.id === newDoc.id);
            return !oldDoc || oldDoc.status !== newDoc.status;
          });
          if (hasChanges) {
            transformedDocuments.forEach((newDoc: any) => {
              const oldDoc = prev.find(d => d.id === newDoc.id);
              if (oldDoc && oldDoc.status !== newDoc.status) {
                if (newDoc.status === 'approved') alert(`🎉 Your document "${newDoc.name}" has been approved!`);
                else if (newDoc.status === 'rejected') alert(`⚠️ Your document "${newDoc.name}" has been rejected.`);
              }
            });
          }
          return transformedDocuments;
        });
      } catch (error) { console.error('Error polling document status:', error); }
    };
    const interval = setInterval(pollDocumentStatus, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const handleDocumentTypeChange = () => {
      const documentTypeSelect = document.getElementById('documentType') as HTMLSelectElement;
      const fileUploadArea = document.querySelector('[data-file-upload-area]') as HTMLElement;
      const statusReasonSection = document.getElementById('statusReasonSection') as HTMLElement;
      if (documentTypeSelect && fileUploadArea && statusReasonSection) {
        const selectedValue = documentTypeSelect.value;
        if (selectedValue === 'not_applicable' || selectedValue === 'not_present') {
          statusReasonSection.classList.remove('hidden'); fileUploadArea.style.display = 'none';
        } else if (selectedValue) {
          statusReasonSection.classList.add('hidden'); fileUploadArea.style.display = 'block';
        } else {
          statusReasonSection.classList.add('hidden'); fileUploadArea.style.display = 'block';
        }
      }
    };
    const documentTypeSelect = document.getElementById('documentType');
    if (documentTypeSelect) documentTypeSelect.addEventListener('change', handleDocumentTypeChange);
    return () => { if (documentTypeSelect) documentTypeSelect.removeEventListener('change', handleDocumentTypeChange); };
  }, [showUploadModal]);

  const [showAcademicCalendar, setShowAcademicCalendar] = useState(false);
  const [showPersonalCalendar, setShowPersonalCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [showTodoModal, setShowTodoModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [todoTitle, setTodoTitle] = useState('');
  const [todoDescription, setTodoDescription] = useState('');
  const [todoPriority, setTodoPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [todoRiskLevel, setTodoRiskLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low');
  const [todoCategory, setTodoCategory] = useState('Personal');
  const [todoLocation, setTodoLocation] = useState('');
  const [todoAlertEnabled, setTodoAlertEnabled] = useState(false);
  const [todoAlertMessage, setTodoAlertMessage] = useState('');
  const [todoAlertDate, setTodoAlertDate] = useState('');
  const [editingTodo, setEditingTodo] = useState<CalendarEvent | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessages, setAlertMessages] = useState<{ academic: string[]; personal: string[]; }>({ academic: [], personal: [] });
  const [alertsShown, setAlertsShown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (calendarEvents.length > 0 && !alertsShown && currentUser) {
      const hasAlerts = generateAlertMessages();
      if (hasAlerts) { setShowAlertModal(true); setAlertsShown(true); }
    }
  }, [calendarEvents, alertsShown, currentUser]);

  const handleTaskAction = (taskId: number, action: 'continue' | 'postpone' | 'priority' | 'complete') => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === taskId) {
        switch (action) {
          case 'continue': return { ...task, progress: Math.min(task.progress + 10, 100) };
          case 'complete': return { ...task, status: 'completed', progress: 100, submitted: true };
          case 'postpone': const np: TaskPriority = task.priority === 'urgent' ? 'high' : task.priority === 'high' ? 'medium' : 'low'; return { ...task, priority: np };
          case 'priority': const ps: TaskPriority[] = ['high','medium','low','urgent']; return { ...task, priority: ps[(ps.indexOf(task.priority)+1)%ps.length] };
          default: return task;
        }
      }
      return task;
    }));
    setTimeout(() => checkUnlocks(), 100);
  };

  const checkUnlocks = () => {
    const updatedTasks = [...tasks];
    const updatedCategoryProgress = [...categoryProgress];
    updatedCategoryProgress.forEach((category, index) => {
      if (!category.unlocked && category.type !== 'document') {
        const unlockingTasks = updatedTasks.filter(t => t.unlocksCategory === category.type);
        if (unlockingTasks.length > 0 && unlockingTasks.every(t => t.status === 'completed')) {
          updatedCategoryProgress[index].unlocked = true;
          updatedTasks.forEach(task => {
            if (task.type === category.type && task.status === 'locked') {
              const prereqsMet = !task.prerequisites || task.prerequisites.every(pid => updatedTasks.find(t => t.id === pid)?.status === 'completed');
              if (prereqsMet) task.status = 'pending';
            }
          });
        }
      }
    });
    setCategoryProgress(updatedCategoryProgress);
    setTasks(updatedTasks);
  };

  const isCategoryUnlocked = (categoryType: string) => categoryProgress.find(cat => cat.type === categoryType)?.unlocked ?? false;
  const getCategoryProgress = (categoryType: string) => {
    const categoryTasks = tasks.filter(t => t.type === categoryType);
    return { completed: categoryTasks.filter(t => t.status === 'completed').length, total: categoryTasks.length };
  };

  const deleteDocument = (docId: string) => { setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId)); setSelectedDocument(null); };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      const documentTypeSelect = document.getElementById('documentType') as HTMLSelectElement;
      const documentType = documentTypeSelect?.value || '';
      const automaticFileName = documentType ? generateFileName(file.name, documentType) : file.name;
      setSelectedFileName(automaticFileName);
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setDocumentPreview({ url: URL.createObjectURL(file), name: automaticFileName });
        setShowPreviewModal(true);
      }
    }
  };

  const downloadDocument = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.file_path || doc.url; link.download = doc.file_name || doc.name; link.target = '_blank';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const documentTypeSelect = document.getElementById('documentType') as HTMLSelectElement;
      const documentType = documentTypeSelect?.value || '';
      const automaticFileName = documentType ? generateFileName(file.name, documentType) : file.name;
      setSelectedFileName(automaticFileName);
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        setDocumentPreview({ url: URL.createObjectURL(file), name: automaticFileName });
        setShowPreviewModal(true);
      }
    }
  };

  const previewDocument = (doc: any) => { setDocumentPreview({ url: doc.file_path || doc.url, name: doc.file_name || doc.name }); setShowPreviewModal(true); };
  const closePreviewModal = () => { setShowPreviewModal(false); setDocumentPreview(null); };
  const closeUploadModal = () => {
    setShowUploadModal(false); setSelectedFileName('');
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) { case 'approved': return 'text-emerald-400'; case 'rejected': return 'text-rose-400'; case 'reviewing': return 'text-amber-400'; case 'uploaded': return 'text-blue-400'; default: return 'text-slate-400'; }
  };
  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) { case 'approved': return <CheckCircle className="w-4 h-4" />; case 'rejected': return <WarningIcon className="w-4 h-4" />; case 'reviewing': return <Clock className="w-4 h-4" />; case 'uploaded': return <Upload className="w-4 h-4" />; default: return <File className="w-4 h-4" />; }
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getEventsForDate = (date: Date, type: CalendarType) => calendarEvents.filter(event =>
    event.type === type && event.date.getDate() === date.getDate() && event.date.getMonth() === date.getMonth() && event.date.getFullYear() === date.getFullYear()
  );
  const getEventStatusColor = (status: TodoStatus) => {
    switch (status) { case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; case 'in-progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'; default: return 'bg-amber-500/20 text-amber-400 border-amber-500/30'; }
  };
  const navigateMonth = (direction: 'prev' | 'next') => setCurrentMonth(prev => {
    const d = new Date(prev); d.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1)); return d;
  });
  const getMonthYearString = (date: Date) => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  const getCalendarStats = (type: CalendarType) => {
    const events = calendarEvents.filter(e => e.type === type);
    return { total: events.length, completed: events.filter(e => e.status === 'completed').length, pending: events.filter(e => e.status === 'pending').length, inProgress: events.filter(e => e.status === 'in-progress').length };
  };

  const getDocumentTypeName = (frontendDocId: string): string => {
    const allDocs = [
      { id: '10th_marksheet', name: '10th Marksheet' }, { id: '12th_marksheet', name: '12th Marksheet' },
      { id: 'transfer_certificate', name: 'Transfer Certificate' }, { id: 'migration_certificate', name: 'Migration Certificate' },
      { id: 'birth_certificate', name: 'Birth Certificate' }, { id: 'aadhaar_card', name: 'Aadhaar Card' },
      { id: 'passport_photos', name: 'Passport Photos' }, { id: 'domicile_certificate', name: 'Domicile Certificate' },
      { id: 'character_certificate', name: 'Character Certificate' }, { id: 'medical_fitness', name: 'Medical Fitness Certificate' },
      { id: 'anti_ragging_affidavit', name: 'Anti-Ragging Affidavit' }, { id: 'gap_certificate', name: 'Gap Certificate' },
      { id: 'income_certificate', name: 'Income Certificate' }
    ];
    return allDocs.find(d => d.id === frontendDocId)?.name || '';
  };

  const generateFileName = (originalFileName: string, documentType: string): string => {
    const enrollmentNumber = studentProfile?.enrollment_number || studentProfile?.enrollmentNumber || 'Student';
    const documentTypeName = getDocumentTypeName(documentType);
    const fileExtension = originalFileName.split('.').pop() || '';
    const cleanEnrollmentNumber = enrollmentNumber.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanDocumentType = documentTypeName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${cleanEnrollmentNumber}_${cleanDocumentType}.${fileExtension}`;
  };

  const openTodoModal = (date: Date, todo?: CalendarEvent) => {
    setSelectedDate(date);
    if (todo) {
      setEditingTodo(todo); setTodoTitle(todo.title); setTodoDescription(todo.description || '');
      setTodoPriority(todo.priority as any); setTodoRiskLevel(todo.riskLevel);
      setTodoCategory(todo.category || 'Personal'); setTodoLocation(todo.location || '');
      setTodoAlertEnabled(todo.alertEnabled || false); setTodoAlertMessage(todo.alertMessage || '');
      setTodoAlertDate(todo.alertDate ? new Date(todo.alertDate).toISOString().split('T')[0] : '');
    } else {
      setEditingTodo(null); setTodoTitle(''); setTodoDescription(''); setTodoPriority('medium');
      setTodoRiskLevel('low'); setTodoCategory('Personal'); setTodoLocation('');
      setTodoAlertEnabled(false); setTodoAlertMessage(''); setTodoAlertDate('');
    }
    setShowTodoModal(true);
  };

  const closeTodoModal = () => {
    setShowTodoModal(false); setSelectedDate(null); setEditingTodo(null);
    setTodoTitle(''); setTodoDescription(''); setTodoPriority('medium'); setTodoRiskLevel('low');
    setTodoCategory('Personal'); setTodoLocation(''); setTodoAlertEnabled(false);
    setTodoAlertMessage(''); setTodoAlertDate('');
  };

  const refreshCalendarEvents = async () => {
    const eventsData = await calendarService.getEvents() as any;
    setCalendarEvents(eventsData.events.map((event: any) => ({
      id: event.id.toString(), title: event.title, description: event.description,
      date: new Date(event.start_date), type: event.event_type, status: event.status,
      priority: event.priority, riskLevel: event.risk_level, category: event.category,
      location: event.location, startDate: event.start_date, endDate: event.end_date,
      alertDate: event.alert_date, alertMessage: event.alert_message,
      alertEnabled: event.alert_enabled, alertSent: event.alert_sent
    })));
  };

  const saveTodo = async () => {
    if (!todoTitle.trim() || !selectedDate) { alert('Please enter a title and select a date'); return; }
    try {
      const todoData = { title: todoTitle, description: todoDescription, event_type: 'personal', priority: todoPriority, risk_level: todoRiskLevel, start_date: selectedDate.toISOString(), category: todoCategory, location: todoLocation, alert_enabled: todoAlertEnabled, alert_message: todoAlertMessage, alert_date: todoAlertDate ? new Date(todoAlertDate).toISOString() : null };
      if (editingTodo) await calendarService.updateEvent(editingTodo.id, todoData);
      else await calendarService.createEvent(todoData);
      await refreshCalendarEvents(); closeTodoModal(); alert(editingTodo ? 'Todo updated!' : 'Todo created!');
    } catch (error: any) { alert(`Error: ${error.response?.data?.detail || 'Failed to save todo'}`); }
  };

  const deleteTodo = async (todoId: string) => {
    if (!confirm('Delete this todo?')) return;
    try { await calendarService.deleteEvent(todoId); await refreshCalendarEvents(); alert('Todo deleted!'); }
    catch (error: any) { alert(`Error: ${error.response?.data?.detail || 'Failed to delete todo'}`); }
  };

  const toggleTodoStatus = async (todoId: string) => {
    try { await calendarService.toggleEventStatus(todoId); await refreshCalendarEvents(); }
    catch (error: any) { alert(`Error: ${error.response?.data?.detail || 'Failed to update todo status'}`); }
  };

  const markTodoComplete = async (todoId: string) => {
    try { await calendarService.markEventComplete(todoId); await refreshCalendarEvents(); }
    catch (error: any) { alert(`Error: ${error.response?.data?.detail || 'Failed to mark todo complete'}`); }
  };

  const toggleDropdown = (categoryId: string) => setOpenDropdown(openDropdown === categoryId ? null : categoryId);
  const isCategoryActive = (category: any) => category.items.some((item: any) => activeView === item.id);
  const handleItemClick = (itemId: string) => { setActiveView(itemId as any); setOpenDropdown(null); };

  const navigationCategories = [
    { id: 'academic', label: 'Academic', icon: GraduationCap, items: [
      { id: 'tasks', label: 'Tasks', icon: Home },
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'library', label: 'Library', icon: BookOpen },
    ]},
    { id: 'career', label: 'Career', icon: Briefcase, items: [
      { id: 'placements', label: 'Placements', icon: Briefcase },
    ]},
    { id: 'services', label: 'Services', icon: Building, items: [
      { id: 'fees', label: 'Fees', icon: DollarSign },
      { id: 'attendance', label: 'Attendance', icon: UserCheck },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
      { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
      { id: 'services', label: 'Services', icon: Building },
      { id: 'help', label: 'Help', icon: HelpCircle },
    ]}
  ];

  const notifications = [
    { id: 1, title: 'Document Approved', message: 'Your Aadhar Card has been verified', type: 'success', time: '2 min ago' },
    { id: 2, title: 'New Task Assigned', message: 'Complete your profile verification', type: 'info', time: '1 hour ago' },
    { id: 3, title: 'Payment Reminder', message: 'Fee payment due in 3 days', type: 'warning', time: '3 hours ago' },
  ];

  const userMenuItems = [
    { id: 'profile', label: 'Profile', icon: User, action: () => {} },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => {} },
    { id: 'security', label: 'Security', icon: Shield, action: () => {} },
    { id: 'change-password', label: 'Change Password', icon: Key, action: () => {} },
  ];

  const isDark = theme === 'dark';

  const taskCategories = [
    { id: 'document', label: 'Documents', icon: DocumentIcon, color: 'from-blue-500 to-indigo-600' },
    { id: 'code', label: 'Code', icon: Code, color: 'from-violet-500 to-purple-600' },
    { id: 'lab', label: 'Labs', icon: Beaker, color: 'from-emerald-500 to-teal-600' },
    { id: 'exam', label: 'Exams', icon: Brain, color: 'from-rose-500 to-pink-600' },
    { id: 'presentation', label: 'Presentations', icon: Presentation, color: 'from-orange-500 to-amber-600' },
    { id: 'research', label: 'Research', icon: ResearchIcon, color: 'from-cyan-500 to-sky-600' },
    { id: 'project', label: 'Projects', icon: ProjectIcon, color: 'from-indigo-500 to-blue-600' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'tasks':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 ${isDark ? 'bg-gradient-to-br from-slate-800 via-indigo-900/40 to-slate-800 border border-indigo-700/30' : 'bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600'}`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white rounded-full blur-3xl" />
              </div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/20 text-white'}`}>Academic Hub</span>
                  </div>
                  <h2 className={`text-3xl lg:text-4xl font-bold ${isDark ? 'text-white' : 'text-white'} mb-1`}>My Tasks</h2>
                  <p className={`${isDark ? 'text-indigo-300' : 'text-indigo-100'}`}>Track assignments, projects and deadlines</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowUploadModal(true)} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                  <button onClick={() => setShowAcademicCalendar(true)} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="w-4 h-4" /> Academic
                  </button>
                  <button onClick={() => setShowPersonalCalendar(true)} className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                    <CalendarPlus className="w-4 h-4" /> Personal
                  </button>
                </div>
              </div>
            </div>

            {/* Task Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: CheckCircle, value: dashboardStats?.submitted_tasks || '0', label: 'Completed', sub: 'This semester', color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200' },
                { icon: Activity, value: dashboardStats?.pending_tasks || '0', label: 'In Progress', sub: 'Active now', color: 'from-blue-400 to-indigo-500', bg: isDark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200' },
                { icon: Clock, value: dashboardStats?.pending_tasks || '0', label: 'Pending', sub: 'To be done', color: 'from-amber-400 to-orange-500', bg: isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200' },
                { icon: BarChart3, value: dashboardStats?.total_tasks || '0', label: 'Total Tasks', sub: 'This semester', color: 'from-violet-400 to-purple-500', bg: isDark ? 'bg-violet-900/20 border-violet-700/30' : 'bg-violet-50 border-violet-200' },
              ].map((stat, i) => (
                <div key={i} className={`group rounded-2xl border p-5 ${stat.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`text-2xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{stat.value}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{stat.label}</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Document Verification Status */}
            <div className={`rounded-2xl border p-6 ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Document Verification</h3>
                  <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Track your document submission progress</p>
                </div>
                <button onClick={() => setShowUploadModal(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                  <Upload className="w-4 h-4" /> Upload New
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Required', value: '12', icon: FileText, color: 'text-indigo-500', bg: isDark ? 'bg-indigo-900/20' : 'bg-indigo-50' },
                  { label: 'Verified', value: uploadedDocuments.filter(d => d.status === 'approved' && d.type !== 'status').length, icon: CheckCircle, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50' },
                  { label: 'Pending', value: uploadedDocuments.filter(d => d.status === 'pending' && d.type !== 'status').length, icon: Clock, color: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50' },
                  { label: 'Rejected', value: uploadedDocuments.filter(d => d.status === 'rejected').length, icon: XCircle, color: 'text-rose-500', bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50' },
                ].map((item, i) => (
                  <div key={i} className={`rounded-xl p-4 ${item.bg} flex items-center gap-3`}>
                    <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0`} />
                    <div>
                      <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.value}</div>
                      <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Approved Documents', icon: CheckCircle, iconColor: 'text-emerald-500', docs: uploadedDocuments.filter(d => d.status === 'approved' && d.type !== 'status'), emptyMsg: 'No approved documents yet', statusBg: isDark ? 'bg-emerald-900/10' : 'bg-emerald-50', borderColor: isDark ? 'border-emerald-700/20' : 'border-emerald-100' },
                  { title: 'Rejected Documents', icon: XCircle, iconColor: 'text-rose-500', docs: uploadedDocuments.filter(d => d.status === 'rejected'), emptyMsg: 'No rejected documents', statusBg: isDark ? 'bg-rose-900/10' : 'bg-rose-50', borderColor: isDark ? 'border-rose-700/20' : 'border-rose-100' },
                ].map((section, si) => (
                  <div key={si} className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800 border-slate-700/40' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <section.icon className={`w-4 h-4 ${section.iconColor}`} />
                      <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>{section.title}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{section.docs.length}</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {section.docs.length > 0 ? section.docs.map((doc, di) => (
                        <div key={di} className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/50' : 'bg-white'} border ${section.borderColor}`}>
                          <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} truncate flex-1`}>{doc.name}</span>
                          {si === 1 && <button onClick={() => setShowUploadModal(true)} className="text-xs px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg ml-2 transition-colors">Re-upload</button>}
                        </div>
                      )) : <p className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{section.emptyMsg}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {taskCategories.map((category) => {
                const unlocked = isCategoryUnlocked(category.id);
                const progress = getCategoryProgress(category.id);
                const isActive = selectedCategory === category.id;
                return (
                  <button key={category.id} onClick={() => unlocked && setSelectedCategory(category.id)} disabled={!unlocked}
                    className={`group flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                      !unlocked ? `cursor-not-allowed ${isDark ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`
                      : isActive ? `bg-gradient-to-r ${category.color} text-white border-transparent shadow-lg scale-105`
                      : `${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'} hover:scale-105`
                    }`}>
                    <div className="relative">
                      <category.icon className="w-4 h-4" />
                      {!unlocked && <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-slate-400" />}
                    </div>
                    <span>{category.label}</span>
                    {unlocked && progress.total > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>{progress.completed}/{progress.total}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Task List */}
            <div className="space-y-3">
              {tasks.filter(task => task.type === selectedCategory).length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <DocumentIcon className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                  <h4 className={`font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-700'}`}>No tasks found</h4>
                  <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>No tasks in this category yet</p>
                </div>
              ) : tasks.filter(task => task.type === selectedCategory).map((task, index) => (
                <div key={task.id} className={`group rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-[1.01] ${
                  task.status === 'locked' ? isDark ? 'bg-slate-800/40 border-slate-700/30' : 'bg-slate-50 border-slate-200'
                  : isDark ? 'bg-slate-800/60 border-slate-700/50 hover:border-indigo-500/30' : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}>
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                            task.type === 'document' ? isDark ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-blue-600' :
                            task.type === 'code' ? isDark ? 'bg-violet-900/40 text-violet-400' : 'bg-violet-100 text-violet-600' :
                            task.type === 'exam' ? isDark ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-600' :
                            task.type === 'lab' ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-600' :
                            isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-600'
                          } ${task.status === 'locked' ? 'opacity-40' : ''}`}>
                            {task.type === 'document' ? <DocumentIcon className="w-5 h-5" /> : task.type === 'code' ? <Code className="w-5 h-5" /> : task.type === 'exam' ? <Brain className="w-5 h-5" /> : task.type === 'lab' ? <Beaker className="w-5 h-5" /> : task.type === 'presentation' ? <Presentation className="w-5 h-5" /> : task.type === 'research' ? <ResearchIcon className="w-5 h-5" /> : <ProjectIcon className="w-5 h-5" />}
                          </div>
                          <div className={task.status === 'locked' ? 'opacity-40' : ''}>
                            <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'} leading-snug`}>{task.title}</h4>
                            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{task.description}</p>
                          </div>
                        </div>
                        <div className={`flex flex-wrap gap-3 text-xs mb-3 ${task.status === 'locked' ? 'opacity-40' : ''}`}>
                          <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><BookOpen className="w-3.5 h-3.5" />{task.course}</span>
                          <span className={`flex items-center gap-1 ${task.priority === 'high' || task.priority === 'urgent' ? 'text-rose-500' : task.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'}`}><Flag className="w-3.5 h-3.5" />{task.priority}</span>
                          <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><Clock className="w-3.5 h-3.5" />{task.dueDate}</span>
                        </div>
                        <div className={task.status === 'locked' ? 'opacity-40' : ''}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{task.status === 'locked' ? 'Locked' : 'Progress'}</span>
                            <span className={`font-medium ${task.progress === 100 ? 'text-emerald-500' : task.progress >= 50 ? 'text-blue-500' : 'text-amber-500'}`}>{task.status === 'locked' ? '🔒' : `${task.progress}%`}</span>
                          </div>
                          <div className={`w-full h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                            <div className={`h-full rounded-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-500' : task.progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: task.status === 'locked' ? '0%' : `${task.progress}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                        {task.status === 'locked' ? (
                          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400'}`}><Lock className="w-4 h-4" /> Locked</div>
                        ) : task.status === 'completed' ? (
                          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm ${isDark ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}><CheckCircle className="w-4 h-4" /> Completed</div>
                        ) : (
                          <>
                            <button onClick={() => handleTaskAction(task.id, 'continue')} className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all text-sm flex items-center gap-1.5"><Play className="w-3.5 h-3.5" /> Continue</button>
                            <button onClick={() => handleTaskAction(task.id, 'postpone')} className={`px-3 py-2 rounded-xl text-sm transition-all hover:scale-105 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Clock className="w-3.5 h-3.5 inline mr-1" />Postpone</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Academic Calendar Modal */}
            {showAcademicCalendar && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto`}>
                  <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                    <div><h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Academic Calendar</h3><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>View scheduled academic events</p></div>
                    <button onClick={() => setShowAcademicCalendar(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'} transition-colors`}><CloseIcon className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      {[{label:'Total',value:getCalendarStats('academic').total,color:'text-indigo-500'},{label:'Completed',value:getCalendarStats('academic').completed,color:'text-emerald-500'},{label:'In Progress',value:getCalendarStats('academic').inProgress,color:'text-blue-500'},{label:'Pending',value:getCalendarStats('academic').pending,color:'text-amber-500'}].map((s,i) => (
                        <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{s.label}</div></div>
                      ))}
                    </div>
                    <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-xl p-4`}>
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => navigateMonth('prev')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}><CalendarDays className="w-4 h-4" /></button>
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{getMonthYearString(currentMonth)}</h4>
                        <button onClick={() => navigateMonth('next')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}><CalendarDays className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className={`text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'} py-1`}>{d}</div>)}
                        {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                          const day = i + 1; const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                          const evts = getEventsForDate(d, 'academic'); const isToday = new Date().toDateString() === d.toDateString();
                          return (
                            <div key={day} className={`p-1.5 rounded-lg min-h-[60px] border text-xs ${isToday ? isDark ? 'border-indigo-500 bg-indigo-900/20' : 'border-indigo-400 bg-indigo-50' : isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-white'}`}>
                              <div className={`font-medium mb-1 ${isToday ? 'text-indigo-500' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>{day}</div>
                              {evts.slice(0,2).map(ev => <div key={ev.id} className={`truncate px-1 py-0.5 rounded mb-0.5 ${getEventStatusColor(ev.status)}`} title={ev.title}>{ev.title}</div>)}
                              {evts.length > 2 && <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>+{evts.length-2}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal Calendar Modal */}
            {showPersonalCalendar && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto`}>
                  <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                    <div><h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Personal Calendar</h3><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Manage personal todos and events</p></div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openTodoModal(new Date())} className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl hover:shadow-lg transition-all text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Todo</button>
                      <button onClick={() => setShowPersonalCalendar(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'} transition-colors`}><CloseIcon className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      {[{label:'Total',value:getCalendarStats('personal').total,color:'text-indigo-500'},{label:'Completed',value:getCalendarStats('personal').completed,color:'text-emerald-500'},{label:'In Progress',value:getCalendarStats('personal').inProgress,color:'text-blue-500'},{label:'Pending',value:getCalendarStats('personal').pending,color:'text-amber-500'}].map((s,i) => (
                        <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'} text-center`}><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{s.label}</div></div>
                      ))}
                    </div>
                    <div className={`${isDark ? 'bg-slate-800' : 'bg-slate-50'} rounded-xl p-4`}>
                      <div className="flex justify-between items-center mb-4">
                        <button onClick={() => navigateMonth('prev')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}><CalendarPlus className="w-4 h-4" /></button>
                        <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{getMonthYearString(currentMonth)}</h4>
                        <button onClick={() => navigateMonth('next')} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'} transition-colors`}><CalendarPlus className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className={`text-center text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'} py-1`}>{d}</div>)}
                        {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                          const day = i + 1; const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                          const evts = getEventsForDate(d, 'personal'); const isToday = new Date().toDateString() === d.toDateString();
                          return (
                            <div key={day} onClick={() => openTodoModal(d)} className={`p-1.5 rounded-lg min-h-[60px] border text-xs cursor-pointer transition-colors ${isToday ? isDark ? 'border-violet-500 bg-violet-900/20' : 'border-violet-400 bg-violet-50' : isDark ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                              <div className={`font-medium mb-1 ${isToday ? 'text-violet-500' : isDark ? 'text-slate-300' : 'text-slate-700'}`}>{day}</div>
                              {evts.slice(0,2).map(ev => <div key={ev.id} onClick={e => { e.stopPropagation(); openTodoModal(d, ev); }} className={`truncate px-1 py-0.5 rounded mb-0.5 cursor-pointer ${getEventStatusColor(ev.status)}`} title={ev.title}>{ev.title}</div>)}
                              {evts.length > 2 && <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>+{evts.length-2}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Todo Modal */}
            {showTodoModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
                  <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                    <div><h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{editingTodo ? 'Edit Todo' : 'Add New Todo'}</h3><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{selectedDate ? selectedDate.toLocaleDateString() : ''}</p></div>
                    <button onClick={closeTodoModal} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'} transition-colors`}><CloseIcon className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Title *</label><input type="text" value={todoTitle} onChange={e => setTodoTitle(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Enter todo title" /></div>
                    <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description</label><textarea value={todoDescription} onChange={e => setTodoDescription(e.target.value)} rows={3} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Description (optional)" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Priority</label><select value={todoPriority} onChange={e => setTodoPriority(e.target.value as any)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                      <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Risk Level</label><select value={todoRiskLevel} onChange={e => setTodoRiskLevel(e.target.value as any)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category</label><input type="text" value={todoCategory} onChange={e => setTodoCategory(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Personal, Work…" /></div>
                      <div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Location</label><input type="text" value={todoLocation} onChange={e => setTodoLocation(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Where? (optional)" /></div>
                    </div>
                    <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                      <div className="flex items-center mb-3"><input type="checkbox" id="alertEnabled" checked={todoAlertEnabled} onChange={e => setTodoAlertEnabled(e.target.checked)} className="mr-2 accent-indigo-500" /><label htmlFor="alertEnabled" className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Enable Alert</label></div>
                      {todoAlertEnabled && (<div className="space-y-3"><div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Alert Date</label><input type="date" value={todoAlertDate} onChange={e => setTodoAlertDate(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`} /></div><div><label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Alert Message</label><input type="text" value={todoAlertMessage} onChange={e => setTodoAlertMessage(e.target.value)} className={`w-full px-3 py-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`} placeholder="Alert message (optional)" /></div></div>)}
                    </div>
                    {editingTodo && (
                      <div className={`p-4 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <p className={`text-sm font-medium mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Actions</p>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => toggleTodoStatus(editingTodo.id)} className={`px-3 py-1.5 rounded-lg text-sm ${editingTodo.status === 'pending' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'} text-white transition-colors`}>{editingTodo.status === 'pending' ? 'Start' : 'Pause'}</button>
                          <button onClick={() => markTodoComplete(editingTodo.id)} className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">Complete</button>
                          <button onClick={() => deleteTodo(editingTodo.id)} className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 hover:bg-rose-700 text-white transition-colors">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={`p-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} flex justify-end gap-3`}>
                    <button onClick={closeTodoModal} className={`px-5 py-2 rounded-xl text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} transition-colors`}>Cancel</button>
                    <button onClick={saveTodo} className="px-5 py-2 rounded-xl text-sm bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-lg hover:scale-105 transition-all">{editingTodo ? 'Update' : 'Create'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Alert Modal */}
            {showAlertModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className={`${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
                  <div className={`p-5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center"><Bell className="w-5 h-5 text-white" /></div><div><h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Pending Work Alerts</h3><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Important tasks needing attention</p></div></div>
                    <button onClick={() => setShowAlertModal(false)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'} transition-colors`}><CloseIcon className="w-5 h-5" /></button>
                  </div>
                  <div className="p-5 space-y-4">
                    {alertMessages.academic.length > 0 && (<div className={`p-4 rounded-xl ${isDark ? 'bg-violet-900/20 border-violet-700/30' : 'bg-violet-50 border-violet-200'} border`}><div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-violet-500" /><h4 className={`font-semibold text-sm ${isDark ? 'text-violet-300' : 'text-violet-800'}`}>Academic Calendar</h4></div><div className="space-y-1.5">{alertMessages.academic.map((a, i) => <div key={i} className={`p-2 rounded-lg text-sm ${isDark ? 'bg-violet-900/30 text-slate-300' : 'bg-violet-100/50 text-slate-700'}`}>{a}</div>)}</div><button onClick={() => { setShowAlertModal(false); setShowAcademicCalendar(true); }} className="mt-3 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors">View Academic Calendar</button></div>)}
                    {alertMessages.personal.length > 0 && (<div className={`p-4 rounded-xl ${isDark ? 'bg-indigo-900/20 border-indigo-700/30' : 'bg-indigo-50 border-indigo-200'} border`}><div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-indigo-500" /><h4 className={`font-semibold text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Personal Calendar</h4></div><div className="space-y-1.5">{alertMessages.personal.map((a, i) => <div key={i} className={`p-2 rounded-lg text-sm ${isDark ? 'bg-indigo-900/30 text-slate-300' : 'bg-indigo-100/50 text-slate-700'}`}>{a}</div>)}</div><button onClick={() => { setShowAlertModal(false); setShowPersonalCalendar(true); }} className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors">View Personal Calendar</button></div>)}
                  </div>
                  <div className={`p-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} flex justify-end`}><button onClick={() => setShowAlertModal(false)} className={`px-5 py-2 rounded-xl text-sm ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} transition-colors`}>Dismiss</button></div>
                </div>
              </div>
            )}
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 ${isDark ? 'bg-gradient-to-br from-slate-800 via-emerald-900/30 to-slate-800 border border-emerald-700/30' : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600'}`}>
              <div className="absolute inset-0 opacity-10"><div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl" /><div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white rounded-full blur-3xl" /></div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2"><span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'}`}>Document Hub</span></div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1">My Documents</h2>
                  <p className={`${isDark ? 'text-emerald-300' : 'text-emerald-100'}`}>Upload and track your academic document submissions</p>
                </div>
                <button onClick={() => setShowUploadModal(true)} className="self-start lg:self-auto px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all duration-200 flex items-center gap-2 text-sm font-medium">
                  <Upload className="w-4 h-4" /> Upload Document
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { label: 'Total Required', value: 9, icon: FileText, color: 'from-indigo-400 to-blue-500', bg: isDark ? 'bg-indigo-900/20 border-indigo-700/30' : 'bg-indigo-50 border-indigo-200' },
                { label: 'Verified', value: documentTypesStatus.filter(d => d.verification_status === 'verified').length, icon: CheckCircle, color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200' },
                { label: 'Pending / Rejected', value: documentTypesStatus.filter(d => d.upload_status === 'not_uploaded' || d.verification_status === 'pending' || d.verification_status === 'rejected').length, icon: Clock, color: 'from-amber-400 to-orange-500', bg: isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200' },
              ].map((stat, i) => (
                <div key={i} className={`group rounded-2xl border p-5 ${stat.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}><stat.icon className="w-5 h-5 text-white" /></div>
                  <div className={`text-3xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{stat.value}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Documents Checklist */}
            <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
              <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Required Documents Checklist</h3>
                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Submit all required documents for enrollment verification</p>
              </div>
              <div className="divide-y divide-slate-700/20">
                {documentTypesStatus.length === 0 ? (
                  <div className="py-12 text-center"><FileText className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} /><p className={isDark ? 'text-slate-500' : 'text-slate-500'}>No document types found</p></div>
                ) : documentTypesStatus.map((doc, index) => {
                  const status = doc.upload_status === 'not_uploaded' ? 'missing' : doc.verification_status === 'verified' ? 'approved' : doc.verification_status === 'rejected' ? 'rejected' : 'pending';
                  const statusConfig = {
                    approved: { label: 'Approved', icon: CheckCircle, textColor: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', border: isDark ? 'border-emerald-700/30' : 'border-emerald-200', pill: isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700' },
                    rejected: { label: 'Rejected', icon: XCircle, textColor: 'text-rose-500', bg: isDark ? 'bg-rose-900/20' : 'bg-rose-50', border: isDark ? 'border-rose-700/30' : 'border-rose-200', pill: isDark ? 'bg-rose-900/40 text-rose-400' : 'bg-rose-100 text-rose-700' },
                    pending: { label: 'Under Review', icon: Clock, textColor: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50', border: isDark ? 'border-amber-700/30' : 'border-amber-200', pill: isDark ? 'bg-amber-900/40 text-amber-400' : 'bg-amber-100 text-amber-700' },
                    missing: { label: 'Missing', icon: File, textColor: isDark ? 'text-slate-500' : 'text-slate-400', bg: isDark ? 'bg-slate-800' : 'bg-slate-50', border: isDark ? 'border-slate-700/30' : 'border-slate-200', pill: isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600' },
                  }[status];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div key={doc.document_type_id} className={`flex items-center justify-between px-6 py-4 transition-colors ${isDark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${statusConfig.bg} border ${statusConfig.border}`}><StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} /></div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{doc.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.is_required ? isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-600' : isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>{doc.is_required ? 'Required' : 'Optional'}</span>
                          </div>
                          <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{doc.description || 'Academic document'}{doc.uploaded_at && ` · Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}`}</div>
                          {doc.rejection_reason && <p className="text-xs text-rose-500 mt-1">Reason: {doc.rejection_reason}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${statusConfig.pill}`}><StatusIcon className="w-3 h-3" />{statusConfig.label}</span>
                        {doc.file_path && (<>
                          <button onClick={() => previewDocument({ url: doc.file_path, name: doc.file_name || doc.name })} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} transition-colors`} title="Preview"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => downloadDocument({ url: doc.file_path, name: doc.file_name || doc.name })} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} transition-colors`} title="Download"><Download className="w-4 h-4" /></button>
                        </>)}
                        {doc.upload_status === 'not_uploaded' && (
                          <button onClick={() => { setTimeout(() => { const s = document.getElementById('documentType') as HTMLSelectElement; if (s) { s.value = doc.document_type_id.toString(); s.dispatchEvent(new Event('change', { bubbles: true })); } }, 100); setShowUploadModal(true); }} className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg text-xs font-medium hover:shadow-md hover:scale-105 transition-all">Upload</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'placements':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 ${isDark ? 'bg-gradient-to-br from-slate-800 via-blue-900/30 to-slate-800 border border-blue-700/30' : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600'}`}>
              <div className="absolute inset-0 opacity-10"><div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl" /><div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white rounded-full blur-3xl" /></div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-white/20 text-white'}`}>Career Hub</span>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1">Placements</h2>
                  <p className={`${isDark ? 'text-blue-300' : 'text-blue-100'}`}>Discover opportunities and launch your career</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><Search className="w-4 h-4" />Search Jobs</button>
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><FileText className="w-4 h-4" />Applications</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Briefcase, value: '127', label: 'Active Jobs', sub: '+12 this week', color: 'from-blue-400 to-indigo-500', bg: isDark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200' },
                { icon: Trophy, value: '₹12.5L', label: 'Highest Package', sub: 'Google', color: 'from-amber-400 to-yellow-500', bg: isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200' },
                { icon: Users, value: '847', label: 'Placed Students', sub: 'This year', color: 'from-violet-400 to-purple-500', bg: isDark ? 'bg-violet-900/20 border-violet-700/30' : 'bg-violet-50 border-violet-200' },
                { icon: BarChart3, value: '92%', label: 'Placement Rate', sub: 'Above avg', color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200' },
              ].map((s, i) => (
                <div key={i} className={`group rounded-2xl border p-5 ${s.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div className={`text-2xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.value}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.label}</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Featured Opportunities</h3>
                <button className={`text-sm px-3 py-1.5 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition-colors`}>View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { company: 'Google', title: 'Senior Software Engineer', location: 'Bangalore', salary: '₹25-35 LPA', type: 'Full-time', deadline: '5 days', tags: ['React','TypeScript','Node.js'], badge: 'Urgent', badgeColor: isDark ? 'bg-rose-900/30 text-rose-400 border-rose-700/30' : 'bg-rose-50 text-rose-600 border-rose-200', accent: 'from-blue-500 to-indigo-600' },
                  { company: 'Microsoft', title: 'Product Manager', location: 'Hyderabad', salary: '₹18-25 LPA', type: 'Full-time', deadline: '12 days', tags: ['Product','Analytics','Leadership'], badge: 'Popular', badgeColor: isDark ? 'bg-violet-900/30 text-violet-400 border-violet-700/30' : 'bg-violet-50 text-violet-600 border-violet-200', accent: 'from-emerald-500 to-teal-600' },
                  { company: 'Amazon', title: 'Data Scientist', location: 'Pune', salary: '₹15-20 LPA', type: 'Full-time', deadline: '8 days', tags: ['Python','ML','AWS'], badge: 'Hot', badgeColor: isDark ? 'bg-orange-900/30 text-orange-400 border-orange-700/30' : 'bg-orange-50 text-orange-600 border-orange-200', accent: 'from-violet-500 to-purple-600' },
                ].map((job, i) => (
                  <div key={i} className={`group rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isDark ? 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${job.accent} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}><Briefcase className="w-6 h-6 text-white" /></div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${job.badgeColor}`}>{job.badge}</span>
                      </div>
                      <h4 className={`font-bold mb-1 group-hover:text-blue-500 transition-colors ${isDark ? 'text-white' : 'text-slate-800'}`}>{job.title}</h4>
                      <p className={`text-sm mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{job.company} · {job.location}</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {job.tags.map((t, ti) => <span key={ti} className={`text-xs px-2 py-0.5 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t}</span>)}
                      </div>
                      <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-100'} mb-4`}>
                        <div><div className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{job.salary}</div><div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{job.type}</div></div>
                        <div className="text-right"><div className={`text-xs font-medium ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>Deadline in {job.deadline}</div></div>
                      </div>
                      <button className={`w-full py-2.5 rounded-xl bg-gradient-to-r ${job.accent} text-white text-sm font-medium hover:shadow-lg hover:scale-[1.02] transition-all`}>Apply Now</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'library':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 ${isDark ? 'bg-gradient-to-br from-slate-800 via-violet-900/30 to-slate-800 border border-violet-700/30' : 'bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600'}`}>
              <div className="absolute inset-0 opacity-10"><div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl" /><div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white rounded-full blur-3xl" /></div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-white/20 text-white'}`}>Knowledge Hub</span>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1">Library</h2>
                  <p className={`${isDark ? 'text-violet-300' : 'text-violet-100'}`}>Access books, journals and research papers</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><Search className="w-4 h-4" />Search Catalog</button>
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><BookOpen className="w-4 h-4" />My Books</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: BookOpen, value: '45,832', label: 'Total Books', sub: '+1,200 this month', color: 'from-violet-400 to-purple-500', bg: isDark ? 'bg-violet-900/20 border-violet-700/30' : 'bg-violet-50 border-violet-200' },
                { icon: FileText, value: '12,456', label: 'Research Papers', sub: 'Open access', color: 'from-blue-400 to-indigo-500', bg: isDark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200' },
                { icon: Clock, value: '24/7', label: 'Digital Access', sub: 'Online platform', color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200' },
                { icon: Users, value: '8,234', label: 'Active Users', sub: 'This month', color: 'from-orange-400 to-amber-500', bg: isDark ? 'bg-orange-900/20 border-orange-700/30' : 'bg-orange-50 border-orange-200' },
              ].map((s, i) => (
                <div key={i} className={`group rounded-2xl border p-5 ${s.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div className={`text-2xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.value}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.label}</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm p-5`}>
              <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Quick Actions</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Search, label: 'Search Catalog', sub: 'Find resources', color: 'text-blue-500', bg: isDark ? 'bg-blue-900/20 hover:bg-blue-900/30' : 'bg-blue-50 hover:bg-blue-100' },
                  { icon: BookOpen, label: 'My Borrowed', sub: '3 books active', color: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20 hover:bg-emerald-900/30' : 'bg-emerald-50 hover:bg-emerald-100' },
                  { icon: Calendar, label: 'Reserve Room', sub: 'Study spaces', color: 'text-violet-500', bg: isDark ? 'bg-violet-900/20 hover:bg-violet-900/30' : 'bg-violet-50 hover:bg-violet-100' },
                  { icon: FileText, label: 'E-Resources', sub: 'Digital library', color: 'text-orange-500', bg: isDark ? 'bg-orange-900/20 hover:bg-orange-900/30' : 'bg-orange-50 hover:bg-orange-100' },
                ].map((a, i) => (
                  <button key={i} className={`group flex flex-col items-center p-4 rounded-xl ${a.bg} transition-all duration-200 hover:scale-105`}>
                    <a.icon className={`w-6 h-6 ${a.color} mb-2 group-hover:scale-110 transition-transform`} />
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>{a.label}</div>
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{a.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Recently Added</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Introduction to Algorithms', author: 'T. H. Cormen', avail: 'Available', availColor: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700', cover: 'from-blue-400 to-blue-600', action: 'Borrow' },
                  { title: 'Machine Learning', author: 'Andrew Ng', avail: '2 copies', availColor: isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700', cover: 'from-emerald-400 to-emerald-600', action: 'Reserve' },
                  { title: 'Clean Code', author: 'Robert C. Martin', avail: 'Available', availColor: isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700', cover: 'from-violet-400 to-violet-600', action: 'Borrow' },
                  { title: 'Design Patterns', author: 'Gang of Four', avail: 'Borrowed', availColor: isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-700', cover: 'from-orange-400 to-orange-600', action: 'Waitlist' },
                ].map((b, i) => (
                  <div key={i} className={`group rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'}`}>
                    <div className={`w-full h-28 bg-gradient-to-br ${b.cover} flex items-center justify-center`}><BookOpen className="w-10 h-10 text-white/80" /></div>
                    <div className="p-3">
                      <h4 className={`font-semibold text-sm mb-0.5 leading-snug ${isDark ? 'text-white' : 'text-slate-800'}`}>{b.title}</h4>
                      <p className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{b.author}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${b.availColor}`}>{b.avail}</span>
                        <button className={`text-xs font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>{b.action}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'fees':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 ${isDark ? 'bg-gradient-to-br from-slate-800 via-emerald-900/30 to-slate-800 border border-emerald-700/30' : 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600'}`}>
              <div className="absolute inset-0 opacity-10"><div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl" /><div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white rounded-full blur-3xl" /></div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/20 text-white'}`}>Finance</span>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1">Fees & Payments</h2>
                  <p className={`${isDark ? 'text-emerald-300' : 'text-emerald-100'}`}>Manage payments and view transaction history</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><CreditCard className="w-4 h-4" />Pay Now</button>
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Receipt</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: DollarSign, value: '₹51,000', label: 'Current Semester', sub: 'Due in 5 days', color: 'from-rose-400 to-pink-500', bg: isDark ? 'bg-rose-900/20 border-rose-700/30' : 'bg-rose-50 border-rose-200' },
                { icon: CheckCircle, value: '₹97,000', label: 'Total Paid', sub: 'This year', color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200' },
                { icon: AlertTriangle, value: '₹51,000', label: 'Pending', sub: '1 payment', color: 'from-amber-400 to-orange-500', bg: isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200' },
                { icon: Calendar, value: 'Dec 15', label: 'Next Deadline', sub: '5 days left', color: 'from-blue-400 to-indigo-500', bg: isDark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200' },
              ].map((s, i) => (
                <div key={i} className={`group rounded-2xl border p-5 ${s.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div className={`text-2xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.value}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.label}</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
                <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'} flex items-center justify-between`}>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Current Semester Fees</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-600'}`}>Due Soon</span>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { label: 'Tuition Fee', sub: 'Main course fees', amount: '₹45,000' },
                    { label: 'Library Fee', sub: 'Digital & physical resources', amount: '₹2,000' },
                    { label: 'Laboratory Fee', sub: 'CS Lab equipment', amount: '₹3,000' },
                    { label: 'Examination Fee', sub: 'Semester exams', amount: '₹1,000' },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center justify-between py-3 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'} last:border-0`}>
                      <div><div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.label}</div><div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{item.sub}</div></div>
                      <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{item.amount}</div>
                    </div>
                  ))}
                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-1"><span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Total</span><span className="font-bold text-blue-500 text-lg">₹51,000</span></div>
                    <div className={`flex items-center justify-between mb-4 text-sm`}><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Due Date</span><span className={`font-medium ${isDark ? 'text-rose-400' : 'text-rose-500'}`}>December 15, 2024</span></div>
                    <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:shadow-lg hover:scale-[1.02] transition-all">Pay Now</button>
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
                <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Payment History</h3>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { sem: 'Semester 5 Fees', date: 'July 15, 2024', amount: '₹49,000', txn: 'TXN20240715001' },
                    { sem: 'Semester 4 Fees', date: 'January 20, 2024', amount: '₹48,000', txn: 'TXN20240120001' },
                    { sem: 'Semester 3 Fees', date: 'July 18, 2023', amount: '₹47,000', txn: 'TXN20230718001' },
                  ].map((p, i) => (
                    <div key={i} className={`p-4 rounded-xl ${isDark ? 'bg-emerald-900/10 border border-emerald-700/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div><div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{p.sem}</div><div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Paid on {p.date}</div></div>
                        <div className="text-right"><div className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{p.amount}</div><div className={`text-xs mt-0.5 ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`}>Success</div></div>
                      </div>
                      <div className="flex items-center gap-1.5"><CheckCircle className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-500' : 'text-emerald-500'}`} /><span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>TXN: {p.txn}</span></div>
                    </div>
                  ))}
                  <button className={`w-full py-2 rounded-xl border text-sm font-medium ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} transition-colors`}>View All Transactions</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'attendance':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 ${isDark ? 'bg-gradient-to-br from-slate-800 via-cyan-900/30 to-slate-800 border border-cyan-700/30' : 'bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600'}`}>
              <div className="absolute inset-0 opacity-10"><div className="absolute -top-8 -right-8 w-48 h-48 bg-white rounded-full blur-3xl" /><div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white rounded-full blur-3xl" /></div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/20 text-white'}`}>Attendance</span>
                  <h2 className="text-3xl lg:text-4xl font-bold text-white mb-1">Attendance Report</h2>
                  <p className={`${isDark ? 'text-cyan-300' : 'text-cyan-100'}`}>Monitor attendance and view detailed reports</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4" />Calendar</button>
                  <button className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl border border-white/20 transition-all text-sm font-medium flex items-center gap-2"><Download className="w-4 h-4" />Report</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: UserCheck, value: '85.7%', label: 'Overall Attendance', sub: 'Above threshold', color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-emerald-50 border-emerald-200' },
                { icon: Calendar, value: '102', label: 'Classes Attended', sub: 'This semester', color: 'from-blue-400 to-indigo-500', bg: isDark ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200' },
                { icon: AlertCircle, value: '17', label: 'Classes Missed', sub: '3 with leave', color: 'from-rose-400 to-pink-500', bg: isDark ? 'bg-rose-900/20 border-rose-700/30' : 'bg-rose-50 border-rose-200' },
                { icon: BarChart3, value: 'Good', label: 'Status', sub: 'Keep it up!', color: 'from-amber-400 to-orange-500', bg: isDark ? 'bg-amber-900/20 border-amber-700/30' : 'bg-amber-50 border-amber-200' },
              ].map((s, i) => (
                <div key={i} className={`group rounded-2xl border p-5 ${s.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} mb-3 shadow-lg group-hover:scale-110 transition-transform`}><s.icon className="w-5 h-5 text-white" /></div>
                  <div className={`text-2xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.value}</div>
                  <div className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{s.label}</div>
                  <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm p-5`}>
              <h3 className={`font-bold mb-5 ${isDark ? 'text-white' : 'text-slate-800'}`}>Monthly Attendance</h3>
              <div className="space-y-3">
                {[
                  { month: 'January', attended: 22, total: 24, pct: 91.7 },
                  { month: 'February', attended: 20, total: 22, pct: 90.9 },
                  { month: 'March', attended: 18, total: 20, pct: 90.0 },
                  { month: 'April', attended: 19, total: 21, pct: 90.5 },
                  { month: 'May', attended: 21, total: 23, pct: 91.3 },
                  { month: 'June', attended: 2, total: 2, pct: 100.0 },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-20 text-sm font-medium flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{m.month}</div>
                    <div className="flex-1">
                      <div className={`w-full h-5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-100'} overflow-hidden`}>
                        <div className={`h-full rounded-full flex items-center justify-center text-xs font-medium text-white transition-all duration-700 ${m.pct >= 90 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : m.pct >= 75 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`} style={{ width: `${m.pct}%` }}>
                          {m.pct}%
                        </div>
                      </div>
                    </div>
                    <div className={`w-16 text-right text-sm flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{m.attended}/{m.total}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
              <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}><h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Recent Attendance</h3></div>
              <div className="divide-y divide-slate-700/20">
                {[
                  { date: 'Dec 10, 2024', course: 'Data Structures', status: 'present', time: '9:00 AM' },
                  { date: 'Dec 9, 2024', course: 'Algorithm Design', status: 'present', time: '10:30 AM' },
                  { date: 'Dec 8, 2024', course: 'Database Systems', status: 'absent', time: '2:00 PM' },
                  { date: 'Dec 7, 2024', course: 'Web Development', status: 'present', time: '11:00 AM' },
                  { date: 'Dec 6, 2024', course: 'Machine Learning', status: 'late', time: '9:15 AM' },
                ].map((r, i) => (
                  <div key={i} className={`flex items-center justify-between px-5 py-3.5 transition-colors ${isDark ? 'hover:bg-slate-700/20' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.status === 'present' ? 'bg-emerald-500' : r.status === 'late' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                      <div><div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{r.course}</div><div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{r.date} · {r.time}</div></div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${r.status === 'present' ? isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700' : r.status === 'late' ? isDark ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700' : isDark ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-100 text-rose-700'}`}>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 mb-6 ${isDark ? 'bg-gradient-to-br from-slate-800 via-sky-900/30 to-slate-800 border border-sky-700/30' : 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600'}`}>
              <div className="relative z-10"><span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-white/20 text-white'}`}>Inbox</span><h2 className="text-3xl font-bold text-white mb-1">Messages</h2><p className={isDark ? 'text-sky-300' : 'text-sky-100'}>Communicate with faculty and staff</p></div>
            </div>
            <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm p-12 text-center`}>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}><MessageSquare className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} /></div>
              <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Coming Soon</h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Messaging system will be available soon</p>
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 mb-6 ${isDark ? 'bg-gradient-to-br from-slate-800 via-teal-900/30 to-slate-800 border border-teal-700/30' : 'bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600'}`}>
              <div className="relative z-10"><span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-white/20 text-white'}`}>Campus</span><h2 className="text-3xl font-bold text-white mb-1">Campus Services</h2><p className={isDark ? 'text-teal-300' : 'text-teal-100'}>All campus facilities in one place</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Building, label: 'Cafeteria', desc: 'Daily meals and snacks available', color: 'from-orange-400 to-amber-500', bg: isDark ? 'bg-orange-900/10 border-orange-700/20' : 'bg-orange-50 border-orange-100' },
                { icon: Users, label: 'Sports Complex', desc: 'Indoor and outdoor sports facilities', color: 'from-emerald-400 to-teal-500', bg: isDark ? 'bg-emerald-900/10 border-emerald-700/20' : 'bg-emerald-50 border-emerald-100' },
                { icon: HelpCircle, label: 'Health Center', desc: 'Medical facilities and emergency care', color: 'from-rose-400 to-pink-500', bg: isDark ? 'bg-rose-900/10 border-rose-700/20' : 'bg-rose-50 border-rose-100' },
              ].map((s, i) => (
                <div key={i} className={`group rounded-2xl border p-6 ${s.bg} transition-all duration-300 hover:scale-105 hover:shadow-lg`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}><s.icon className="w-6 h-6 text-white" /></div>
                  <h3 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{s.label}</h3>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'help':
        return (
          <div className="animate-fade-in">
            <div className={`relative overflow-hidden rounded-2xl p-6 lg:p-8 mb-6 ${isDark ? 'bg-gradient-to-br from-slate-800 via-indigo-900/30 to-slate-800 border border-indigo-700/30' : 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600'}`}>
              <div className="relative z-10"><span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2 inline-block ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/20 text-white'}`}>Support</span><h2 className="text-3xl font-bold text-white mb-1">Help Center</h2><p className={isDark ? 'text-indigo-300' : 'text-indigo-100'}>Get help and find answers quickly</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm p-5`}>
                <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Contact Support</h3>
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}><MessageSquare className="w-5 h-5 text-blue-500 flex-shrink-0" /><span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>support@university.edu.in</span></div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}><HelpCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /><span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>1800-123-4567</span></div>
                </div>
              </div>
              <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm p-5`}>
                <h3 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>Quick Links</h3>
                <div className="space-y-2">
                  {['User Guide', 'FAQs', 'Report Issue'].map((link, i) => (
                    <button key={i} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-50'}`}>{link}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'ai-assistant':
        return <AIAssistantEmbed isDark={isDark} studentProfile={studentProfile} />;

      default:
        return (
          <div className={`rounded-2xl border ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white border-slate-200'} shadow-sm p-12 text-center animate-fade-in`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}><Home className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} /></div>
            <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Coming Soon</h3>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>This section is under development</p>
          </div>
        );
    }
  };

  // ─── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-4 lg:px-6 border-b backdrop-blur-xl transition-all duration-300 ${isDark ? 'bg-slate-900/90 border-slate-700/60 shadow-lg shadow-slate-900/40' : 'bg-white/90 border-slate-200/80 shadow-sm'}`}>

        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
            {mobileMenuOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className={`font-bold text-lg hidden sm:block ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Campus<span className="text-indigo-500">Genie</span>
            </span>
          </div>
        </div>

        {/* Right: theme toggle, bell, user */}
        <div className="flex items-center gap-2">

          {/* Theme toggle */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
            {isDark ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <ThemeToggle />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }} className={`relative p-2.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full">
                  <span className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-75" />
                </span>
              )}
            </button>
            {showNotifications && (
              <div className={`absolute top-full right-0 mt-2 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Notifications</span>
                  <button onClick={() => setShowNotifications(false)} className={`p-1 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><CloseIcon className="w-4 h-4" /></button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`flex gap-3 px-4 py-3 border-b last:border-0 transition-colors cursor-pointer ${isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-50 hover:bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? isDark ? 'bg-emerald-900/40' : 'bg-emerald-100' : n.type === 'warning' ? isDark ? 'bg-amber-900/40' : 'bg-amber-100' : isDark ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                        {n.type === 'success' && <CheckCircle className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />}
                        {n.type === 'warning' && <AlertTriangle className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />}
                        {n.type === 'info' && <Info className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{n.title}</div>
                        <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</div>
                        <div className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <div className={`text-sm font-semibold leading-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {studentProfile?.first_name && studentProfile?.last_name ? `${studentProfile.first_name} ${studentProfile.last_name}` : studentProfile?.name || 'Student'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-xs text-emerald-500">Online</span>
                </div>
              </div>
            </button>
            {showUserMenu && (
              <div className={`absolute top-full right-0 mt-2 w-52 rounded-2xl border shadow-2xl z-50 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="p-2">
                  {userMenuItems.map(item => (
                    <button key={item.id} onClick={item.action} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}><item.icon className="w-3.5 h-3.5" /></div>
                      {item.label}
                    </button>
                  ))}
                  <div className={`my-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`} />
                  <button onClick={() => { setShowLogoutConfirm(true); setShowUserMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-900/20' : 'text-rose-600 hover:bg-rose-50'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-rose-900/30' : 'bg-rose-50'}`}><LogOut className="w-3.5 h-3.5" /></div>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────────── */}
      <nav className={`hidden lg:flex flex-col fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] z-30 border-r transition-all duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className={`text-xs font-bold uppercase tracking-widest px-3 mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Navigation</p>
          {navigationCategories.map(category => (
            <div key={category.id}>
              <button onClick={() => toggleDropdown(category.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${isCategoryActive(category) ? isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-700' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isCategoryActive(category) ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg' : isDark ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
                  <category.icon className={`w-4 h-4 ${isCategoryActive(category) ? 'text-white' : ''}`} />
                </div>
                <span className="flex-1 text-left">{category.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === category.id ? 'rotate-180' : ''} ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openDropdown === category.id ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                <div className="ml-3 pl-3 border-l space-y-0.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}">
                  {category.items.map(item => (
                    <button key={item.id} onClick={() => handleItemClick(item.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150 group ${activeView === item.id ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {activeView === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white/80" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <button onClick={() => setShowLogoutConfirm(true)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'text-rose-400 hover:bg-rose-900/20' : 'text-rose-500 hover:bg-rose-50'}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDark ? 'bg-rose-900/30' : 'bg-rose-50'}`}><LogOut className="w-3.5 h-3.5" /></div>
            Sign Out
          </button>
          <p className={`text-center text-xs mt-3 ${isDark ? 'text-slate-700' : 'text-slate-400'}`}>© 2024 CampusGenie</p>
        </div>
      </nav>

      {/* ── MOBILE SIDEBAR ──────────────────────────────────────────────────── */}
      <>
        {mobileMenuOpen && <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)} />}
        <nav className={`lg:hidden fixed left-0 top-0 h-full w-72 z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'}`}>
          <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg"><GraduationCap className="w-5 h-5 text-white" /></div>
            <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Campus<span className="text-indigo-500">Genie</span></span>
            <button onClick={() => setMobileMenuOpen(false)} className={`ml-auto p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><CloseIcon className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
            {navigationCategories.flatMap(cat => cat.items).map(item => (
              <button key={item.id} onClick={() => { setActiveView(item.id as any); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeView === item.id ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md' : isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
                {activeView === item.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
              </button>
            ))}
          </div>
          <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button onClick={() => logout()} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${isDark ? 'text-rose-400 hover:bg-rose-900/20' : 'text-rose-500 hover:bg-rose-50'} transition-colors`}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </nav>
      </>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 pt-16 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">

          {/* ── PROFILE CARD ───────────────────────────────────────────────── */}
          <div className={`relative overflow-hidden rounded-2xl mb-6 ${isDark ? 'bg-gradient-to-br from-slate-800 via-indigo-900/40 to-slate-800 border border-indigo-700/30' : 'bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-600'} shadow-xl`}>
            {/* Decorative blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-white/3 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 p-5 lg:p-7">
              <div className="flex flex-col xl:flex-row gap-6">

                {/* Avatar + status */}
                <div className="flex items-start gap-4 xl:flex-col xl:items-center xl:w-40 xl:flex-shrink-0">
                  <div className="relative">
                    <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center shadow-xl ${isDark ? 'bg-slate-700/80' : 'bg-white/20 backdrop-blur-sm border border-white/30'}`}>
                      <User className={`w-10 h-10 lg:w-12 lg:h-12 ${isDark ? 'text-indigo-400' : 'text-white'}`} />
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg border-2 border-white/30">
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <div className="xl:text-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/20 text-white border border-white/30'}`}>
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Active Student
                    </span>
                  </div>
                </div>

                {/* Name + info grid */}
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-8 w-56 bg-white/20 rounded-lg" />
                      <div className="h-4 w-40 bg-white/10 rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <h1 className={`text-2xl lg:text-3xl font-bold mb-0.5 ${isDark ? 'text-white' : 'text-white'}`}>
                        {studentProfile?.first_name && studentProfile?.last_name ? `${studentProfile.first_name} ${studentProfile.last_name}` : studentProfile?.name || currentStudent?.name || 'Student'}
                      </h1>
                      <p className={`text-sm mb-4 ${isDark ? 'text-indigo-300' : 'text-indigo-100'}`}>{studentProfile?.email || currentStudent?.email || ''}</p>
                    </>
                  )}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { icon: BookOpen, label: 'Course', value: studentProfile?.department?.name || '—' },
                      { icon: Calendar, label: 'Semester', value: studentProfile?.semester ? `Sem ${studentProfile.semester}` : '—' },
                      { icon: Users, label: 'Batch', value: studentProfile?.batch || '—' },
                      { icon: FileText, label: 'ID', value: studentProfile?.enrollment_number || '—' },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${isDark ? 'bg-slate-700/40 border border-slate-600/30' : 'bg-white/15 border border-white/20'} backdrop-blur-sm`}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-slate-600/60' : 'bg-white/20'}`}><item.icon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-white'}`} /></div>
                        <div className="min-w-0"><div className={`text-xs ${isDark ? 'text-slate-500' : 'text-white/60'}`}>{item.label}</div><div className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-white'}`}>{item.value}</div></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {['Honor Roll', "Dean's List", 'Tech Lead'].map((badge, i) => (
                      <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/20 text-white border border-white/25'}`}>{badge}</span>
                    ))}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 xl:grid-cols-2 gap-2.5 xl:w-48 xl:flex-shrink-0">
                  {[
                    { icon: Trophy, value: dashboardStats?.gpa?.toFixed(1) || '—', label: 'GPA', color: 'from-amber-400 to-orange-500' },
                    { icon: UserCheck, value: `${Math.round(dashboardStats?.attendance_percentage || 0)}%`, label: 'Attendance', color: 'from-emerald-400 to-teal-500' },
                    { icon: CheckCircle, value: dashboardStats?.submitted_tasks || '0', label: 'Tasks Done', color: 'from-blue-400 to-indigo-500' },
                    { icon: FileText, value: dashboardStats?.total_documents || '0', label: 'Documents', color: dashboardStats?.documents_verified ? 'from-emerald-400 to-teal-500' : 'from-amber-400 to-orange-500' },
                  ].map((stat, i) => (
                    <div key={i} className={`relative overflow-hidden rounded-xl p-3 bg-gradient-to-br ${stat.color} shadow-lg`}>
                      <div className="absolute inset-0 bg-white/10 rotate-45 scale-150" />
                      <div className="relative z-10">
                        <stat.icon className="w-4 h-4 text-white/80 mb-1.5" />
                        <div className="text-lg font-bold text-white leading-none">{stat.value}</div>
                        <div className="text-xs text-white/75 mt-0.5">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* ── DYNAMIC PAGE CONTENT ───────────────────────────────────────── */}
          {renderContent()}
        </div>
      </main>

      {/* ── UPLOAD DOCUMENT MODAL ───────────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Header */}
            <div className={`px-6 py-5 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Upload Document</h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Submit documents for verification</p>
                </div>
              </div>
              <button onClick={closeUploadModal} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><CloseIcon className="w-5 h-5" /></button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Document type */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Document Type</label>
                <select id="documentType" defaultValue="" className={`w-full px-3 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}>
                  <option value="" disabled>Select document type…</option>
                  {documentTypesStatus.filter(d => d.upload_status === 'not_uploaded' || d.verification_status === 'rejected').length > 0
                    ? documentTypesStatus.filter(d => d.upload_status === 'not_uploaded' || d.verification_status === 'rejected').map(doc => (
                        <option key={doc.document_type_id} value={doc.document_type_id}>{doc.name} {doc.is_required ? '(Required)' : '(Optional)'}</option>
                      ))
                    : <option value="" disabled>All documents uploaded</option>
                  }
                  <optgroup label="Document Status">
                    <option value="not_applicable">Not Applicable</option>
                    <option value="not_present">Not Present</option>
                  </optgroup>
                </select>
                {documentTypesStatus.filter(d => d.upload_status === 'not_uploaded' || d.verification_status === 'rejected').length === 0 && (
                  <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>All required documents submitted. You can still mark status below.</p>
                )}
              </div>

              {/* Status reason (hidden by default) */}
              <div id="statusReasonSection" className="hidden">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Reason</label>
                <textarea id="statusReason" rows={2} className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'}`} placeholder="Explain why this document is not applicable or not present…" />
              </div>

              {/* Drop zone */}
              <div data-file-upload-area>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Select File</label>
                <div
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${dragActive ? isDark ? 'border-indigo-500 bg-indigo-900/20' : 'border-indigo-400 bg-indigo-50' : isDark ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
                >
                  <input type="file" id="fileInput" onChange={handleFileUpload} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <Upload className={`w-7 h-7 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  </div>
                  {selectedFileName ? (
                    <>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedFileName}</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Click or drag to change</p>
                    </>
                  ) : (
                    <>
                      <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-700'}`}>Drag & drop your file here</p>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>or click to browse</p>
                    </>
                  )}
                  <p className={`text-xs mt-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>PDF, JPG, PNG, DOC · Max 5 MB</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>(Optional)</span></label>
                <textarea id="documentDescription" rows={2} className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'}`} placeholder="Additional information about this document…" />
              </div>

              {/* Upload progress */}
              {uploadProgress > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Uploading…</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{uploadProgress}%</span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <button onClick={closeUploadModal} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancel</button>
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2"
                onClick={async () => {
                  const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                  const documentType = (document.getElementById('documentType') as HTMLSelectElement).value;
                  const description = (document.getElementById('documentDescription') as HTMLTextAreaElement).value;
                  const statusReason = (document.getElementById('statusReason') as HTMLTextAreaElement)?.value || '';
                  if (!documentType) { alert('Please select a document type'); return; }
                  if (documentType === 'not_applicable' || documentType === 'not_present') {
                    if (!statusReason.trim()) { alert('Please provide a reason'); return; }
                    setUploadedDocuments(prev => [...prev, { id: Date.now().toString(), name: documentType === 'not_applicable' ? 'Not Applicable' : 'Not Present', type: 'status', size: 0, category: 'administrative', status: 'approved', uploadDate: new Date(), url: '#', description: statusReason, tags: [documentType] }]);
                    closeUploadModal(); return;
                  }
                  if (!fileInput.files || fileInput.files.length === 0) { alert('Please select a file'); return; }
                  const file = fileInput.files[0];
                  setUploadProgress(10);
                  try {
                    const numericId = parseInt(documentType);
                    if (isNaN(numericId)) { alert('Invalid document type'); setUploadProgress(0); return; }
                    const select = document.getElementById('documentType') as HTMLSelectElement;
                    const selectedText = select.options[select.selectedIndex].text.replace(' (Required)', '').replace(' (Optional)', '');
                    const autoName = generateFileName(file.name, selectedText);
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('file_name', autoName);
                    await documentService.uploadDocument(formData, numericId.toString());
                    setUploadProgress(100);
                    alert('Document uploaded successfully! It will be reviewed by the administration.');
                    const documentsData = await studentService.getDocuments() as any[];
                    setUploadedDocuments(documentsData.map((doc: any) => ({ id: doc.id.toString(), name: doc.file_name || doc.document_type?.name || 'Document', type: doc.document_type?.name || 'document', size: (doc.file_size_mb || 0) * 1024 * 1024, category: 'academic', status: doc.verification_status === 'verified' ? 'approved' : doc.verification_status === 'rejected' ? 'rejected' : 'pending', uploadDate: new Date(doc.uploaded_at || doc.created_at), description: `${doc.document_type?.name || 'Document'} - ${doc.verification_status || 'pending'}`, tags: [doc.verification_status || 'pending'], url: doc.file_path ? `/uploads/documents/${doc.student?.enrollment_number}/${doc.file_name}` : '', document_type_id: doc.document_type_id, verification_status: doc.verification_status })));
                    closeUploadModal();
                  } catch (err: any) {
                    setUploadProgress(0);
                    alert(`Upload failed: ${err.response?.data?.detail || err.message || 'Please try again.'}`);
                  }
                }}
              >
                <Upload className="w-4 h-4" /> Upload Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOCUMENT PREVIEW MODAL ──────────────────────────────────────────── */}
      {showPreviewModal && documentPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Document Preview</h3>
                <p className={`text-xs mt-0.5 truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{documentPreview.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadDocument({ id: 'preview', name: documentPreview.name, url: documentPreview.url, type: '', size: 0, category: 'academic', status: 'approved', uploadDate: new Date(), description: '', tags: [] })} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`} title="Download"><Download className="w-5 h-5" /></button>
                <button onClick={closePreviewModal} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><CloseIcon className="w-5 h-5" /></button>
              </div>
            </div>
            <div className={`flex-1 overflow-hidden p-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="w-full h-full min-h-[60vh] rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                {documentPreview.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={documentPreview.url} alt={documentPreview.name} className="max-w-full max-h-full object-contain" />
                ) : documentPreview.url.endsWith('.pdf') || documentPreview.url.startsWith('blob:') ? (
                  <iframe src={documentPreview.url} className="w-full h-full min-h-[60vh]" title={documentPreview.name} />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">Preview not available for this file type</p>
                    <button onClick={() => downloadDocument({ id: 'preview', name: documentPreview.name, url: documentPreview.url, type: '', size: 0, category: 'academic', status: 'approved', uploadDate: new Date(), description: '', tags: [] })} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">Download File</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRM ──────────────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border shadow-2xl w-full max-w-sm p-6 text-center ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-rose-900/30' : 'bg-rose-50'}`}>
              <LogOut className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Sign Out</h3>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Are you sure you want to sign out of your account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>Cancel</button>
              <button onClick={() => logout()} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-lg hover:scale-[1.02] transition-all">Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI ASSISTANT ────────────────────────────────────────────────────── */}
      <AIAssistantButton />

    </div>
  );
};

export default StudentDashboard;
