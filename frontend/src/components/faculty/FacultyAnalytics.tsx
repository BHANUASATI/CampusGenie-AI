import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  BookOpen, 
  Award, 
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Download,
  Filter
} from 'lucide-react';

interface FacultyAnalyticsProps {
  theme: 'dark' | 'light';
}

interface AnalyticsData {
  studentSatisfaction: number;
  averageGrade: number;
  assignmentCompletion: number;
  officeHourAttendance: number;
  gradeDistribution: { range: string; count: number; percentage: number }[];
  coursePerformance: { course: string; average: number; completion: number; satisfaction: number }[];
  weeklyActivity: { week: string; hours: number; students: number; assignments: number }[];
  topPerformers: { name: string; grade: number; attendance: number; assignments: number }[];
  atRiskStudents: { name: string; grade: number; attendance: number; missedAssignments: number }[];
}

export const FacultyAnalytics: React.FC<FacultyAnalyticsProps> = ({ theme }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'semester'>('semester');
  const [selectedCourse, setSelectedCourse] = useState('all');

  // Mock analytics data
  const analyticsData: AnalyticsData = {
    studentSatisfaction: 4.5,
    averageGrade: 78,
    assignmentCompletion: 92,
    officeHourAttendance: 65,
    gradeDistribution: [
      { range: 'A (90-100)', count: 15, percentage: 25 },
      { range: 'B (80-89)', count: 22, percentage: 37 },
      { range: 'C (70-79)', count: 15, percentage: 25 },
      { range: 'D (60-69)', count: 6, percentage: 10 },
      { range: 'F (0-59)', count: 2, percentage: 3 }
    ],
    coursePerformance: [
      { course: 'Data Structures', average: 82, completion: 95, satisfaction: 4.6 },
      { course: 'Machine Learning', average: 76, completion: 88, satisfaction: 4.4 },
      { course: 'Algorithms', average: 79, completion: 91, satisfaction: 4.5 }
    ],
    weeklyActivity: [
      { week: 'Week 1', hours: 12, students: 45, assignments: 3 },
      { week: 'Week 2', hours: 15, students: 43, assignments: 5 },
      { week: 'Week 3', hours: 18, students: 44, assignments: 4 },
      { week: 'Week 4', hours: 14, students: 42, assignments: 6 },
      { week: 'Week 5', hours: 20, students: 45, assignments: 4 },
      { week: 'Week 6', hours: 16, students: 43, assignments: 5 },
      { week: 'Week 7', hours: 22, students: 44, assignments: 3 },
      { week: 'Week 8', hours: 19, students: 45, assignments: 4 }
    ],
    topPerformers: [
      { name: 'Sarah Johnson', grade: 95, attendance: 98, assignments: 100 },
      { name: 'Michael Chen', grade: 93, attendance: 95, assignments: 100 },
      { name: 'Emily Davis', grade: 91, attendance: 92, assignments: 95 }
    ],
    atRiskStudents: [
      { name: 'John Smith', grade: 58, attendance: 65, missedAssignments: 3 },
      { name: 'Lisa Brown', grade: 62, attendance: 70, missedAssignments: 2 },
      { name: 'David Wilson', grade: 55, attendance: 60, missedAssignments: 4 }
    ]
  };

  const StatCard = ({ 
    icon: Icon, 
    value, 
    label, 
    change, 
    positive, 
    color 
  }: { 
    icon: any; 
    value: string | number; 
    label: string; 
    change: string; 
    positive: boolean; 
    color: string; 
  }) => (
    <div className={`p-6 rounded-xl bg-gradient-to-br ${color} text-white relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
      <div className="relative z-10">
        <Icon className="w-8 h-8 mb-4 opacity-80" />
        <div className="text-3xl font-bold mb-2">{value}</div>
        <div className="text-sm opacity-90 mb-1">{label}</div>
        <div className="flex items-center gap-1 text-xs opacity-75">
          {positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {change}
        </div>
      </div>
    </div>
  );

  const SimpleBarChart = ({ data, label, color }: { data: number[]; label: string; color: string }) => {
    const max = Math.max(...data);
    return (
      <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-4`}>{label}</h3>
        <div className="flex items-end justify-between h-40 gap-2">
          {data.map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-full rounded-t-lg transition-all duration-300 ${color}`}
                style={{ height: `${(value / max) * 100}%` }}
              />
              <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SimpleLineChart = ({ data, label }: { data: { label: string; value: number }[]; label: string }) => {
    const max = Math.max(...data.map(d => d.value));
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.value / max) * 100);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-4`}>{label}</h3>
        <div className="h-40 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polyline
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              points={points}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex justify-between mt-2">
            {data.map((d, i) => (
              <div key={i} className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {d.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 shadow-md`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Teaching Analytics</h2>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Comprehensive insights on your teaching performance
            </p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="semester">This Semester</option>
            </select>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-black'
              }`}
            >
              <option value="all">All Courses</option>
              <option value="CS301">Data Structures</option>
              <option value="CS401">Machine Learning</option>
              <option value="CS501">Algorithms</option>
            </select>
            <button className={`px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors flex items-center gap-2`}>
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          value={`${analyticsData.studentSatisfaction}/5`}
          label="Student Satisfaction"
          change="+0.3 this semester"
          positive={true}
          color="from-green-500 to-emerald-600"
        />
        <StatCard
          icon={Target}
          value={`${analyticsData.averageGrade}%`}
          label="Average Grade"
          change="+5% improvement"
          positive={true}
          color="from-blue-500 to-indigo-600"
        />
        <StatCard
          icon={CheckCircle}
          value={`${analyticsData.assignmentCompletion}%`}
          label="Assignment Completion"
          change="+8% improvement"
          positive={true}
          color="from-purple-500 to-pink-600"
        />
        <StatCard
          icon={Clock}
          value={`${analyticsData.officeHourAttendance}%`}
          label="Office Hour Attendance"
          change="+12% increase"
          positive={true}
          color="from-orange-500 to-red-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleBarChart
          data={analyticsData.weeklyActivity.map(w => w.hours)}
          label="Weekly Teaching Hours"
          color="bg-gradient-to-t from-blue-500 to-indigo-500"
        />
        <SimpleLineChart
          data={analyticsData.weeklyActivity.map(w => ({ label: w.week, value: w.students }))}
          label="Student Engagement Over Time"
        />
      </div>

      {/* Grade Distribution */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-6`}>Grade Distribution</h3>
        <div className="space-y-4">
          {analyticsData.gradeDistribution.map((grade) => (
            <div key={grade.range} className="flex items-center gap-4">
              <div className={`w-32 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {grade.range}
              </div>
              <div className="flex-1">
                <div className={`h-4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                  <div 
                    className={`h-full rounded-full ${
                      grade.range.startsWith('A') ? 'bg-green-500' :
                      grade.range.startsWith('B') ? 'bg-blue-500' :
                      grade.range.startsWith('C') ? 'bg-yellow-500' :
                      grade.range.startsWith('D') ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${grade.percentage}%` }}
                  />
                </div>
              </div>
              <div className={`w-20 text-right text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {grade.count} students
              </div>
              <div className={`w-16 text-right text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {grade.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Performance */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'} mb-6`}>Course Performance Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} border-b`}>
                <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Course</th>
                <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Average Grade</th>
                <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Completion Rate</th>
                <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Satisfaction</th>
                <th className={`text-left py-3 px-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {analyticsData.coursePerformance.map((course, index) => (
                <tr key={index} className={`${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-50'} border-b`}>
                  <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{course.course}</td>
                  <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    <span className={`font-medium ${course.average >= 80 ? 'text-green-600' : course.average >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {course.average}%
                    </span>
                  </td>
                  <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{course.completion}%</td>
                  <td className={`py-4 px-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      {course.satisfaction}/5
                    </div>
                  </td>
                  <td className={`py-4 px-4`}>
                    <div className="flex items-center gap-1 text-green-600">
                      <ArrowUp className="w-4 h-4" />
                      <span className="text-sm">+5%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Award className="w-5 h-5 text-green-500" />
            </div>
            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Top Performers</h3>
          </div>
          <div className="space-y-4">
            {analyticsData.topPerformers.map((student, index) => (
              <div key={index} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}">{student.name}</div>
                  <div className="text-green-600 font-bold">{student.grade}%</div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    {student.attendance}% attendance
                  </div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <BookOpen className="w-3 h-3 inline mr-1" />
                    {student.assignments}% assignments
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>At-Risk Students</h3>
          </div>
          <div className="space-y-4">
            {analyticsData.atRiskStudents.map((student, index) => (
              <div key={index} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}">{student.name}</div>
                  <div className="text-red-600 font-bold">{student.grade}%</div>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <Users className="w-3 h-3 inline mr-1" />
                    {student.attendance}% attendance
                  </div>
                  <div className="text-red-600">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {student.missedAssignments} missed
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Goals */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>Performance Goals</h3>
          </div>
          <button className={`px-4 py-2 text-sm rounded-lg ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors`}>
            Set New Goals
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { goal: 'Student Satisfaction >= 4.5', current: 4.5, target: 4.5, achieved: true },
            { goal: 'Average Grade >= 75%', current: 78, target: 75, achieved: true },
            { goal: 'Assignment Completion >= 90%', current: 92, target: 90, achieved: true },
            { goal: 'Office Hour Attendance >= 70%', current: 65, target: 70, achieved: false },
            { goal: 'Research Publications >= 2', current: 1, target: 2, achieved: false },
            { goal: 'Course Feedback >= 4.3', current: 4.5, target: 4.3, achieved: true }
          ].map((goal, index) => (
            <div key={index} className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-3">
                {goal.achieved ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  {goal.goal}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className={`h-2 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full rounded-full ${goal.achieved ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {goal.current}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};