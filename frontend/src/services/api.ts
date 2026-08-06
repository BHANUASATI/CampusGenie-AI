// API Service Layer for CampusGenie
// This file defines the API endpoints and service functions

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';

// Generic API client
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    // Do NOT set a default Content-Type here — multipart/form-data uploads
    // require the browser to set the boundary automatically. Per-method
    // callers (post, put, etc.) are responsible for setting Content-Type
    // only when appropriate (i.e. for JSON bodies, not FormData).
    const config = {
      headers: {
        ...(options.headers || {}),
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      console.log('🔍 Using auth token:', token.substring(0, 20) + '...');
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    } else {
      console.log('🔍 No auth token found in localStorage');
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        // Log more details for debugging
        console.log('🔍 Response status:', response.status);
        console.log('🔍 Response headers:', response.headers);
        
        // Try to get error details
        let errorMessage = `API Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage += ` - ${errorData.detail}`;
          }
        } catch (e) {
          // If we can't parse JSON, just use the status text
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const config: RequestInit = {
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
      headers: {
        ...(options?.headers || {}),
      },
      ...options,
    };

    // Only set Content-Type for non-FormData requests
    if (!(data instanceof FormData)) {
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
      };
    }

    return this.request<T>(endpoint, config);
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

const apiClient = new ApiClient(API_BASE_URL);

// Authentication Service
export const authService = {
  login: async (email: string, password: string) => {
    return apiClient.post('/api/auth/login', { email, password });
  },

  logout: async () => {
    return apiClient.post('/api/auth/logout');
  },

  getCurrentUser: async () => {
    return apiClient.get('/api/auth/me');
  },

  registerStudent: async (data: any) => {
    return apiClient.post('/api/auth/register/student', data);
  },

  registerFaculty: async (data: any) => {
    return apiClient.post('/api/auth/register/faculty', data);
  },

  registerAdmin: async (data: any) => {
    return apiClient.post('/api/auth/register/admin', data);
  },

  // Microsoft OAuth functions
  getMicrosoftAuthUrl: async () => {
    return apiClient.get('/api/oauth/microsoft/login');
  },

  handleMicrosoftCallback: async (code: string, state: string) => {
    return apiClient.get(`/api/oauth/microsoft/callback?code=${code}&state=${state}`);
  },

  getMicrosoftUserInfo: async (accessToken: string) => {
    return apiClient.get(`/api/oauth/microsoft/user-info?access_token=${accessToken}`);
  },
};

// Student Service
export const studentService = {
  getProfile: async () => {
    return apiClient.get('/students/me');
  },

  updateProfile: async (data: any) => {
    return apiClient.put('/students/me', data);
  },

  getDashboardStats: async () => {
    return apiClient.get('/students/dashboard/stats');
  },

  getVerificationStatus: async () => {
    return apiClient.get('/students/verification/status');
  },

  getTasks: async () => {
    return apiClient.get('/tasks');
  },

  submitTask: async (taskId: string, submissionData: any) => {
    return apiClient.post(`/tasks/${taskId}/submit`, submissionData);
  },

  getDocuments: async () => {
    return apiClient.get('/documents/my-documents');
  },

  getDocumentsStatus: async () => {
    return apiClient.get('/documents/my-documents-status');
  },
};

// Faculty Service
export const facultyService = {
  getProfile: async () => {
    return apiClient.get('/faculty/me');
  },

  updateProfile: async (data: any) => {
    return apiClient.put('/faculty/me', data);
  },

  getDashboardStats: async () => {
    return apiClient.get('/faculty/dashboard/stats');
  },

  getPendingDocuments: async () => {
    return apiClient.get('/faculty/documents/pending');
  },

  verifyDocument: async (documentId: string, status: string, notes?: string) => {
    const query = new URLSearchParams({
      verification_status: status,
      verification_notes: notes || ''
    }).toString();
    return apiClient.put(`/faculty/documents/${documentId}/verify?${query}`);
  },

  getTasks: async () => {
    return apiClient.get('/tasks');
  },

  createTask: async (taskData: any) => {
    return apiClient.post('/tasks', taskData);
  },

  gradeSubmission: async (submissionId: string, gradeData: any) => {
    return apiClient.put(`/tasks/submissions/${submissionId}/grade`, gradeData);
  },
};

// Calendar Service
export const calendarService = {
  getEvents: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    return apiClient.get(`/calendar/events${params ? '?' + params : ''}`);
  },

  getEvent: async (eventId: string) => {
    return apiClient.get(`/calendar/events/${eventId}`);
  },

  createEvent: async (eventData: any) => {
    return apiClient.post('/calendar/events', eventData);
  },

  updateEvent: async (eventId: string, eventData: any) => {
    return apiClient.put(`/calendar/events/${eventId}`, eventData);
  },

  deleteEvent: async (eventId: string) => {
    return apiClient.delete(`/calendar/events/${eventId}`);
  },

  getAcademicEvents: async (month?: number, year?: number) => {
    const params = new URLSearchParams({
      ...(month && { month: month.toString() }),
      ...(year && { year: year.toString() })
    }).toString();
    return apiClient.get(`/calendar/academic-events${params ? '?' + params : ''}`);
  },

  getPersonalEvents: async (month?: number, year?: number) => {
    const params = new URLSearchParams({
      ...(month && { month: month.toString() }),
      ...(year && { year: year.toString() })
    }).toString();
    return apiClient.get(`/calendar/personal-events${params ? '?' + params : ''}`);
  },

  getCalendarStats: async (eventType?: string) => {
    const params = eventType ? `?event_type=${eventType}` : '';
    return apiClient.get(`/calendar/stats${params}`);
  },

  markEventComplete: async (eventId: string) => {
    return apiClient.post(`/calendar/events/${eventId}/mark-complete`);
  },

  toggleEventStatus: async (eventId: string) => {
    return apiClient.post(`/calendar/events/${eventId}/toggle-status`);
  },
};

// Administration Service
export const adminService = {
  getDashboardStats: async () => {
    return apiClient.get('/admin/dashboard/stats');
  },

  getStudents: async () => {
    return apiClient.get('/admin/students');
  },

  getFaculty: async () => {
    return apiClient.get('/admin/faculty');
  },

  getDepartments: async () => {
    return apiClient.get('/admin/departments');
  },

  getPendingDocuments: async () => {
    return apiClient.get('/admin/documents/pending');
  },

  getTasks: async () => {
    return apiClient.get('/admin/tasks');
  },

  getAuditLogs: async () => {
    return apiClient.get('/admin/audit/logs');
  },

  toggleFacultyStatus: async (facultyId: string) => {
    return apiClient.post(`/admin/faculty/${facultyId}/toggle-status`);
  },

  // User Management
  getUsers: async (): Promise<any[]> => {
    return apiClient.get('/admin/users');
  },

  createUser: async (userData: any): Promise<any> => {
    return apiClient.post('/admin/users', userData);
  },

  updateUser: async (userId: string, userData: any): Promise<any> => {
    return apiClient.put(`/admin/users/${userId}`, userData);
  },

  deleteUser: async (userId: string): Promise<any> => {
    return apiClient.delete(`/admin/users/${userId}`);
  },

  getStats: async (): Promise<{
    total_users: number;
    total_students: number;
    total_faculty: number;
    active_users: number;
  }> => {
    return apiClient.get('/admin/stats');
  },
};

// Document Service
export const documentService = {
  getDocumentTypes: async () => {
    return apiClient.get('/documents/types');
  },

  uploadDocument: async (formData: FormData, documentTypeId?: string) => {
    const url = documentTypeId ? `/documents/upload?document_type_id=${documentTypeId}` : '/documents/upload';
    return apiClient.post(url, formData);
  },

  getStudentDocuments: async (studentId: string) => {
    return apiClient.get(`/documents/student/${studentId}`);
  },

  deleteDocument: async (documentId: string) => {
    return apiClient.delete(`/documents/${documentId}`);
  },
};

// Task Service
export const taskService = {
  getTasks: async () => {
    return apiClient.get('/tasks');
  },

  createTask: async (taskData: any) => {
    return apiClient.post('/tasks', taskData);
  },

  getTask: async (taskId: string) => {
    return apiClient.get(`/tasks/${taskId}`);
  },

  updateTask: async (taskId: string, taskData: any) => {
    return apiClient.put(`/tasks/${taskId}`, taskData);
  },

  submitTask: async (taskId: string, submissionData: any) => {
    return apiClient.post(`/tasks/${taskId}/submit`, submissionData);
  },

  getTaskSubmissions: async (taskId: string) => {
    return apiClient.get(`/tasks/${taskId}/submissions`);
  },

  gradeSubmission: async (submissionId: string, gradeData: any) => {
    return apiClient.put(`/tasks/submissions/${submissionId}/grade`, gradeData);
  },
};

// AI Assistant Service
export const aiAssistantService = {
  getConversations: async () => {
    return apiClient.get('/api/ai/conversations');
  },

  createConversation: async (title?: string) => {
    return apiClient.post('/api/ai/conversations', { title });
  },

  getConversation: async (conversationId: string) => {
    return apiClient.get(`/api/ai/conversations/${conversationId}`);
  },

  sendMessage: async (conversationId: string, content: string) => {
    return apiClient.post(`/api/ai/conversations/${conversationId}/messages`, { content });
  },

  deleteConversation: async (conversationId: string) => {
    return apiClient.delete(`/api/ai/conversations/${conversationId}`);
  },

  quickChat: async (content: string) => {
    return apiClient.post('/api/ai/chat', { content });
  },
};

// AI Admin Service (knowledge base management)
export const aiAdminService = {
  // Upload a document to the AI knowledge base
  uploadDocument: async (
    file: File,
    docType: string,
    department: string = 'all',
    semester?: number,
    academicYear?: string,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('department', department);
    if (semester) formData.append('semester', String(semester));
    if (academicYear) formData.append('academic_year', academicYear);
    return apiClient.post('/api/ai/documents/upload', formData);
  },

  // List all indexed documents
  listDocuments: async () => {
    return apiClient.get('/api/ai/documents');
  },

  // Delete a document from the knowledge base by filename
  deleteDocument: async (sourceFile: string) => {
    return apiClient.delete(`/api/ai/documents/${encodeURIComponent(sourceFile)}`);
  },

  // Get vector store stats (total chunks, unique documents)
  getStats: async () => {
    return apiClient.get('/api/ai/documents/stats');
  },

  // AI engine health check
  health: async () => {
    return apiClient.get('/api/ai/health');
  },
};

// Export all services
export const api = {
  auth: authService,
  student: studentService,
  faculty: facultyService,
  admin: adminService,
  document: documentService,
  task: taskService,
  aiAssistant: aiAssistantService,
  aiAdmin: aiAdminService,
};

export default apiClient;
