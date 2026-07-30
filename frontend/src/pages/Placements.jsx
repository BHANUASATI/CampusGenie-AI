import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Search, MapPin, Clock, DollarSign, MessageSquare, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import { placementService } from '../services/placementService';

const statuses = ['All', 'Open', 'Closing Soon', 'Upcoming'];

const Placements = () => {
  const [placements, setPlacements] = useState([]);
  const [filteredPlacements, setFilteredPlacements] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlacements();
  }, []);

  useEffect(() => {
    let filtered = placements;

    if (selectedStatus !== 'All') {
      filtered = filtered.filter((placement) => placement.status === selectedStatus);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (placement) =>
          placement.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          placement.role.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPlacements(filtered);
  }, [selectedStatus, searchQuery, placements]);

  const loadPlacements = async () => {
    setLoading(true);
    try {
      const data = await placementService.getPlacements();
      setPlacements(data);
      setFilteredPlacements(data);
    } catch (error) {
      console.error('Error loading placements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Open: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'Closing Soon': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      Upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton className="h-48" />
          <LoadingSkeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Placements</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Career opportunities and placement drives</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search placements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStatus === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Placement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPlacements.map((placement) => (
          <Card key={placement.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{placement.company}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{placement.role}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(placement.status)}`}>
                  {placement.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">{placement.package}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  Deadline: {placement.deadline}
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Requirements:</div>
                  <div className="flex flex-wrap gap-2">
                    {placement.requirements.map((req, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-700 dark:text-gray-300"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-3">
                  <Button className="flex-1">Apply Now</Button>
                  <Link to="/chat" state={{ initialMessage: `Check my eligibility for ${placement.company} placement` }}>
                    <Button variant="outline" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Check Eligibility
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPlacements.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No placements found</p>
        </div>
      )}
    </div>
  );
};

export default Placements;
