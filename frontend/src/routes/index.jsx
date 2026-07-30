import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../pages/Dashboard';
import Chat from '../pages/Chat';
import Academics from '../pages/Academics';
import Schedule from '../pages/Schedule';
import Attendance from '../pages/Attendance';
import Notices from '../pages/Notices';
import Placements from '../pages/Placements';
import Policies from '../pages/Policies';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'chat',
        element: <Chat />,
      },
      {
        path: 'academics',
        element: <Academics />,
      },
      {
        path: 'academics/:courseId',
        element: <Academics />,
      },
      {
        path: 'schedule',
        element: <Schedule />,
      },
      {
        path: 'attendance',
        element: <Attendance />,
      },
      {
        path: 'notices',
        element: <Notices />,
      },
      {
        path: 'notices/:noticeId',
        element: <Notices />,
      },
      {
        path: 'placements',
        element: <Placements />,
      },
      {
        path: 'policies',
        element: <Policies />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
