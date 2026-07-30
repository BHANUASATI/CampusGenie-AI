import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, Paperclip, Mic, Copy, ThumbsUp, ThumbsDown, RefreshCw, Sparkles } from 'lucide-react';
import { chatService } from '../services/chatService';
import { Card, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import EmptyState from '../components/common/EmptyState';

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
    if (location.state?.initialMessage) {
      setInput(location.state.initialMessage);
    }
  }, [location]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      if (data.length > 0 && !currentConversation) {
        loadConversation(data[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await chatService.getConversationById(id);
      setCurrentConversation(conv);
      setMessages(conv?.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await chatService.sendMessage(input, currentConversation?.id);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestions = [
    "What's my schedule today?",
    'Summarise the latest notices',
    'Check my attendance',
    'Explain the examination policy',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSkeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Conversations Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <Card className="h-full">
          <CardContent className="p-4 h-full overflow-y-auto">
            <div className="mb-4">
              <Button variant="outline" className="w-full" onClick={() => {}}>
                <Sparkles className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    currentConversation?.id === conv.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm truncate">{conv.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {conv.lastMessage}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={Sparkles}
              title="How can I help with your academics?"
              description="Ask about courses, schedules, attendance, notices, placements, policies, and university information."
              action={
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-2xl">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => setInput(suggestion)}
                      className="text-left justify-start"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              }
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  } rounded-2xl px-6 py-4`}
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                  
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                      <div className="text-xs font-medium mb-2 opacity-70">Sources:</div>
                      <div className="space-y-2">
                        {message.sources.map((source, index) => (
                          <div
                            key={index}
                            className="text-xs bg-white/10 dark:bg-black/20 rounded-lg p-2 cursor-pointer hover:bg-white/20 dark:hover:bg-black/30 transition-colors"
                          >
                            <div className="font-medium">[{index + 1}] {source.title}</div>
                            <div className="opacity-70">
                              Page {source.page}, Section {source.section}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-300 dark:border-gray-600 opacity-70">
                      <button className="flex items-center gap-1 text-xs hover:opacity-100 transition-opacity">
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:opacity-100 transition-opacity">
                        <ThumbsUp className="w-3 h-3" />
                        Helpful
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:opacity-100 transition-opacity">
                        <ThumbsDown className="w-3 h-3" />
                        Not helpful
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:opacity-100 transition-opacity">
                        <RefreshCw className="w-3 h-3" />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl px-6 py-4">
                  <LoadingSkeleton className="h-4 w-32" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-end gap-3">
              <div className="flex gap-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask CampusGenie anything..."
                  rows={1}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
              </div>
              <Button onClick={handleSendMessage} disabled={!input.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              CampusGenie can make mistakes. Verify important academic information with official university sources.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
