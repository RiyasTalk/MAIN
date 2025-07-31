import React, { useState } from 'react';
import { Plus } from 'lucide-react';

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

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Modal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Investment Pool">
                <CreatePoolForm
                    onComplete={handleCreationComplete}
                    showToast={showToast}
                />
            </Modal>

            <header className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Investment Dashboard</h1>
                <button
                    onClick={() => setCreateModalOpen(true)}
                    className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                >
                    <Plus size={18} /> Create New Pool
                </button>
            </header>

            <main className="bg-white p-2 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
                {loading && <div className="text-center py-20"><Spinner /></div>}
                {error && <div className="p-4"><ErrorMessage message={error} onRetry={retry} /></div>}
                {!loading && !error && <PoolsTable pools={pools} formatCurrency={formatCurrency} />}
            </main>
        </div>
    );
};
