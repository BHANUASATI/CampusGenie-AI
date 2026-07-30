import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, BookOpen, Clock, User, GraduationCap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { academicService } from '../services/academicService';

const Academics = () => {
  const { courseId } = useParams();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (courseId && courses.length > 0) {
      const course = courses.find((c) => c.id === courseId);
      setSelectedCourse(course);
    }
  }, [courseId, courses]);

  useEffect(() => {
    const filtered = courses.filter(
      (course) =>
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.faculty.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredCourses(filtered);
  }, [searchQuery, courses]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await academicService.getCourses();
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <LoadingSkeleton className="h-64" />
        <LoadingSkeleton className="h-64" />
        <LoadingSkeleton className="h-64" />
      </div>
    );
  }

  if (selectedCourse) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedCourse(null)}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          ← Back to all courses
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{selectedCourse.name}</CardTitle>
            <p className="text-gray-600 dark:text-gray-400">{selectedCourse.code}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Faculty</div>
                    <div className="font-medium">{selectedCourse.faculty}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Credits</div>
                    <div className="font-medium">{selectedCourse.credits}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Schedule</div>
                    <div className="font-medium">{selectedCourse.schedule}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Attendance</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">{selectedCourse.attendance}%</div>
                    <span className="text-sm px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full">
                      {selectedCourse.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Resources</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedCourse.resources.map((resource, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-600 dark:text-gray-400">{selectedCourse.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Academics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Current Semester Courses</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card
            key={course.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedCourse(course)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{course.name}</span>
                <span className="text-sm font-normal text-gray-500">{course.code}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  {course.faculty}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {course.schedule}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Attendance:</div>
                    <div className="font-semibold">{course.attendance}%</div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      course.attendance >= 80
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : course.attendance >= 75
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    }`}
                  >
                    {course.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Academics;
