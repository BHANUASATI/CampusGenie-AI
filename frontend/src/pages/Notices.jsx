import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, Bell, Calendar, Tag, FileText, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { noticeService } from '../services/noticeService';

const categories = ['All', 'Academic', 'Examination', 'Placement', 'Events', 'Administration'];

const Notices = () => {
  const { noticeId } = useParams();
  const [notices, setNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    if (noticeId && notices.length > 0) {
      const notice = notices.find((n) => n.id === parseInt(noticeId));
      setSelectedNotice(notice);
    }
  }, [noticeId, notices]);

  useEffect(() => {
    let filtered = notices;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((notice) => notice.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (notice) =>
          notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          notice.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredNotices(filtered);
  }, [selectedCategory, searchQuery, notices]);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const data = await noticeService.getNotices();
      setNotices(data);
      setFilteredNotices(data);
    } catch (error) {
      console.error('Error loading notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Academic: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      Examination: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      Placement: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      Events: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      Administration: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (selectedNotice) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedNotice(null)}
          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          ← Back to all notices
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedNotice.category)}`}>
                {selectedNotice.category}
              </span>
              {selectedNotice.hasAttachment && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <FileText className="w-3 h-3" />
                  Attachment
                </span>
              )}
            </div>
            <CardTitle className="text-2xl">{selectedNotice.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-2">
              <Calendar className="w-4 h-4" />
              {selectedNotice.date}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {selectedNotice.description}
            </p>
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link to="/chat" state={{ initialMessage: `Tell me more about ${selectedNotice.title}` }}>
                <Button variant="outline" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Ask CampusGenie about this notice
                </Button>
              </Link>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notices</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">University announcements and updates</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search notices..."
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

      {/* Notices List */}
      <div className="space-y-4">
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => (
            <Card
              key={notice.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedNotice(notice)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(notice.category)}`}>
                        {notice.category}
                      </span>
                      {notice.hasAttachment && (
                        <FileText className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {notice.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {notice.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    <Calendar className="w-3 h-3" />
                    {notice.date}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notices found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notices;
