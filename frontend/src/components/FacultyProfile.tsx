import React, { useState, useEffect } from 'react';
import { 

  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Camera, 
  Save, 
  X, 
  Upload,
  Award,
  BookOpen,
  Users,
  Clock,
  Star,
  CheckCircle,
  Briefcase,
  GraduationCap,
  Globe,
  Building
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8002';

interface FacultyProfile {
  id: number;
  user_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  specialization?: string;
  bio?: string;
  office_location?: string;
  office_hours?: string;
  profile_image?: string;
  join_date?: string;
  experience_years?: number;
  qualifications?: string[];
  research_interests?: string[];
  achievements?: string[];
  social_links?: {
    linkedin?: string;
    google_scholar?: string;
    website?: string;
  };
}

interface FacultyProfileProps {
  facultyData?: any;
}

const FacultyProfile: React.FC<FacultyProfileProps> = ({ facultyData }) => {
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [editForm, setEditForm] = useState({
    phone: '',
    bio: '',
    office_location: '',
    office_hours: '',
    specialization: '',
    linkedin: '',
    google_scholar: '',
    website: ''
  });

  useEffect(() => {
    if (facultyData) {
      // Use the real faculty data passed from parent
      setProfile(facultyData);
      setEditForm({
        phone: facultyData.phone || '',
        bio: facultyData.bio || '',
        office_location: facultyData.office_location || '',
        office_hours: facultyData.office_hours || '',
        specialization: facultyData.specialization || '',
        linkedin: facultyData.social_links?.linkedin || '',
        google_scholar: facultyData.social_links?.google_scholar || '',
        website: facultyData.social_links?.website || ''
      });
      setLoading(false);
    } else {
      // Fetch profile if no data passed (fallback)
      fetchProfile();
    }
  }, [facultyData]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Try to get faculty profile from simple endpoint first
      const response = await fetch(API_BASE_URL + '/faculty/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
        setEditForm({
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          office_location: profileData.office_location || '',
          office_hours: profileData.office_hours || '',
          specialization: profileData.specialization || '',
          linkedin: profileData.social_links?.linkedin || '',
          google_scholar: profileData.social_links?.google_scholar || '',
          website: profileData.social_links?.website || ''
        });
      } else {
        console.error('Failed to fetch profile');
        // Set mock data for demo
        setMockProfile();
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMockProfile();
    } finally {
      setLoading(false);
    }
  };

  const setMockProfile = () => {
    setProfile({
      id: 1,
      user_id: 45,
      employee_id: "STAFF001",
      first_name: "Sarah",
      last_name: "Johnson",
      email: "staff@university.edu.in",
      phone: "+1 (555) 123-4567",
      department: "Computer Science",
      designation: "Professor",
      specialization: "Artificial Intelligence & Machine Learning",
      bio: "Passionate educator with over 10 years of experience in teaching computer science and conducting research in AI.",
      office_location: "Room 301, Computer Science Building",
      office_hours: "Mon-Wed: 10:00 AM - 12:00 PM, Thu: 2:00 PM - 4:00 PM",
      profile_image: "",
      join_date: "2015-08-15",
      experience_years: 10,
      qualifications: ["Ph.D. in Computer Science", "M.Tech. in AI", "B.E. in Computer Science"],
      research_interests: ["Machine Learning", "Natural Language Processing", "Computer Vision"],
      achievements: [
        "Best Faculty Award 2022",
        "Published 25+ research papers",
        "Supervised 15+ graduate students"
      ],
      social_links: {
        linkedin: "https://linkedin.com/in/sarahjohnson",
        google_scholar: "https://scholar.google.com/citations?user=sarahjohnson",
        website: "https://sarahjohnson.university.edu"
      }
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(API_BASE_URL + '/faculty/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setIsEditing(false);
      } else {
        console.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await fetch(API_BASE_URL + '/faculty/upload-profile-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (profile) {
          setProfile({
            ...profile,
            profile_image: result.profile_image
          });
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and professional details</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-white p-1">
                {profile.profile_image ? (
                  <img 
                    src={profile.profile_image} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              
              {/* Upload Button */}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-100 transition-colors">
                {uploadingImage ? (
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                ) : (
                  <Camera className="w-4 h-4 text-gray-600" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Basic Info */}
            <div className="flex-1 text-white">
              <div className="mb-4">
                <h2 className="text-3xl font-bold mb-2">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-xl opacity-90">{profile.designation}</p>
                <p className="text-lg opacity-80 mt-1">{profile.department}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{profile.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{profile.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span className="text-sm">{profile.office_location || 'Not specified'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Joined {profile.join_date || 'Unknown'}</span>
                </div>
              </div>

              <div className="mt-6 flex space-x-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{profile.experience_years || 0}</span>
            </div>
            <p className="text-sm opacity-90">Years Experience</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{profile.qualifications?.length || 0}</span>
            </div>
            <p className="text-sm opacity-90">Qualifications</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Star className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{profile.achievements?.length || 0}</span>
            </div>
            <p className="text-sm opacity-90">Achievements</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">15+</span>
            </div>
            <p className="text-sm opacity-90">Students Mentored</p>
          </div>
        </div>

        {/* Detailed Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* About Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-blue-600" />
              About Me
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {profile.bio || 'No bio provided yet.'}
            </p>

            {profile.specialization && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-2">Specialization</h4>
                <p className="text-gray-700">{profile.specialization}</p>
              </div>
            )}

            {profile.office_hours && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-green-600" />
                  Office Hours
                </h4>
                <p className="text-gray-700">{profile.office_hours}</p>
              </div>
            )}
          </div>

          {/* Qualifications */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-purple-600" />
              Qualifications
            </h3>
            <ul className="space-y-3">
              {profile.qualifications?.map((qual, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{qual}</span>
                </li>
              )) || <li className="text-gray-500">No qualifications listed</li>}
            </ul>
          </div>

          {/* Research Interests */}
          {profile.research_interests && profile.research_interests.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Research Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.research_interests.map((interest, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Achievements */}
          {profile.achievements && profile.achievements.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-600" />
                Achievements
              </h3>
              <ul className="space-y-3">
                {profile.achievements.map((achievement, index) => (
                  <li key={index} className="flex items-start">
                    <Star className="w-5 h-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social Links */}
          {profile.social_links && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-blue-600" />
                Professional Links
              </h3>
              <div className="space-y-3">
                {profile.social_links.linkedin && (
                  <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800">
                    <Briefcase className="w-4 h-4 mr-2" />
                    LinkedIn Profile
                  </a>
                )}
                {profile.social_links.google_scholar && (
                  <a href={profile.social_links.google_scholar} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Google Scholar
                  </a>
                )}
                {profile.social_links.website && (
                  <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800">
                    <Globe className="w-4 h-4 mr-2" />
                    Personal Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Edit Profile</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Office Location</label>
                  <input
                    type="text"
                    value={editForm.office_location}
                    onChange={(e) => setEditForm({...editForm, office_location: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Room 301, Computer Science Building"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Office Hours</label>
                  <input
                    type="text"
                    value={editForm.office_hours}
                    onChange={(e) => setEditForm({...editForm, office_hours: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mon-Wed: 10:00 AM - 12:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({...editForm, specialization: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Artificial Intelligence & Machine Learning"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn Profile</label>
                  <input
                    type="url"
                    value={editForm.linkedin}
                    onChange={(e) => setEditForm({...editForm, linkedin: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Google Scholar</label>
                  <input
                    type="url"
                    value={editForm.google_scholar}
                    onChange={(e) => setEditForm({...editForm, google_scholar: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://scholar.google.com/yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personal Website</label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) => setEditForm({...editForm, website: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-8">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyProfile;
