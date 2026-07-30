import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, UserCheck, Bell, Briefcase, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { scheduleService } from '../services/scheduleService';
import { attendanceService } from '../services/attendanceService';
import { noticeService } from '../services/noticeService';
import { placementService } from '../services/placementService';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [notices, setNotices] = useState([]);
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scheduleData, attendanceData, noticesData, placementsData] = await Promise.all([
          scheduleService.getTodaySchedule(),
          attendanceService.getOverallAttendance(),
          noticeService.getNotices(),
          placementService.getPlacements(),
        ]);
        setTodaySchedule(scheduleData);
        setAttendance(attendanceData);
        setNotices(noticesData.slice(0, 3));
        setPlacements(placementsData.slice(0, 2));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const suggestions = [
    { text: 'When is my next class?', icon: Clock },
    { text: 'Show latest university notices', icon: Bell },
    { text: 'What is my attendance?', icon: UserCheck },
    { text: 'Tell me about upcoming placement drives', icon: Briefcase },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-64" />
          <LoadingSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {getGreeting()}, Student
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's what's happening on campus today.
        </p>
      </div>

      {/* AI Input */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Ask anything about your university..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Link to="/chat">
                <Button className="absolute right-2 top-1/2 -translate-y-1/2">
                  Ask
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Link
                  key={index}
                  to="/chat"
                  state={{ initialMessage: suggestion.text }}
                >
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <suggestion.icon className="w-4 h-4" />
                    {suggestion.text}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaySchedule.length > 0 ? (
              <div className="space-y-3">
                {todaySchedule.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[70px]">
                      {item.time}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {item.course}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {item.room}
                      </div>
                    </div>
                  </div>
                ))}
                <Link to="/schedule">
                  <Button variant="ghost" size="sm" className="w-full mt-2">
                    View full schedule
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No classes scheduled for today
              </p>
            )}
          </CardContent>
        </Card>

        {/* Attendance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary-600" />
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendance && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {attendance.percentage}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Overall Attendance
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Data Structures</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">86%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cloud Computing</span>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">79%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Artificial Intelligence</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">84%</span>
                  </div>
                </div>
                <Link to="/attendance">
                  <Button variant="ghost" size="sm" className="w-full">
                    View details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Notices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-600" />
              Latest Notices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notices.map((notice) => (
                <div key={notice.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full">
                      {notice.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {notice.date}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                    {notice.title}
                  </div>
                </div>
              ))}
              <Link to="/notices">
                <Button variant="ghost" size="sm" className="w-full mt-2">
                  View all notices
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">AI Assignment</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">2 Aug</div>
                </div>
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Cloud Computing Quiz</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">5 Aug</div>
                </div>
                <AlertCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Placement Registration</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">7 Aug</div>
                </div>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Placement Update */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              Placement Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            {placements.length > 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-lg border border-primary-200 dark:border-primary-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                      New placement drive available
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Deadline: 8 Aug
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {placements[0].company}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {placements[0].role}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {placements[0].package}
                    </span>
                    <Link to="/placements">
                      <Button size="sm">Apply Now</Button>
                    </Link>
                  </div>
                </div>
                <Link to="/placements">
                  <Button variant="ghost" size="sm" className="w-full">
                    View all placements
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
