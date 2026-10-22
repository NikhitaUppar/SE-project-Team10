import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import CampaignCard from '../components/campaign/CampaignCard';

const CATEGORIES = [
  'All',
  'Healthcare',
  'Education',
  'Relief',
  'Animals',
  'Community',
  'Environment',
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 1,
  });

  const fetchCampaigns = useCallback(async (cat, p, q) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: p,
        limit: 9,
      };

      if (cat && cat !== 'All') {
        params.category = cat;
      }

      if (q && q.trim()) {
        params.search = q.trim();
      }

      const res = await api.get('/campaigns', { params });

      // Support both { campaigns: [...], pagination: {...} } and direct array responses
      if (res.data?.campaigns) {
        setCampaigns(res.data.campaigns);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      } else if (Array.isArray(res.data)) {
        setCampaigns(res.data);
        setPagination({
          page: p,
          limit: 9,
          total: res.data.length,
          totalPages: Math.max(1, Math.ceil(res.data.length / 9)),
        });
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
      setError(err.response?.data?.error || 'Unable to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns(selectedCategory, page, searchQuery);
  }, [selectedCategory, page, fetchCampaigns]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCampaigns(selectedCategory, 1, searchQuery);
  };

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setPage(1);
    fetchCampaigns('All', 1, '');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="text-indigo-600 font-semibold tracking-wide uppercase text-xs px-3 py-1 bg-indigo-50 rounded-full inline-block mb-3">
          Micro-Donation Platform
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Explore Active Campaigns
        </h1>
        <p className="mt-3 text-base sm:text-lg text-gray-500">
          Make a real difference with micro-donations between ?1 and ?500. Support verified causes and track their live progress.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Category Filter Pills (FR-17) */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Campaign Categories">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 scale-102'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  role="tab"
                  aria-selected={isActive}
                  id={`filter-${category.toLowerCase()}`}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative min-w-[240px] sm:min-w-[280px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full pl-10 pr-10 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              id="search-campaigns-input"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3.5 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                  fetchCampaigns(selectedCategory, 1, '');
                }}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-sm"
                title="Clear search"
              >
                &times;
              </button>
            )}
          </form>
        </div>

        {/* Active Filter Summary Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
          <span>
            Showing <strong className="text-gray-800">{pagination.total}</strong> active {pagination.total === 1 ? 'campaign' : 'campaigns'}
            {selectedCategory !== 'All' && (
              <> in <span className="font-semibold text-indigo-600">{selectedCategory}</span></>
            )}
            {searchQuery && (
              <> matching &ldquo;{searchQuery}&rdquo;</>
            )}
          </span>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchCampaigns(selectedCategory, page, searchQuery)}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-5 space-y-4">
                <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full"></div>
                  <div className="h-9 bg-gray-200 rounded-lg mt-2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center max-w-xl mx-auto my-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No Active Campaigns Found</h3>
          <p className="text-sm text-gray-500 mb-6">
            {selectedCategory !== 'All'
              ? `There are currently no active campaigns in the "${selectedCategory}" category.`
              : 'There are currently no active campaigns to display.'}
          </p>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        /* Campaign Card Grid (FR-16) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              page === 1
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            &larr; Previous
          </button>

          <div className="flex items-center gap-1">
            {[...Array(pagination.totalPages)].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors ${
                    page === p
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            disabled={page === pagination.totalPages}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              page === pagination.totalPages
                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
