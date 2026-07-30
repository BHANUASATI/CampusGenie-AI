import { conversations } from '../data/conversations';

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const chatService = {
  // Get all conversations
  getConversations: async () => {
    await delay(300);
    return conversations;
  },

  // Get conversation by ID
  getConversationById: async (id) => {
    await delay(200);
    return conversations.find((conv) => conv.id === id) || null;
  },

  // Send message and get AI response
  sendMessage: async (message, conversationId = null) => {
    await delay(1000);
    
    // Mock AI response based on message content
    const mockResponses = {
      attendance: {
        content: 'Your current overall attendance is 82%. You have attended 148 out of 180 total classes. All courses are above the 75% minimum requirement except Cloud Computing (76%) and Computer Networks (77%), which need attention.',
        sources: [
          {
            title: 'Attendance Records',
            page: 1,
            section: 'Current Status',
          },
        ],
      },
      schedule: {
        content: 'Here is your schedule for today:\n\n**09:30 AM - 10:30 AM**\nData Structures (CS501)\nRoom: A-204\n\n**11:00 AM - 12:30 PM**\nCloud Computing (CS503)\nLab 3\n\n**02:00 PM - 03:30 PM**\nArtificial Intelligence (CS502)\nRoom: B-102',
        sources: [],
      },
      default: {
        content: 'I understand your question. Based on the available information, here\'s what I can tell you. For more detailed information, please refer to the relevant university policies or contact the concerned department.',
        sources: [
          {
            title: 'University Handbook',
            page: 1,
            section: 'General Information',
          },
        ],
      },
    };

    let response = mockResponses.default;
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('attendance')) {
      response = mockResponses.attendance;
    } else if (lowerMessage.includes('schedule') || lowerMessage.includes('class') || lowerMessage.includes('today')) {
      response = mockResponses.schedule;
    }

    return {
      id: Date.now(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date().toISOString(),
      sources: response.sources,
    };
  },

  // Create new conversation
  createConversation: async (title) => {
    await delay(200);
    return {
      id: Date.now(),
      title: title || 'New Conversation',
      lastMessage: '',
      timestamp: new Date().toISOString(),
      messages: [],
    };
  },

  // Delete conversation
  deleteConversation: async (id) => {
    await delay(200);
    return { success: true };
  },

  // Update conversation title
  updateConversationTitle: async (id, title) => {
    await delay(200);
    return { success: true };
  },
};
