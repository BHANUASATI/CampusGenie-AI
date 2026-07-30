import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  BookOpen, 
  Calendar, 
  UserCheck, 
  Bell, 
  Briefcase, 
  FileText,
  Bookmark,
  Clock,
  HelpCircle,
  Settings,
  User,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/cn';
import { useState } from 'react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Ask CampusGenie', href: '/chat', icon: MessageSquare },
  { name: 'Academics', href: '/academics', icon: BookOpen },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Attendance', href: '/attendance', icon: UserCheck },
  { name: 'Notices', href: '/notices', icon: Bell },
  { name: 'Placements', href: '/placements', icon: Briefcase },
  { name: 'University Policies', href: '/policies', icon: FileText },
];

const secondaryNavigation = [
  { name: 'Saved', href: '/saved', icon: Bookmark },
  { name: 'Recent Chats', href: '/chat?recent=true', icon: Clock },
];

const bottomNavigation = [
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                CampusGenie
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI for Smarter Learning
              </p>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-3 mb-6">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Main
              </p>
              <ul className="space-y-1">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        isActive(item.href)
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="px-3 mb-6">
              <p className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Secondary
              </p>
              <ul className="space-y-1">
                {secondaryNavigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        isActive(item.href)
                          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                      )}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <ul className="space-y-1 mb-4">
              {bottomNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 mr-3" />
              ) : (
                <Sun className="w-5 h-5 mr-3" />
              )}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>

            {/* User Profile */}
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center px-3 py-2 mt-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <User className="w-5 h-5 mr-3" />
              User Profile
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
