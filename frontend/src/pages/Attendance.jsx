import { useState, useEffect } from 'react';
import { UserCheck, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { attendanceService } from '../services/attendanceService';

const Attendance = () => {
  const [overall, setOverall] = useState(null);
  const [byCourse, setByCourse] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [overallData, courseData] = await Promise.all([
        attendanceService.getOverallAttendance(),
        attendanceService.getAttendanceByCourse(),
      ]);
      setOverall(overallData);
      setByCourse(courseData);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Excellent':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Good Standing':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Attention Required':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 85) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Attendance</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Track your class attendance</p>
      </div>

      {/* Overall Attendance */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Overall Attendance</div>
              <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {overall?.percentage}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {overall?.attendedClasses} / {overall?.totalClasses} classes attended
              </div>
            </div>
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${overall?.percentage * 3.52} 352`}
                  className={getStatusColor(overall?.percentage)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <UserCheck className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course-wise Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {byCourse.map((course) => (
          <Card key={course.courseId}>
            <CardHeader>
              <CardTitle className="text-lg">{course.courseName}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">{course.courseId}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {course.attended} / {course.total} classes
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {course.percentage}%
                    </span>
                    {getStatusIcon(course.status)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getStatusColor(course.percentage)}`}
                    style={{ width: `${course.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {course.status}
                  </span>
                  {course.percentage < 75 && (
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      Below required 75%
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Attendance;
