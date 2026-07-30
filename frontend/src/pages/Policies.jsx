import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Calendar, Tag, MessageSquare, BookOpen, Shield, Home, Library, Briefcase, Gavel, UserCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { policyService } from '../services/policyService';

const categories = ['All', 'Academic Regulations', 'Attendance', 'Examinations', 'Anti-Ragging', 'Hostel', 'Library', 'Placement', 'Code of Conduct'];

const iconMap = {
  'BookOpen': BookOpen,
  'UserCheck': UserCheck,
  'FileText': FileText,
  'Shield': Shield,
  'Home': Home,
  'Library': Library,
  'Briefcase': Briefcase,
  'Gavel': Gavel,
};

const Policies = () => {
  const [policies, setPolicies] = useState([]);
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    let filtered = policies;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((policy) => policy.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (policy) =>
          policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          policy.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPolicies(filtered);
  }, [selectedCategory, searchQuery, policies]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await policyService.getPolicies();
      setPolicies(data);
      setFilteredPolicies(data);
    } catch (error) {
      console.error('Error loading policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Academic Regulations': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'Attendance': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Examinations': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'Anti-Ragging': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      'Hostel': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'Library': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
      'Placement': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
      'Code of Conduct': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">University Policies</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Academic regulations and university guidelines</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolicies.map((policy) => {
          const Icon = iconMap[policy.icon] || FileText;
          return (
            <Card key={policy.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-1">{policy.title}</CardTitle>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getCategoryColor(policy.category)}`}>
                      {policy.category}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                  {policy.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <Calendar className="w-3 h-3" />
                  Updated: {policy.lastUpdated}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View
                  </Button>
                  <Link to="/chat" state={{ initialMessage: `Explain the important points from the ${policy.title}` }}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      Ask AI
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPolicies.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No policies found</p>
        </div>
      )}
    </div>
  );
};

export default Policies;
