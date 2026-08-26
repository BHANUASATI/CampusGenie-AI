import React from 'react';
import { AlertTriangle, CheckCircle, Clock, Calendar, Tag, Trash2, Edit2, MoreVertical, ChevronRight } from 'lucide-react';

interface PersonalTask {
  id: number;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  completed_date: string | null;
  progress: number;
  tags: string[] | null;
  reminder_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface PersonalTaskCardProps {
  task: PersonalTask;
  onEdit: (task: PersonalTask) => void;
  onDelete: (taskId: number) => void;
  onToggleComplete: (taskId: number) => void;
  onUpdateProgress: (taskId: number, progress: number) => void;
}

export const PersonalTaskCard: React.FC<PersonalTaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateProgress
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800';
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800';
      case 'cancelled':
        return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200 dark:from-gray-900/20 dark:to-slate-900/20 dark:border-gray-800';
      default:
        return 'bg-white dark:bg-dark-800 border-gray-200 dark:border-dark-600 hover:shadow-card-lg';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
      case 'low':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assignment':
        return <Calendar className="w-4 h-4" />;
      case 'project':
        return <ChevronRight className="w-4 h-4" />;
      case 'study':
        return <Tag className="w-4 h-4" />;
      case 'exam':
        return <AlertTriangle className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'health':
        return <CheckCircle className="w-4 h-4" />;
      case 'finance':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'assignment':
        return 'text-blue-600 dark:text-blue-400';
      case 'project':
        return 'text-purple-600 dark:text-purple-400';
      case 'study':
        return 'text-green-600 dark:text-green-400';
      case 'exam':
        return 'text-red-600 dark:text-red-400';
      case 'meeting':
        return 'text-orange-600 dark:text-orange-400';
      case 'health':
        return 'text-pink-600 dark:text-pink-400';
      case 'finance':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const daysUntilDue = task.due_date ? Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className={`border rounded-xl p-5 transition-all duration-300 transform hover:scale-[1.02] ${
      getStatusColor(isOverdue ? 'overdue' : task.status)
    } animate-slide-up`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getCategoryColor(task.category)} bg-opacity-10`}>
            {getCategoryIcon(task.category)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
              {task.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-xs capitalize ${getCategoryColor(task.category)}`}>
                {task.category}
              </span>
              {isOverdue && (
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      
      {task.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center space-x-4">
          {task.due_date && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
          {!isOverdue && daysUntilDue !== null && daysUntilDue >= 0 && (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span className={daysUntilDue <= 3 ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>
                {daysUntilDue === 0 ? 'Today' : daysUntilDue === 1 ? 'Tomorrow' : `${daysUntilDue} days`}
              </span>
            </div>
          )}
        </div>
        {task.reminder_enabled && (
          <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
            <AlertTriangle className="w-3 h-3" />
            <span>Reminder set</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {task.progress > 0 && task.status !== 'completed' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {task.tags.map((tag, index) => (
            <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex space-x-2">
        {task.status !== 'completed' && (
          <button
            onClick={() => onToggleComplete(task.id)}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Mark Complete
          </button>
        )}
        {task.status === 'completed' && (
          <button
            onClick={() => onToggleComplete(task.id)}
            className="flex-1 bg-gradient-to-r from-gray-500 to-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-gray-600 hover:to-slate-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Mark Incomplete
          </button>
        )}
        <button
          onClick={() => onEdit(task)}
          className="px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-red-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};