import React, { useState, useEffect } from 'react';

import { useApi } from './apiHooks';

import { Spinner } from './UIComponents';

import { API_BASE_URL } from './apiConfig';



// A helper function to format currency, used in PeopleList

const formatCurrency = (amount) => {

    return new Intl.NumberFormat('en-US', {

        style: 'currency',

        currency: 'USD',

    }).format(amount);

};



// Reusable FormInput component

const FormInput = ({ label, name, as: Component = 'input', ...props }) => (

    <div>

        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>

        <Component name={name} id={name} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />

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



        const payload = {

            poolId,

            personName: formData.get('personName'),

            amount: Number(formData.get('amount')),

            mobileNumber: formData.get('mobileNumber'),

            address: formData.get('address')

        };



        if (!payload.mobileNumber) delete payload.mobileNumber;

        if (!payload.address) delete payload.address;



        try {

            await post(`${API_BASE_URL}/add-person`, payload);

            showToast('Investor added successfully!', 'success');

            onComplete();

        } catch (err) {

            showToast(err.message || 'Failed to add investor.', 'error');

        }

    };



    return (

        <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <FormInput label="Investor Name" name="personName" type="text" required />

                <FormInput label="Amount to Invest ($)" name="amount" type="number" required />

            </div>

            <FormInput label="Mobile Number (Optional)" name="mobileNumber" type="tel" />

            <FormInput

                label="PASSWORS"

                name="address"

          

            />

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



// --- NEWLY ADDED COMPONENT ---

export const PeopleList = ({ poolId }) => {

    const { get, loading, error } = useApi();

    const [people, setPeople] = useState([]);



    useEffect(() => {

        if (!poolId) return;



        const fetchPeople = async () => {

            try {

                const result = await get(`${API_BASE_URL}/pool/${poolId}/people`);

                if (result.success) {

                    setPeople(result.data);

                } else {

                    throw new Error(result.error || 'Failed to fetch investors');

                }

            } catch (err) {

                // The useApi hook should set the error state, but we can also handle it here if needed

                console.error(err);

            }

        };



        fetchPeople();

    }, [poolId, get]); // Added 'get' to the dependency array



    if (loading) {

        return <div className="text-center p-8"><Spinner /> Loading investors...</div>;

    }



    if (error) {

        return <div className="text-center p-8 text-red-600">Error: {error}</div>;

    }



    if (people.length === 0) {

        return <div className="text-center p-8 text-gray-500">No investors have been added to this pool yet.</div>;

    }



    return (

        <div className="overflow-x-auto shadow-md rounded-lg">

            <table className="min-w-full bg-white border border-gray-200">

                <thead className="bg-gray-50">

                    <tr>

                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase">Name</th>

                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase">Current Amount</th>

                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase">Initial Amount</th>

                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase">Mobile Number</th>

                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase">Address</th>

                    </tr>

                </thead>

                <tbody className="text-gray-700 divide-y divide-gray-200">

                    {people.map((person) => (

                        <tr key={person._id} className="hover:bg-gray-50">

                            <td className="py-3 px-4">{person.personName}</td>

                            <td className="py-3 px-4">{formatCurrency(person.amount)}</td>

                            <td className="py-3 px-4">{formatCurrency(person.initialAmount)}</td>

                            <td className="py-3 px-4">{person.mobileNumber || 'N/A'}</td>

                            <td className="py-3 px-4">{person.address || 'N/A'}</td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );

};