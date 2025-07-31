import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Briefcase, ArrowLeft, Target, TrendingUp, Users, History, DollarSign } from 'lucide-react';
import { API_BASE_URL } from './apiConfig.js';
import { useFetch } from './apiHooks.js';
import { Modal, Spinner, ErrorMessage, StatCard } from './UIComponents.jsx';
import { AddPersonForm, AddAdminSharesForm, BuyoutForm, DistributeProfitForm } from './FormComponents.jsx';
import { FundingProgressBar, InvestmentPieChart } from './ChartComponents.jsx';
import { ParticipantsTable, BuyoutHistoryTable } from './TableComponents.jsx';

export default function PoolDetail({ showToast, handleDataUpdate }) {
    const { poolId } = useParams();
    const navigate = useNavigate();
    const { data, loading, error, retry } = useFetch(`${API_BASE_URL}/${poolId}/summary`);

    const [isAddPersonModalOpen, setAddPersonModalOpen] = useState(false);
    const [isAddSharesModalOpen, setAddSharesModalOpen] = useState(false);
    const [buyoutTarget, setBuyoutTarget] = useState(null);
    // NEW: State to control the profit distribution modal
    const [isProfitModalOpen, setProfitModalOpen] = useState(false);

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
            <div className="w-full max-w-7xl mx-auto p-8">
                <div className="flex justify-center items-center h-96"><Spinner /></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full max-w-7xl mx-auto p-8">
                <ErrorMessage message={error} onRetry={retry} />
            </div>
        );
    }

    if (!data || !data.summary) return null;

    const { summary } = data;
    const { poolDetails, investmentStatus, adminContribution, investors, buyoutHistory } = summary;
    
    const activeInvestors = investors.filter(p => p.amount > 0);
    const totalInvestedByPeople = activeInvestors.reduce((sum, p) => sum + p.amount, 0);
    const fundingPercentage = poolDetails.totalAmount > 0 ? ((totalInvestedByPeople + adminContribution.amount) / poolDetails.totalAmount) * 100 : 0;
    const pieChartData = [
        { name: 'Admin', value: adminContribution.amount },
        { name: 'Investors', value: totalInvestedByPeople },
        { name: 'Unfunded', value: Math.max(0, investmentStatus.remainingAmount) }
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
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
            {/* NEW: Modal for Profit Distribution */}
            <Modal isOpen={isProfitModalOpen} onClose={() => setProfitModalOpen(false)} title="Distribute Profits">
                <DistributeProfitForm poolId={poolId} showToast={showToast} />
            </Modal>

            <div className="mb-6">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium mb-4">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
            </div>
            <header className="flex flex-wrap justify-between items-start mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{poolDetails.name}</h1>
                    <p className="text-sm text-gray-500 mt-1">Created on: {new Date(poolDetails.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-x-2 flex-shrink-0">
                    {/* NEW: Profit Distribution Button */}
                    <button 
                        onClick={() => setProfitModalOpen(true)}
                        className="flex items-center gap-2 py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
                    >
                        <DollarSign size={16} /> Distribute Profit
                    </button>
                    <button onClick={() => setAddSharesModalOpen(true)} className="flex items-center gap-2 py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                        <Briefcase size={16} /> Add Admin Shares
                    </button>
                    <button onClick={() => setAddPersonModalOpen(true)} className="flex items-center gap-2 py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                        <Plus size={16} /> Add Investor
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Funding Overview</h3>
                        <FundingProgressBar percentage={fundingPercentage} />
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">All Participants ({activeInvestors.length + (adminContribution.amount > 0 ? 1 : 0)} Active)</h3>
                        <ParticipantsTable
                            adminContribution={adminContribution}
                            investors={investors}
                            formatCurrency={formatCurrency}
                            onBuyout={handleOpenBuyoutModal}
                        />
                    </div>
                     <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <History size={20} /> Buyout History
                        </h3>
                        <BuyoutHistoryTable history={buyoutHistory} formatCurrency={formatCurrency} />
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Investment Distribution</h3>
                        <InvestmentPieChart data={pieChartData} />
                    </div>
                    <div className="space-y-4">
                        <StatCard icon={Target} title="Funding Goal" value={formatCurrency(poolDetails.totalAmount)} color="blue" />
                        <StatCard icon={TrendingUp} title="Admin Contribution" value={formatCurrency(adminContribution.amount)} subValue={`${adminContribution.sharePercentage}% of total`} color="purple" />
                        <StatCard icon={Users} title="Active Investors" value={activeInvestors.length} color="green" />
                    </div>
                </div>
            </div>
        </div>
    );
};