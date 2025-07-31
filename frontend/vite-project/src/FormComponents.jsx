import React, { useState } from 'react';
import { useApi } from './apiHooks';
import { Spinner } from './UIComponents';
import { API_BASE_URL } from './apiConfig';

// Reusable FormInput component
const FormInput = ({ label, name, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input name={name} id={name} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
    </div>
);

// Reusable FormButton component
const FormButton = ({ isLoading, children }) => (
    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed">
        {isLoading ? <Spinner /> : children}
    </button>
);

// Form for creating a new investment pool
export const CreatePoolForm = ({ onComplete, showToast }) => {
    const { post, loading } = useApi();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await post(`${API_BASE_URL}/create`, {
                name: formData.get('name'),
                totalAmount: Number(formData.get('totalAmount')),
                adminShare: Number(formData.get('adminShare')) || 0,
            });
            showToast('Pool created successfully!', 'success');
            onComplete();
        } catch (err) {
            showToast(err.message || 'Failed to create pool.', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput label="Pool Name" name="name" type="text" required />
            <FormInput label="Total Funding Goal ($)" name="totalAmount" type="number" required />
            <FormInput label="Admin's Initial Share ($) (Optional)" name="adminShare" type="number" />
            <FormButton isLoading={loading}>Create Pool</FormButton>
        </form>
    );
};

// Form for adding a new investor to a pool
export const AddPersonForm = ({ poolId, onComplete, showToast }) => {
    const { post, loading } = useApi();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            await post(`${API_BASE_URL}/add-person`, {
                poolId,
                personName: formData.get('personName'),
                amount: Number(formData.get('amount')),
            });
            showToast('Investor added successfully!', 'success');
            onComplete();
        } catch (err) {
            showToast(err.message || 'Failed to add investor.', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput label="Investor Name" name="personName" type="text" required />
            <FormInput label="Amount to Invest ($)" name="amount" type="number" required />
            <FormButton isLoading={loading}>Add Investor</FormButton>
        </form>
    );
};

// Form for adding to the admin's share in a pool
export const AddAdminSharesForm = ({ poolId, onComplete, showToast }) => {
    const { post, loading } = useApi();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const extraAmount = Number(formData.get('extraAmount'));

        if (extraAmount <= 0) {
            showToast('Please enter a positive amount.', 'error');
            return;
        }

        try {
            await post(`${API_BASE_URL}/admin/add-shares`, { poolId, extraAmount });
            showToast('Admin shares added successfully!', 'success');
            onComplete();
        } catch (err) {
            showToast(err.message || 'Failed to add shares.', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <FormInput label="Amount to Add to Admin Share ($)" name="extraAmount" type="number" required />
            <FormButton isLoading={loading}>Add Shares</FormButton>
        </form>
    );
};

// Form for buying out a portion of an investor's shares
export const BuyoutForm = ({ poolId, person, onComplete, showToast }) => {
    const { post, loading } = useApi();
    const [amount, setAmount] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const buyoutAmount = Number(amount);

        if (buyoutAmount <= 0) {
            showToast('Please enter a positive amount.', 'error');
            return;
        }
        if (buyoutAmount > person.amount) {
            showToast(`Amount cannot exceed the investor's current share of $${person.amount}.`, 'error');
            return;
        }

        try {
            await post(`${API_BASE_URL}/admin/buyout`, {
                poolId,
                personId: person._id,
                buyoutAmount,
            });
            showToast('Shares bought out successfully!', 'success');
            onComplete();
        } catch (err) {
            showToast(err.message || 'Failed to process buyout.', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Investor: <span className="font-bold text-gray-900">{person.personName}</span></p>
                <p className="text-sm text-gray-600">Current Investment: <span className="font-bold text-gray-900">${person.amount.toFixed(2)}</span></p>
            </div>
            <FormInput 
                label="Amount to Buy ($)" 
                name="buyoutAmount" 
                type="number" 
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={person.amount}
                required 
            />
            <FormButton isLoading={loading}>Confirm Buyout</FormButton>
        </form>
    );
};

// Form for calculating and displaying profit distribution
export const DistributeProfitForm = ({ poolId, showToast }) => {
    const { post, loading } = useApi();
    const [profitAmount, setProfitAmount] = useState('');
    const [distribution, setDistribution] = useState(null);
    const [error, setError] = useState(null);

    const handleCalculate = async (amount) => {
        if (!amount || amount <= 0) {
            setDistribution(null);
            setError(null);
            return;
        }

        try {
            const result = await post(`${API_BASE_URL}/${poolId}/calculate-profit`, {
                profitAmount: Number(amount)
            });

            if (result.success) {
                setDistribution(result.distribution);
                setError(null);
            } else {
                throw new Error(result.error);
            }
        } catch (err) {
            setError(err.message || 'Failed to calculate distribution.');
            setDistribution(null);
        }
    };

    const handleAmountChange = (e) => {
        const newAmount = e.target.value;
        setProfitAmount(newAmount);
        handleCalculate(newAmount);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="space-y-6">
            <FormInput
                label="Total Profit to Distribute ($)"
                name="profitAmount"
                type="number"
                value={profitAmount}
                onChange={handleAmountChange}
                placeholder="e.g., 1000"
                required
            />

            {loading && <div className="text-center py-4"><Spinner /></div>}
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            {distribution && !loading && (
                <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Distribution Preview</h4>
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Participant</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Share (%)</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit Earned</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {distribution.map(item => (
                                    <tr key={item.participantId}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{item.sharePercentage.toFixed(2)}%</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600 font-semibold text-right">{formatCurrency(item.profitShare)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};