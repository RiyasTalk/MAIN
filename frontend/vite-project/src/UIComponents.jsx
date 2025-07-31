import React, { useEffect } from 'react';
import { CheckCircle, AlertTriangle, Loader2, X, TrendingUp, Users, Target, Briefcase, UserPlus } from 'lucide-react';

// Spinner Component (No changes)
export const Spinner = () => <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />;

// Toast Component (No changes)
export const Toast = ({ message, type, onDismiss }) => {
    const Icon = type === 'success' ? CheckCircle : AlertTriangle;
    const colors = type === 'success' ? 'bg-green-600' : 'bg-red-600';

    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`fixed bottom-5 right-5 text-white p-4 rounded-lg shadow-2xl flex items-center z-[100] animate-fade-in-up ${colors}`}>
            <Icon size={24} className="mr-3" />
            <span className="font-semibold">{message}</span>
        </div>
    );
};

// Modal Component (No changes)
export const Modal = ({ children, isOpen, onClose, title, size = 'lg' }) => {
    if (!isOpen) return null;
    const sizeClasses = { lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '4xl': 'max-w-4xl', '6xl': 'max-w-6xl' };

    return (
        <div className="fixed inset-0  backdrop-blur-xl. z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 rounded-full p-1 hover:bg-gray-100 hover:text-gray-700 transition-all"><X size={20} /></button>
                </header>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

// StatCard Component
// A card for displaying a key statistic with an icon.
export const StatCard = ({ icon, title, value, subValue, color }) => {
    const Icon = icon;
    
    // CHANGED: Use a map to provide full class names for Tailwind's JIT compiler.
    // This ensures that Tailwind "sees" the classes and generates the necessary CSS.
    const colorMap = {
        blue: {
            bg: 'bg-blue-100',
            text: 'text-blue-600'
        },
        purple: {
            bg: 'bg-purple-100',
            text: 'text-purple-600'
        },
        green: {
            bg: 'bg-green-100',
            text: 'text-green-600'
        },
        default: {
            bg: 'bg-gray-100',
            text: 'text-gray-600'
        }
    };
    
    const selectedColor = colorMap[color] || colorMap.default;

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${selectedColor.bg} ${selectedColor.text}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
            </div>
        </div>
    );
};


// ErrorMessage Component (No changes)
export const ErrorMessage = ({ message, onRetry }) => (
    <div className="text-center py-8">
        <div className="text-red-600 mb-4">
            <AlertTriangle size={48} className="mx-auto mb-2" />
            <p className="text-lg font-semibold">Error: {message}</p>
        </div>
        <button onClick={onRetry} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Try Again
        </button>
    </div>
);