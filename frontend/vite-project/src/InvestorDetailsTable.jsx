import React, { useState, useEffect } from 'react';
import { useApi } from './apiHooks';
import { API_BASE_URL } from './apiConfig';
import { Spinner, ErrorMessage } from './UIComponents';
import { Users, X, Download, RefreshCw, Search, Filter } from 'lucide-react';

const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { 
  style: 'currency', 
  currency: 'USD' 
}).format(amount);

const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { 
  day: 'numeric', 
  month: 'short', 
  year: 'numeric' 
});

export const InvestorDetailsModal = ({ poolId, poolName, isOpen, onClose }) => {
  const { get, loading, error } = useApi();
  const [investors, setInvestors] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [hasDataLoaded, setHasDataLoaded] = useState(false);

  // Auto-fetch data when modal opens
  useEffect(() => {
    if (isOpen && poolId && !hasDataLoaded) {
      handleFetchDetails();
    }
  }, [isOpen, poolId]);

  const handleFetchDetails = async () => {
    try {
      const result = await get(`${API_BASE_URL}/${poolId}/investordetails`);
      if (result.success) {
        setInvestors(result.data);
        setHasDataLoaded(true);
      }
    } catch (err) {
      console.error("Failed to fetch investor details:", err);
    }
  };

  const handleRefresh = () => {
    setInvestors(null);
    setHasDataLoaded(false);
    handleFetchDetails();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSortBy('name');
    setSortOrder('asc');
    onClose();
  };

  // Filter and sort investors
  const filteredAndSortedInvestors = React.useMemo(() => {
    if (!investors) return [];
    
    let filtered = investors.filter(investor =>
      investor.personName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      investor.mobileNumber?.includes(searchTerm)
    );

    return filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.personName?.toLowerCase() || '';
          bVal = b.personName?.toLowerCase() || '';
          break;
        case 'amount':
          aVal = a.amount || 0;
          bVal = b.amount || 0;
          break;
        case 'mobile':
          aVal = a.mobileNumber || '';
          bVal = b.mobileNumber || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [investors, searchTerm, sortBy, sortOrder]);

  const totalAmount = investors?.reduce((sum, investor) => sum + (investor.amount || 0), 0) || 0;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const exportToCSV = () => {
    if (!investors?.length) return;
    
    const headers = ['Name', 'Amount', 'Mobile Number'];
    const csvContent = [
      headers.join(','),
      ...investors.map(investor => [
        `"${investor.personName || ''}"`,
        investor.amount || 0,
        `"${investor.mobileNumber || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investors-${poolName || poolId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Investor Details
              </h2>
              {poolName && (
                <p className="text-lg text-gray-500">Pool Name: {poolName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <ErrorMessage message={error} onRetry={handleFetchDetails} />
            </div>
          ) : loading && !investors ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Spinner />
                <p className="mt-2 text-gray-600">Loading investor details...</p>
              </div>
            </div>
          ) : investors ? (
            <>
              {/* Controls Bar */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setSortBy(field);
                          setSortOrder(order);
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                        <option value="amount-desc">Amount High-Low</option>
                        <option value="amount-asc">Amount Low-High</option>
                     
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRefresh}
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    
                   
                  </div>
                </div>

                {/* Summary */}
                {investors?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>
                      <strong>{filteredAndSortedInvestors.length}</strong> of <strong>{investors.length}</strong> investors
                    </span>
                    <span>
                      Total Investment: <strong className="text-green-600">{formatCurrency(totalAmount)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                {filteredAndSortedInvestors.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No investors match your search criteria.' : 'No investors found for this pool.'}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {sortBy === 'name' && (
                              <span className="text-indigo-600">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('amount')}
                        >
                          <div className="flex items-center gap-1">
                            Amount
                            {sortBy === 'amount' && (
                              <span className="text-indigo-600">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('mobile')}
                        >
                          <div className="flex items-center gap-1">
                            Mobile Number
                            
                          </div>
                       
                        </th>
                          <th>
                            <div className="flex items-center gap-1">
                            Initial Amount
                          </div>
                            </th> 
                          <th>
                              <div className="flex items-center gap-1">
                            Password
                          </div> </th>  
                          
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedInvestors.map((person, index) => (
                        <tr 
                          key={person._id || index} 
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-indigo-600">
                                  {person.personName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                {person.personName || 'N/A'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(person.amount || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {person.mobileNumber || 'N/A'}
                            </div>
                          </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-green-600">
                              {formatCurrency(person.initialAmount || 0)}
                            </div>
                          </td>
                          <td>
                               <div className="text-sm font-semibold text-red-600">
                              {(person.password )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">Ready to load investor details</p>
                <button
                  onClick={handleFetchDetails}
                  disabled={loading}
                  className="bg-indigo-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2 mx-auto"
                >
                  {loading ? <Spinner /> : <Users size={16} />}
                  {loading ? 'Loading...' : 'Load Investor Details'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Usage example in parent component:
