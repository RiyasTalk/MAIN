import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, User, History, ChevronRight, Inbox } from 'lucide-react';

// Reusable Table Primitives
const Table = ({ children }) => <div className="flow-root"><table className="min-w-full divide-y divide-gray-200">{children}</table></div>;
const THead = ({ children }) => <thead className="bg-gray-50"><tr>{children}</tr></thead>;
const TBody = ({ children }) => <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>;
const Th = ({ children, className = '' }) => <th scope="col" className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>{children}</th>;
const Td = ({ children, className = '' }) => <td className={`px-4 py-4 whitespace-nowrap text-sm text-gray-700 ${className}`}>{children}</td>;

// --- THIS IS THE COMPONENT FOR THE DASHBOARD ---
// It is a named export, so it must be imported with { PoolsTable }
export const PoolsTable = ({ pools, formatCurrency }) => {
    if (!pools || pools.length === 0) {
        return (
            <div className="text-center py-16 text-gray-500">
                <Inbox size={40} className="mx-auto mb-2" />
                <h3 className="text-lg font-medium">No pools found.</h3>
                <p className="text-sm">Get started by creating a new investment pool.</p>
            </div>
        );
    }
    return (
        <Table>
            <THead>
                <Th>Pool Name</Th>
                <Th>Funding Goal</Th>
                <Th>Date Created</Th>
                <Th><span className="sr-only">View</span></Th>
            </THead>
            <TBody>
                {pools.map((pool) => (
                    <tr key={pool._id} className="hover:bg-gray-50">
                        <Td>
                            <span className="font-semibold text-gray-800">{pool.name}</span>
                        </Td>
                        <Td>{formatCurrency(pool.totalAmount)}</Td>
                        <Td>{new Date(pool.createdAt).toLocaleDateString()}</Td>
                        <Td className="text-right">
                            <Link 
                                to={`/pool/${pool._id}`}
                                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-end gap-1"
                            >
                                View Details <ChevronRight size={16} />
                            </Link>
                        </Td>
                    </tr>
                ))}
            </TBody>
        </Table>
    );
};

// --- THIS IS THE COMPONENT FOR THE DETAIL PAGE ---
export const ParticipantsTable = ({ adminContribution, investors, formatCurrency, onBuyout, isBuyoutLoading }) => (
    <Table>
        <THead>
            <Th>Participant</Th>
            <Th>Amount Invested</Th>
            <Th>% of Goal</Th>
            <Th className="text-right">Actions</Th>
        </THead>
        <TBody>
            {/* Admin Row */}
            <tr className="bg-indigo-50">
                <Td>
                    <div className="flex items-center gap-3">
                        <span className="p-2 bg-indigo-200 text-indigo-700 rounded-full"><Briefcase size={16} /></span>
                        <span className="font-bold">Admin</span>
                    </div>
                </Td>
                <Td className="font-semibold">{formatCurrency(adminContribution.amount)}</Td>
                <Td>{adminContribution.sharePercentage}%</Td>
                <Td></Td>
            </tr>
            {/* Investor Rows */}
            {investors.map((person) => (
                <tr key={person._id}>
                    <Td>
                        <div className="flex items-center gap-3">
                            <span className="p-2 bg-gray-100 text-gray-600 rounded-full"><User size={16} /></span>
                            <span>{person.personName}</span>
                        </div>
                    </Td>
                    <Td>{formatCurrency(person.amount)}</Td>
                    <Td>{person.sharePercentage}%</Td>
                    <Td className="text-right">
                        <button
                            onClick={() => onBuyout(person._id, person.personName)}
                            disabled={person.amount === 0 || isBuyoutLoading}
                            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            {person.amount > 0 ? 'Buyout' : 'Bought Out'}
                        </button>
                    </Td>
                </tr>
            ))}
        </TBody>
    </Table>
);

// --- THIS IS THE COMPONENT FOR THE DETAIL PAGE ---
export const BuyoutHistoryTable = ({ history, formatCurrency }) => {
    if (!history || history.length === 0) {
        return (
            <div className="text-center py-4 text-sm text-gray-500">
                <History className="mx-auto mb-2" size={24} />
                No buyout history yet.
            </div>
        );
    }

    return (
        <Table>
            <THead>
                <Th>Investor Name</Th>
                <Th>Amount Bought Out</Th>
                <Th>Date</Th>
            </THead>
            <TBody>
                {history.map((item) => (
                    <tr key={item._id}>
                        <Td>{item.personName}</Td>
                        <Td>{formatCurrency(item.amount)}</Td>
                        <Td>{new Date(item.buyoutDate).toLocaleDateString()}</Td>
                    </tr>
                ))}
            </TBody>
        </Table>
    );
};
