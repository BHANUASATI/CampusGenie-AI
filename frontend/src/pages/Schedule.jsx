import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { scheduleService } from '../services/scheduleService';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

const Schedule = () => {
  const [selectedDay, setSelectedDay] = useState(today);
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await scheduleService.getWeeklySchedule();
      setWeeklySchedule(data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton className="h-96 w-full" />;
  }

  const daySchedule = weeklySchedule?.[selectedDay] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Weekly Timetable</p>
      </div>

      {/* Day Selector */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedDay === day
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule for selected day */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            {selectedDay}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {daySchedule.length > 0 ? (
            <div className="space-y-4">
              {daySchedule.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="text-center min-w-[80px]">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {item.time}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {item.endTime}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {item.course}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.courseCode}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {item.faculty}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {item.room}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.type === 'Lab'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No classes scheduled for {selectedDay}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Schedule;
