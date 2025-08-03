import React, { useState } from 'react';
import { Plus, TrendingUp, DollarSign, Users } from 'lucide-react';

// Import hooks, components, and config
import { API_BASE_URL } from './apiConfig';
import { useFetch } from './apiHooks';
import { Modal, Spinner, ErrorMessage } from './UIComponents';
import { CreatePoolForm } from './FormComponents';
// This import MUST use curly braces because PoolsTable is a named export
import { PoolsTable } from './TableComponents';

export default function Dashboard({ showToast, handleDataUpdate, globalDataVersion }) {
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    
    const { data, loading, error, retry } = useFetch(`${API_BASE_URL}?v=${globalDataVersion}`);
    
    const pools = data?.pools || [];
    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const handleCreationComplete = () => {
        setCreateModalOpen(false);
        handleDataUpdate();
    };

    // Calculate dashboard stats
    const totalPools = pools.length;
    const totalValue = pools.reduce((sum, pool) => sum + (pool.totalAmount || 0), 0);
    const activePools = pools.filter(pool => pool.status === 'active' || !pool.status).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Investment Pool">
                <CreatePoolForm
                    onComplete={handleCreationComplete}
                    showToast={showToast}
                />
            </Modal>

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Header Section */}
                <header className="mb-6 sm:mb-8">
                    {/* Title and Description */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                Investment Dashboard
                            </h1>
                            <p className="text-gray-600 text-sm sm:text-base">
                                Manage and track your investment pools
                            </p>
                        </div>
                        
                        {/* Create Pool Button */}
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 border border-transparent rounded-xl shadow-lg text-sm sm:text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105"
                        >
                            <Plus size={20} /> 
                            <span className="hidden sm:inline">Create New Pool</span>
                            <span className="sm:hidden">Create Pool</span>
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Total Pools */}
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Pools</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalPools}</p>
                                </div>
                                <div className="p-3 bg-blue-100 rounded-full">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        {/* Total Value */}
                       

                        {/* Active Pools */}
                      
                    </div>
                </header>

                {/* Main Content */}
                <main className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Content Header */}
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                            Investment Pools ({totalPools})
                        </h2>
                    </div>

                    {/* Content Body */}
                    <div className="p-4 sm:p-6">
                        {loading && (
                            <div className="text-center py-12 sm:py-20">
                                <Spinner />
                                <p className="mt-4 text-gray-600">Loading your investment pools...</p>
                            </div>
                        )}
                        
                        {error && (
                            <div className="p-4">
                                <ErrorMessage message={error} onRetry={retry} />
                            </div>
                        )}
                        
                        {!loading && !error && pools.length === 0 && (
                            <div className="text-center py-12 sm:py-20">
                                <div className="max-w-md mx-auto">
                                    <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Investment Pools Yet</h3>
                                    <p className="text-gray-600 mb-6">
                                        Create your first investment pool to get started with managing investments.
                                    </p>
                                    <button
                                        onClick={() => setCreateModalOpen(true)}
                                        className="inline-flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                                    >
                                        <Plus size={16} /> Create Your First Pool
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {!loading && !error && pools.length > 0 && (
                            <div className="overflow-x-auto">
                                <PoolsTable pools={pools} formatCurrency={formatCurrency} />
                            </div>
                        )}
                    </div>
                </main>


                {/* Footer Info */}
                <footer className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Manage your investment portfolio with confidence
                    </p>
                </footer>
            </div>
        </div>
    );
};