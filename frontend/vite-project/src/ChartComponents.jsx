import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Funding Progress Bar Component

// Investment Pie Chart Component
export const InvestmentPieChart = ({ data }) => {
    const COLORS = ['#4338CA', '#16A34A', '#D1D5DB']; // Indigo, Green, Gray

    return (
        <div className="w-full h-72">
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
                    <Legend iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// Enhanced Funding Progress Bar Component
export const FundingProgressBar = ({ percentage }) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-3">
            <span className="text-sm sm:text-base font-semibold text-gray-700">Funding Progress</span>
            <span className="text-sm sm:text-base font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {percentage.toFixed(2)}%
            </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 shadow-inner">
            <div 
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-sm" 
                style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
        </div>
        {percentage > 100 && (
            <p className="text-xs text-amber-600 mt-2 font-medium">⚠️ Pool is over-funded</p>
        )}
    </div>
);
