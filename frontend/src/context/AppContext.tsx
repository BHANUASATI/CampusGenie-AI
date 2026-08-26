import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Student, Task, Semester, FacultyUser, AdminUser } from '../types';
import { ACADEMIC_PROGRAMS, generateTasksForSemester } from '../utils/academicEngine';
import { authService } from '../services/api';

interface AppState {
  currentUser: Student | FacultyUser | AdminUser | null;
  isAuthenticated: boolean;
  isFaculty: boolean;
  currentStudent: Student | null;
  semesters: Semester[];
  tasks: Task[];
  loading: boolean;
  isInitializing: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'LOGIN_SUCCESS'; payload: Student | FacultyUser | AdminUser; isFaculty: boolean }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: Task['status'] } }
  | { type: 'ADD_SEMESTER_TASKS'; payload: { semesterNumber: number; tasks: Task[] } }
  | { type: 'INITIALIZE_STUDENT_DATA'; payload: Student };

const initialState: AppState = {
  currentUser: null,
  isAuthenticated: false,
  isFaculty: false,
  currentStudent: null,
  semesters: [],
  tasks: [],
  loading: false,
  isInitializing: true,
  error: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true,
        isFaculty: action.isFaculty,
        loading: false,
        error: null,
      };

    case 'LOGOUT':
      return {
        ...initialState,
        isInitializing: false,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_INITIALIZING':
      return {
        ...state,
        isInitializing: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case 'UPDATE_TASK_STATUS':
      const updatedTasks = state.tasks.map(task =>
        task.id === action.payload.taskId
          ? { ...task, status: action.payload.status }
          : task
      );
      return {
        ...state,
        tasks: updatedTasks,
      };

    case 'ADD_SEMESTER_TASKS':
      return {
        ...state,
        tasks: [...state.tasks, ...action.payload.tasks],
      };

    case 'INITIALIZE_STUDENT_DATA':
      const student = action.payload;
      const program = ACADEMIC_PROGRAMS.find(p => p.name === student.course);
      
      if (!program) return state;

      const semesters: Semester[] = Array.from(
        { length: program.totalSemesters },
        (_, i) => ({
          number: i + 1,
          tasks: [],
          isActive: i + 1 === student.currentSemester,
          startDate: new Date(),
          endDate: new Date(),
        })
      );

      const allTasks: Task[] = [];
      semesters.forEach((semester, index) => {
        const semesterTasks = generateTasksForSemester(
          program,
          semester.number,
          semester.startDate
        );
        semester.tasks = semesterTasks;
        allTasks.push(...semesterTasks);
      });

      return {
        ...state,
        currentStudent: student,
        semesters,
        tasks: allTasks,
      };

    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await authService.login(email, password) as any;
      
      // Store token
      localStorage.setItem('authToken', response.access_token);
      
      // Determine user role from response
      const userRole = response.user.role;
      const isUserFaculty = userRole === 'faculty';
      const isUserAdmin = userRole === 'admin';
      
      // Create user object based on role
      let user: Student | FacultyUser | AdminUser;
      
      if (isUserAdmin) {
        user = {
          id: response.user.id.toString(),
          name: 'Admin User',
          email: response.user.email,
          role: 'admin' as const,
          permissions: ['all'],
        };
      } else if (isUserFaculty) {
        user = {
          id: response.user.id.toString(),
          name: 'Faculty User',
          email: response.user.email,
          department: 'Computer Science',
          role: 'faculty' as const,
          permissions: ['manage_tasks', 'view_students'],
        };
      } else {
        user = {
          id: response.user.id.toString(),
          name: 'Student User',
          email: response.user.email,
          course: 'BCA',
          currentSemester: 1,
          totalSemesters: 6,
        };
      }

      dispatch({ type: 'LOGIN_SUCCESS', payload: user, isFaculty: isUserFaculty || isUserAdmin });
      
      if (!isUserFaculty && !isUserAdmin) {
        dispatch({ type: 'INITIALIZE_STUDENT_DATA', payload: user as Student });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed. Please check your credentials.';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  };

  const logout = async () => {
    try {
      // Call backend logout if possible
      await authService.logout();
    } catch (error) {
      // Continue with local logout even if backend call fails
      console.error('Backend logout failed:', error);
    }
    
    // Always remove token and dispatch logout
    localStorage.removeItem('authToken');
    dispatch({ type: 'LOGOUT' });
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status } });
  };

  // Initialize authentication state on app startup
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Verify token and get current user
          const response = await authService.getCurrentUser() as any;
          const userRole = response.user.role;
          
          dispatch({ 
            type: 'LOGIN_SUCCESS', 
            payload: response.user, 
            isFaculty: userRole === 'faculty' 
          });
        } catch (error) {
          // Token is invalid, remove it
          localStorage.removeItem('authToken');
          console.error('Invalid token, removed from storage:', error);
        }
      }
      
      // Initialization complete
      dispatch({ type: 'SET_INITIALIZING', payload: false });
    };

    initializeAuth();
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        login,
        logout,
        updateTaskStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
