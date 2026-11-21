import React, { useState, useEffect } from 'react';
import { 

const API_BASE = process.env.REACT_APP_API_URL || API_BASE + '';
  MessageSquare, 
  Send, 
  Reply, 
  Forward, 
  Paperclip, 
  Search, 
  Filter, 
  RefreshCw,
  Bell,
  User,
  Users,
  Mail,
  Phone,
  Video,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Plus,
  Edit,
  Trash2,
  Archive,
  Star,
  MoreHorizontal,
  Download,
  Upload,
  Smile,
  Hash,
  AtSign,
  Send as SendIcon,
  File,
  Image,
  Link
} from 'lucide-react';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  sender_avatar?: string;
  recipient_id: number;
  recipient_name: string;
  recipient_email: string;
  subject: string;
  content: string;
  timestamp: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  type: 'student' | 'faculty' | 'registrar' | 'admin' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  has_attachment: boolean;
  attachments?: Attachment[];
  thread_id?: number;
  reply_count: number;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'draft';
}

interface Attachment {
  id: number;
  filename: string;
  file_size: number;
  file_type: string;
  download_url: string;
}

interface Conversation {
  id: number;
  participants: Participant[];
  last_message: Message;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role: 'student' | 'faculty' | 'registrar' | 'admin';
  is_online: boolean;
  last_seen: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'message' | 'task' | 'grade' | 'system' | 'announcement';
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
  is_read: boolean;
  action_url?: string;
  icon?: string;
}

