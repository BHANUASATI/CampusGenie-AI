# CampusGenie Frontend

A modern, production-quality React frontend for CampusGenie AI - an AI-powered academic assistant for universities.

## 🚀 Tech Stack

- **React 19** - UI library
- **Vite 8** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS v4** - Utility-first CSS framework
- **Lucide React** - Icon library
- **PostCSS** - CSS processing

## 📁 Project Structure

```
src/
├── assets/              # Static assets
├── components/          # Reusable React components
│   ├── common/         # Button, Card, Modal, etc.
│   ├── layout/         # Sidebar, TopHeader, MainLayout
│   ├── chat/           # Chat-specific components
│   ├── dashboard/      # Dashboard components
│   ├── notices/        # Notice components
│   ├── academics/      # Academic components
│   ├── schedule/       # Schedule components
│   ├── attendance/     # Attendance components
│   ├── placements/     # Placement components
│   ├── policies/       # Policy components
│   ├── search/         # Search components
│   └── profile/        # Profile components
├── pages/              # Page components
│   ├── Dashboard.jsx
│   ├── Chat.jsx
│   ├── Academics.jsx
│   ├── Schedule.jsx
│   ├── Attendance.jsx
│   ├── Notices.jsx
│   ├── Placements.jsx
│   ├── Policies.jsx
│   ├── Settings.jsx
│   ├── Profile.jsx
│   └── NotFound.jsx
├── layouts/            # Layout wrappers
│   └── MainLayout.jsx
├── services/           # API service layer
│   ├── chatService.js
│   ├── academicService.js
│   ├── attendanceService.js
│   ├── noticeService.js
│   ├── placementService.js
│   ├── policyService.js
│   └── scheduleService.js
├── data/               # Centralized mock data
│   ├── courses.js
│   ├── schedule.js
│   ├── attendance.js
│   ├── notices.js
│   ├── placements.js
│   ├── policies.js
│   └── conversations.js
├── context/            # React contexts
│   └── ThemeContext.jsx
├── routes/             # React Router configuration
│   └── index.jsx
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
│   └── cn.js           # Class name utility
├── constants/          # App constants
├── App.jsx             # Main App component
├── main.jsx            # Application entry point
└── index.css           # Global styles
```

## 🛠️ Installation

```bash
cd frontend
npm install
```

## ▶️ Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Build

```bash
npm run build
```

Production files will be in the `dist/` directory.

## 🧪 Lint

```bash
npm run lint
```

## 📱 Available Routes

- `/` - Dashboard (Home)
- `/chat` - AI Chat interface
- `/academics` - Academic courses
- `/academics/:courseId` - Course details
- `/schedule` - Class schedule
- `/attendance` - Attendance tracking
- `/notices` - University notices
- `/notices/:noticeId` - Notice details
- `/placements` - Placement opportunities
- `/policies` - University policies
- `/settings` - Settings
- `/profile` - User profile

## 🎨 Features

### Dashboard
- Today's schedule overview
- Attendance summary
- Latest notices
- Upcoming deadlines
- Placement updates
- Quick AI chat access

### AI Chat
- Conversational AI interface
- Source citations for RAG responses
- Chat history management
- Response actions (copy, helpful, regenerate)
- Mobile-responsive design

### Academics
- Course listing with search
- Course details view
- Faculty information
- Schedule and attendance per course
- Resource links

### Schedule
- Today's schedule
- Weekly timetable
- Day-by-day navigation
- Class type indicators (Lecture/Lab)

### Attendance
- Overall attendance percentage
- Course-wise attendance breakdown
- Visual progress indicators
- Status indicators (Good Standing, Attention Required)

### Notices
- Categorized notice listing
- Search and filter functionality
- Notice detail view
- AI chat integration for notice queries

### Placements
- Placement drive listings
- Company and role information
- Eligibility requirements
- Application status tracking
- AI chat integration for eligibility checks

### Policies
- University policy documents
- Category-based filtering
- Policy detail view
- AI chat integration for policy explanations

### Settings
- Dark/light theme toggle
- Notification preferences
- Profile management
- Security settings

## 🔄 Backend Integration

The frontend is designed to easily integrate with a FastAPI backend. The service layer (`src/services/`) currently returns mock data but is structured to make API calls:

```javascript
// Example service structure
export const chatService = {
  sendMessage: async (message, conversationId) => {
    // Replace mock response with actual API call
    // const response = await fetch('/api/v1/chat', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ message, conversation_id: conversationId })
    // });
    // return await response.json();
    
    // Currently returns mock data
    return mockResponse;
  }
};
```

## 🎯 Design Principles

- **Clean & Minimal** - Professional, academic aesthetic
- **Responsive** - Works on desktop, tablet, and mobile
- **Accessible** - Semantic HTML, keyboard navigation, ARIA labels
- **Component Reusability** - DRY principle with shared components
- **Service Layer** - Separated data fetching logic
- **Mock Data Architecture** - Centralized, easily replaceable

## 🌙 Dark Mode

The application supports dark mode with:
- System preference detection
- Manual toggle in sidebar
- Persistent preference in localStorage
- Carefully designed color schemes for both themes

## 📦 Dependencies

### Production
- `react` ^19.2.7
- `react-dom` ^19.2.7
- `react-router-dom` - Routing
- `lucide-react` - Icons
- `clsx` - Conditional classes
- `tailwind-merge` - Tailwind class merging

### Development
- `vite` ^8.1.1
- `@vitejs/plugin-react` ^6.0.3
- `tailwindcss` ^4.x
- `@tailwindcss/postcss` - Tailwind PostCSS plugin
- `autoprefixer` - CSS autoprefixing
- `eslint` - Code linting

## 🔧 Configuration

### Tailwind CSS
Configuration in `tailwind.config.js` with custom:
- Primary color palette
- Accent color palette
- Font family settings
- Dark mode support

### PostCSS
Configuration in `postcss.config.js` using `@tailwindcss/postcss` for Tailwind v4.

## 🚀 Future Enhancements

- Global search across all data
- Voice input for chat
- Document upload for AI analysis
- Real-time notifications
- Offline support with PWA
- Advanced analytics dashboard

## 📝 Notes

- This is Phase 1 (Frontend Only) of CampusGenie
- No backend, authentication, or real API calls are implemented
- All data is mocked and will be replaced with backend API calls
- The architecture is designed for easy backend integration in your project.
