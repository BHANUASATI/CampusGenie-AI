import { User, Mail, Phone, MapPin, Calendar, GraduationCap, Edit } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';

const Profile = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your profile</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Student Name</h2>
              <p className="text-gray-600 dark:text-gray-400">MCA - Semester 4</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Full Name</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Student Name</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Email</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">2501560014@krmu.edu.in</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Phone</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">+91 7354336191</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Program</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Master of Computer Applications</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Semester</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">4th Semester</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Student ID</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">2501560014</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">7.8</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Current CGPA</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">82%</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overall Attendance</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">24</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Credits Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