const FacultyCommunication: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts' | 'starred' | 'archived'>('inbox');
  const [activeView, setActiveView] = useState<'messages' | 'conversations' | 'notifications'>('messages');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isComposingReply, setIsComposingReply] = useState(false);

  // Compose message form
  const [composeForm, setComposeForm] = useState({
    recipient: '',
    subject: '',
    content: '',
    priority: 'medium' as const,
    attachments: [] as File[]
  });

  useEffect(() => {
    fetchCommunicationData();
    const interval = setInterval(fetchCommunicationData, 30000); // Real-time updates
    return () => clearInterval(interval);
  }, []);

  const fetchCommunicationData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch messages
      const messagesResponse = await fetch(API_BASE + '/faculty/messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData);
      }

      // Fetch conversations
      const conversationsResponse = await fetch(API_BASE + '/faculty/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        setConversations(conversationsData);
      }

      // Fetch notifications
      const notificationsResponse = await fetch(API_BASE + '/faculty/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData);
      }

      // Use mock data for demo
      setMockData();
    } catch (error) {
      console.error('Error fetching communication data:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setMessages([
      {
        id: 1,
        sender_id: 1,
        sender_name: "Rahul Kumar",
        sender_email: "rahul.kumar@university.edu.in",
        recipient_id: 45,
        recipient_name: "Dr. Sarah Johnson",
        recipient_email: "sarah.johnson@university.edu.in",
        subject: "Question about Assignment 3",
        content: "Hi Professor Johnson, I have a question about the third assignment. I'm having trouble understanding the recursion part of the binary tree implementation. Could you please provide some additional resources or clarify the concept?",
        timestamp: "2026-03-16T09:30:00",
        is_read: false,
        is_starred: false,
        is_archived: false,
        type: "student",
        priority: "medium",
        has_attachment: false,
        reply_count: 0,
        status: "read"
      },
      {
        id: 2,
        sender_id: 44,
        sender_name: "John Smith",
        sender_email: "registrar@university.edu.in",
        recipient_id: 45,
        recipient_name: "Dr. Sarah Johnson",
        recipient_email: "sarah.johnson@university.edu.in",
        subject: "Faculty Meeting Tomorrow",
        content: "Dear Faculty Members, This is a reminder about tomorrow's faculty meeting scheduled at 2:00 PM in Conference Room A. We will be discussing the upcoming semester planning and new curriculum changes. Please bring your department reports.",
        timestamp: "2026-03-16T08:15:00",
        is_read: true,
        is_starred: true,
        is_archived: false,
        type: "registrar",
        priority: "high",
        has_attachment: true,
        attachments: [
          {
            id: 1,
            filename: "meeting_agenda.pdf",
            file_size: 245760,
            file_type: "application/pdf",
            download_url: "/files/meeting_agenda.pdf"
          }
        ],
        reply_count: 0,
        status: "read"
      },
      {
        id: 3,
        sender_id: 2,
        sender_name: "Priya Sharma",
        sender_email: "priya.sharma@university.edu.in",
        recipient_id: 45,
        recipient_name: "Dr. Sarah Johnson",
        recipient_email: "sarah.johnson@university.edu.in",
        subject: "Thank you for the extra help session",
        content: "Dear Professor Johnson, Thank you so much for conducting the extra help session yesterday. It really helped me understand the complex topics better. I feel much more confident about the upcoming exam now.",
        timestamp: "2026-03-15T16:45:00",
        is_read: true,
        is_starred: false,
        is_archived: false,
        type: "student",
        priority: "low",
        has_attachment: false,
        reply_count: 1,
        status: "read"
      }
    ]);

    setConversations([
      {
        id: 1,
        participants: [
          {
            id: 45,
            name: "Dr. Sarah Johnson",
            email: "sarah.johnson@university.edu.in",
            role: "faculty",
            is_online: true,
            last_seen: "Online"
          },
          {
            id: 1,
            name: "Rahul Kumar",
            email: "rahul.kumar@university.edu.in",
            role: "student",
            is_online: false,
            last_seen: "2 hours ago"
          }
        ],
        last_message: {
          id: 1,
          sender_id: 1,
          sender_name: "Rahul Kumar",
          sender_email: "rahul.kumar@university.edu.in",
          recipient_id: 45,
          recipient_name: "Dr. Sarah Johnson",
          recipient_email: "sarah.johnson@university.edu.in",
          subject: "Question about Assignment 3",
          content: "Hi Professor Johnson, I have a question about the third assignment...",
          timestamp: "2026-03-16T09:30:00",
          is_read: false,
          is_starred: false,
          is_archived: false,
          type: "student",
          priority: "medium",
          has_attachment: false,
          reply_count: 0,
          status: "read"
        },
        unread_count: 1,
        is_muted: false,
        is_pinned: false,
        created_at: "2026-03-10T10:00:00",
        updated_at: "2026-03-16T09:30:00"
      }
    ]);

    setNotifications([
      {
        id: 1,
        title: "New message from Rahul Kumar",
        message: "Question about Assignment 3",
        type: "message",
        priority: "medium",
        timestamp: "2026-03-16T09:30:00",
        is_read: false,
        action_url: "/messages/1",
        icon: "message"
      },
      {
        id: 2,
        title: "Faculty meeting tomorrow",
        message: "Meeting at 2:00 PM in Conference Room A",
        type: "announcement",
        priority: "high",
        timestamp: "2026-03-16T08:15:00",
        is_read: false,
        action_url: "/calendar",
        icon: "calendar"
      },
      {
        id: 3,
        title: "Assignment grading completed",
        message: "You have graded 45 submissions for CS301",
        type: "task",
        priority: "low",
        timestamp: "2026-03-15T17:30:00",
        is_read: true,
        action_url: "/tasks",
        icon: "check"
      }
    ]);
  };

  const handleSendMessage = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      
      formData.append('recipient', composeForm.recipient);
      formData.append('subject', composeForm.subject);
      formData.append('content', composeForm.content);
      formData.append('priority', composeForm.priority);
      
      composeForm.attachments.forEach((file, index) => {
        formData.append(`attachment_${index}`, file);
      });

      const response = await fetch(API_BASE + '/faculty/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setShowComposeModal(false);
        setComposeForm({
          recipient: '',
          subject: '',
          content: '',
          priority: 'medium',
          attachments: []
        });
        fetchCommunicationData();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE}/faculty/messages/${selectedMessage.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: replyContent
        })
      });

      if (response.ok) {
        setReplyContent('');
        setIsComposingReply(false);
        fetchCommunicationData();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleMarkAsRead = async (messageId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`${API_BASE}/faculty/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      fetchCommunicationData();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const renderMessageList = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            <span>Compose</span>
          </button>
        </div>

        <div className="flex items-center space-x-1 px-4 border-b border-gray-200">
          {[
            { id: 'inbox', label: 'Inbox', count: messages.filter(m => !m.is_read).length },
            { id: 'sent', label: 'Sent', count: 0 },
            { id: 'drafts', label: 'Drafts', count: 0 },
            { id: 'starred', label: 'Starred', count: messages.filter(m => m.is_starred).length },
            { id: 'archived', label: 'Archived', count: messages.filter(m => m.is_archived).length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {messages
          .filter(message => {
            if (activeTab === 'inbox') return !message.is_archived;
            if (activeTab === 'sent') return message.status === 'sent';
            if (activeTab === 'drafts') return message.status === 'draft';
            if (activeTab === 'starred') return message.is_starred;
            if (activeTab === 'archived') return message.is_archived;
            return true;
          })
          .filter(message => 
            message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            message.sender_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            message.content.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map(message => (
            <div
              key={message.id}
              onClick={() => {
                setSelectedMessage(message);
                setShowMessageDetail(true);
                if (!message.is_read) {
                  handleMarkAsRead(message.id);
                }
              }}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                !message.is_read ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {message.sender_name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-sm ${!message.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                        {message.sender_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(message.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <p className={`text-sm ${!message.is_read ? 'font-semibold' : ''} text-gray-900 truncate mb-1`}>
                      {message.subject}
                    </p>
                    
                    <p className="text-sm text-gray-600 truncate">
                      {message.content}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      {message.priority === 'high' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          High Priority
                        </span>
                      )}
                      {message.has_attachment && (
                        <Paperclip className="w-4 h-4 text-gray-400" />
                      )}
                      {message.reply_count > 0 && (
                        <span className="text-xs text-gray-500">
                          {message.reply_count} replies
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle star toggle
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Star className={`w-4 h-4 ${message.is_starred ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                  </button>
                  <button className="p-1 hover:bg-gray-200 rounded">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );

  const renderMessageDetail = () => {
    if (!selectedMessage) return null;

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowMessageDetail(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Edit className="w-4 h-4 text-gray-600" />
              </button>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedMessage.subject}</h3>
                <p className="text-sm text-gray-600">
                  From: {selectedMessage.sender_name} ({selectedMessage.sender_email})
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Reply className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Forward className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Trash2 className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Archive className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{new Date(selectedMessage.timestamp).toLocaleString()}</span>
            {selectedMessage.priority === 'high' && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                High Priority
              </span>
            )}
            {selectedMessage.has_attachment && (
              <span className="flex items-center">
                <Paperclip className="w-4 h-4 mr-1" />
                Attachment
              </span>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="prose max-w-none">
            <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.content}</p>
          </div>

          {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Attachments</h4>
              <div className="space-y-2">
                {selectedMessage.attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <File className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                        <p className="text-xs text-gray-500">{(attachment.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          {!isComposingReply ? (
            <button
              onClick={() => setIsComposingReply(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Reply className="w-4 h-4" />
              <span>Reply</span>
            </button>
          ) : (
            <div className="space-y-4">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Type your reply..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Paperclip className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Image className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Link className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Smile className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setIsComposingReply(false);
                      setReplyContent('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderComposeModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-screen overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">New Message</h3>
          <button
            onClick={() => setShowComposeModal(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Edit className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <select
                value={composeForm.recipient}
                onChange={(e) => setComposeForm({...composeForm, recipient: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select recipient</option>
                <option value="registrar@university.edu.in">Registrar Office</option>
                <option value="all_students">All Students</option>
                <option value="cs301_students">CS301 Students</option>
                <option value="cs302_students">CS302 Students</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={composeForm.subject}
                onChange={(e) => setComposeForm({...composeForm, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subject"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={composeForm.priority}
                onChange={(e) => setComposeForm({...composeForm, priority: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={composeForm.content}
                onChange={(e) => setComposeForm({...composeForm, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={8}
                placeholder="Type your message here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Drop files here or click to upload</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files) {
                      setComposeForm({
                        ...composeForm,
                        attachments: Array.from(e.target.files)
                      });
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm"
                >
                  Browse files
                </label>
              </div>
              
              {composeForm.attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {composeForm.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        onClick={() => {
                          setComposeForm({
                            ...composeForm,
                            attachments: composeForm.attachments.filter((_, i) => i !== index)
                          });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded">
              <Paperclip className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Image className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded">
              <Link className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComposeModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!composeForm.recipient || !composeForm.subject || !composeForm.content}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
              !notification.is_read ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${
                notification.type === 'message' ? 'bg-blue-100' :
                notification.type === 'announcement' ? 'bg-green-100' :
                notification.type === 'task' ? 'bg-yellow-100' :
                'bg-gray-100'
              }`}>
                {notification.type === 'message' && <MessageSquare className="w-4 h-4 text-blue-600" />}
                {notification.type === 'announcement' && <Bell className="w-4 h-4 text-green-600" />}
                {notification.type === 'task' && <CheckCircle className="w-4 h-4 text-yellow-600" />}
                {notification.type === 'system' && <Info className="w-4 h-4 text-gray-600" />}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                    {notification.title}
                  </p>
                  <span className="text-xs text-gray-500">
                    {new Date(notification.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                
                {notification.action_url && (
                  <button className="text-sm text-blue-600 hover:text-blue-800">
                    View Details →
                  </button>
                )}
              </div>
              
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Communication Center</h2>
        <p className="text-gray-600">Manage messages, conversations, and notifications</p>
      </div>

      <div className="flex items-center space-x-1 mb-6">
        <button
          onClick={() => setActiveView('messages')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'messages' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Messages</span>
          {messages.filter(m => !m.is_read).length > 0 && (
            <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full">
              {messages.filter(m => !m.is_read).length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveView('conversations')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'conversations' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Conversations</span>
        </button>
        
        <button
          onClick={() => setActiveView('notifications')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            activeView === 'notifications' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <span className="bg-white text-blue-600 text-xs px-2 py-1 rounded-full">
              {notifications.filter(n => !n.is_read).length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={activeView === 'messages' && showMessageDetail ? 'lg:col-span-1' : 'lg:col-span-3'}>
          {activeView === 'messages' && renderMessageList()}
          {activeView === 'conversations' && (
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Conversation view coming soon...</p>
            </div>
          )}
          {activeView === 'notifications' && renderNotifications()}
        </div>
        
        {activeView === 'messages' && showMessageDetail && (
          <div className="lg:col-span-2">
            {renderMessageDetail()}
          </div>
        )}
      </div>

      {showComposeModal && renderComposeModal()}
    </div>
  );
};

export default FacultyCommunication;
