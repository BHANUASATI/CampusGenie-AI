import { useState } from 'react';
import { User, Bell, Moon, Sun, Shield, Lock, Globe, LogOut } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-gray-100">Student Name</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">MCA - Semester 4</div>
              <div className="text-sm text-gray-500 dark:text-gray-500">Student ID: 2501560014</div>
            </div>
          </div>
          <Button variant="outline">Edit Profile</Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'light' ? (
              <Sun className="w-5 h-5 text-primary-600" />
            ) : (
              <Moon className="w-5 h-5 text-primary-600" />
            )}
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Switch between light and dark theme
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications for important updates
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">Email Updates</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Receive weekly summary via email
              </div>
            </div>
            <button
              onClick={() => setEmailUpdates(!emailUpdates)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                emailUpdates ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  emailUpdates ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <Lock className="w-4 h-4 mr-2" />
            Change Password
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Globe className="w-4 h-4 mr-2" />
            Privacy Settings
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="p-6">
          <Button variant="danger" className="w-full flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
