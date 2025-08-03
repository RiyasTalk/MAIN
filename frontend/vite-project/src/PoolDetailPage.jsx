import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Briefcase, ArrowLeft, Target, TrendingUp, Users, History, DollarSign, LogOut } from 'lucide-react';
import { API_BASE_URL } from './apiConfig.js';
import { useFetch } from './apiHooks.js';
import { Modal, Spinner, ErrorMessage, StatCard } from './UIComponents.jsx';
import { AddPersonForm, AddAdminSharesForm, BuyoutForm, DistributeProfitForm } from './FormComponents.jsx';
import { FundingProgressBar, InvestmentPieChart } from './ChartComponents.jsx';
import { ParticipantsTable, BuyoutHistoryTable } from './TableComponents.jsx';
import { useAuth } from './AuthContext.jsx';
import {InvestorDetailsModal}  from './InvestorDetailsTable.jsx';
export default function PoolDetail({ showToast, handleDataUpdate }) {
    const { poolId } = useParams();
    const navigate = useNavigate();
    const { data, loading, error, retry } = useFetch(`${API_BASE_URL}/${poolId}/summary`);
    const { details } = useFetch(`${API_BASE_URL}/${poolId}/summary`);
    const [isAddPersonModalOpen, setAddPersonModalOpen] = useState(false);
    const [isAddSharesModalOpen, setAddSharesModalOpen] = useState(false);
    const [buyoutTarget, setBuyoutTarget] = useState(null);
    const [isProfitModalOpen, setProfitModalOpen] = useState(false);
 const [showDetails, setShowDetails] = useState(false);
    const { user, logout } = useAuth();
 const [modalOpen, setModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState(null);

  const handleViewInvestors = (poolId, poolName) => {
    setSelectedPool({ id: poolId, name: poolName });
    setModalOpen(true);
  };
    const handleLogout = async () => {
        try {
            await logout();
            showToast('You have been logged out.', 'success');
        } catch (error) {
            showToast('Logout failed. Please try again.', 'error');
        }
    };

    const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const handleLocalDataUpdate = () => {
        retry();
        handleDataUpdate();
    };

    const handleOpenBuyoutModal = (personId) => {
        if (data && data.summary && data.summary.investors) {
            const personToBuyout = data.summary.investors.find(p => p._id === personId);
            if (personToBuyout) {
                setBuyoutTarget(personToBuyout);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="w-full max-w-7xl mx-auto">
                    <div className="flex justify-center items-center h-96">
                        <div className="text-center">
                            <Spinner />
                            <p className="mt-4 text-gray-600">Loading pool details...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="w-full max-w-7xl mx-auto">
                    <ErrorMessage message={error} onRetry={retry} />
                </div>
            </div>
        );
    }

    if (!data || !data.summary) return null;

    const { summary } = data;
    const { poolDetails, investmentStatus, adminContribution, investors, buyoutHistory } = summary;
  const handleToggleDetails = () => {
        setShowDetails(prevState => !prevState); // Toggles between true and false
    };

    const activeInvestors = investors.filter(p => p.amount > 0);
    const totalInvestedByPeople = activeInvestors.reduce((sum, p) => sum + p.amount, 0);
    const fundingPercentage = poolDetails.totalAmount > 0 ? ((totalInvestedByPeople + adminContribution.amount) / poolDetails.totalAmount) * 100 : 0;
    const pieChartData = [
        { name: 'Admin', value: adminContribution.amount },
        { name: 'Investors', value: totalInvestedByPeople },
        { name: 'Unfunded', value: Math.max(0, investmentStatus.remainingAmount) }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            
            {/* Modals */}
            <Modal isOpen={isAddPersonModalOpen} onClose={() => setAddPersonModalOpen(false)} title="Add New Investor">
                <AddPersonForm poolId={poolId} onComplete={() => { setAddPersonModalOpen(false); handleLocalDataUpdate(); }} showToast={showToast} />
            </Modal>
            <Modal isOpen={isAddSharesModalOpen} onClose={() => setAddSharesModalOpen(false)} title="Add Admin Shares">
                <AddAdminSharesForm poolId={poolId} onComplete={() => { setAddSharesModalOpen(false); handleLocalDataUpdate(); }} showToast={showToast} />
            </Modal>
            <Modal isOpen={!!buyoutTarget} onClose={() => setBuyoutTarget(null)} title="Buy Investor Shares">
                {buyoutTarget && (
                    <BuyoutForm
                        poolId={poolId}
                        person={buyoutTarget}
                        onComplete={() => {
                            setBuyoutTarget(null);
                            handleLocalDataUpdate();
                        }}
                        showToast={showToast}
                    />
                )}
            </Modal>
            <Modal isOpen={isProfitModalOpen} onClose={() => setProfitModalOpen(false)} title="Distribute Profits">
                <DistributeProfitForm poolId={poolId} showToast={showToast} />
            </Modal>

            {/* Main Content */}
        
            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Back Button */}
                <div className="mb-4 sm:mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                </div>

                {/* Header Section */}
                <header className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                        {/* Pool Info */}
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{poolDetails.name}</h1>
                            <p className="text-sm text-gray-500">Created on: {new Date(poolDetails.createdAt).toLocaleDateString()}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
                            {/* Mobile: Stack buttons vertically */}
                            <div className="grid grid-cols-2 sm:flex gap-2">
                                <button
                                    onClick={() => setProfitModalOpen(true)}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                                >
                                    <DollarSign size={16} />
                                    <span className="hidden sm:inline">Distribute</span>
                                    <span className="sm:hidden">Profit</span>
                                </button>

                                <button
                                    onClick={() => setAddSharesModalOpen(true)}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 border border-gray-300 rounded-lg shadow-sm text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <Briefcase size={16} />
                                    <span className="hidden sm:inline">Add Admin</span>
                                    <span className="sm:hidden">Admin</span>
                                </button>

                                <button
                                    onClick={() => setAddPersonModalOpen(true)}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={16} />
                                    <span className="hidden sm:inline">Add Investor</span>
                                    <span className="sm:hidden">Investor</span>
                                </button>
                               <button 
                                      onClick={() => handleViewInvestors(poolId, poolDetails.name)}
                                      className="bg-blue-600 text-white px-4 py-2 rounded"
                                    >
                                      View Investors
                                    </button>
                                                                
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 bg-red-600 hover:bg-red-900 text-white font-medium rounded-lg shadow-sm transition-colors"
                                >
                                    <LogOut size={16} />
                                    <span className="hidden sm:inline">Logout</span>

                                    <span className="sm:hidden">Exit</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    {/* Left Column - Main Content */}
                    <div className="xl:col-span-3 space-y-6">
                        {/* Funding Overview */}
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Funding Overview</h3>
                            <FundingProgressBar percentage={fundingPercentage} />
                        </div>

                        {/* Participants Table */}
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                All Participants ({activeInvestors.length + (adminContribution.amount > 0 ? 1 : 0)} Active)
                            </h3>
                            <div className="overflow-x-auto">
                                <ParticipantsTable
                                    adminContribution={adminContribution}
                                    investors={investors}
                                    formatCurrency={formatCurrency}
                                    onBuyout={handleOpenBuyoutModal}
                                />
                            </div>
                        </div>

                        {/* Buyout History */}
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <History size={20} /> Buyout History
                            </h3>
                            <div className="overflow-x-auto">
                                <BuyoutHistoryTable history={buyoutHistory} formatCurrency={formatCurrency} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Stats and Chart */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Investment Distribution Chart */}
                        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Investment Distribution</h3>
                            <InvestmentPieChart data={pieChartData} />
                        </div>

                        {/* Stats Cards */}
                        <div className="space-y-4">
                            {/* Mobile: 2 columns, Desktop: 1 column */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                                <StatCard
                                    icon={Users}
                                    title="Admin Initial Investment"
                                    value={`₹${poolDetails.initialFund}`}
                                    color="blue"
                                />
                                <StatCard
                                    icon={Target}
                                    title="Funding Goal"
                                    value={formatCurrency(poolDetails.totalAmount)}
                                    color="blue"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    title="Admin Contribution"
                                    value={formatCurrency(adminContribution.amount)}
                                    subValue={`${adminContribution.sharePercentage}% of total`}
                                    color="purple"
                                />
                                <StatCard
                                    icon={Users}
                                    title="Active Investors"
                                    value={activeInvestors.length}
                                    color="green"
                                />
                            </div>
                        </div>

                        {/* Quick Actions (Mobile Only) */}
                        <div className="xl:hidden bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAddPersonModalOpen(true)}
                                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <Plus className="w-6 h-6 text-indigo-600" />
                                    <span className="text-sm font-medium text-gray-700">Add Investor</span>
                                </button>
                                <button
                                    onClick={() => setProfitModalOpen(true)}
                                    className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">Distribute Profit</span>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
 <div>
      {/* Your pool list or whatever */}
     

      <InvestorDetailsModal
        poolId={selectedPool?.id}
        poolName={selectedPool?.name}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPool(null);
        }}
      />
    </div>
        </div>
    );
};