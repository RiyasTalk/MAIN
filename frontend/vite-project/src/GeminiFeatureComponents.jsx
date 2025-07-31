import React, { useState } from 'react';
import { useApi } from './apiHooks';
import { Sparkles, Bot, AlertTriangle } from 'lucide-react';
import { Spinner } from './UIComponents';

// A simple, reusable input field for this component
const FeatureInput = (props) => (
    <input 
        {...props} 
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" 
    />
);

// --- Feature 1: AI to Generate Pool Names ---
export const GeneratePoolName = ({ onNameSelect }) => {
    const { post, loading } = useApi();
    const [theme, setTheme] = useState('');
    const [names, setNames] = useState([]);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setNames([]);
        try {
            const result = await post('/api/gemini/generate-name', { theme });
            if (result.success && result.names) {
                setNames(result.names);
            } else {
                throw new Error(result.error || 'Received an invalid response from the server.');
            }
        } catch (err) {
            setError(err.message || 'Failed to generate names.');
        }
    };

    return (
        <div className="p-4 border-t mt-6">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" />
                Need inspiration? Let AI suggest a name.
            </h4>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="flex-grow">
                    <label htmlFor="theme" className="block text-sm font-medium text-gray-700">Theme</label>
                    <FeatureInput
                        id="theme"
                        name="theme"
                        type="text"
                        placeholder="e.g., 'sustainable energy startups'"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={loading} className="flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                    {loading ? <Spinner /> : 'Generate'}
                </button>
            </form>

            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            
            {names.length > 0 && (
                <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Click a name to use it:</p>
                    <div className="flex flex-wrap gap-2">
                        {names.map((name, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => onNameSelect(name)}
                                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Feature 2: AI to Analyze Pool Risk ---
export const AnalyzePoolRisk = ({ poolData }) => {
    const { post, loading } = useApi();
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    
    const handleAnalyze = async () => {
        setError('');
        setResult(null);
        try {
            const apiResult = await post('/api/gemini/analyze-risk', { poolData });
             if (apiResult.success) {
                setResult(apiResult);
            } else {
                throw new Error(apiResult.error || 'Received an invalid response from the server.');
            }
        } catch(err) {
            setError(err.message || 'Failed to get analysis.');
        }
    };
    
    const riskColorClasses = {
        "Low": "bg-green-100 text-green-800",
        "Medium": "bg-yellow-100 text-yellow-800",
        "High": "bg-red-100 text-red-800",
        "default": "bg-gray-100 text-gray-800"
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
             <div className="flex justify-between items-start gap-4">
                 <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Bot size={20} /> AI Risk Analysis
                </h3>
                <button 
                    onClick={handleAnalyze} 
                    disabled={loading}
                    className="flex items-center gap-2 py-1 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 transition-colors flex-shrink-0"
                >
                   {loading ? <Spinner /> : <Sparkles size={16}/>}
                   Analyze
                </button>
             </div>
             
             {error && <p className="text-sm text-red-600 mt-4 flex items-center gap-2"><AlertTriangle size={16} /> {error}</p>}
             
             {!result && !loading && !error && (
                <p className="text-sm text-gray-500 mt-2">Click "Analyze" to get an AI-powered summary of this pool's investment profile.</p>
             )}

             {result && (
                 <div className="mt-4 text-sm space-y-3">
                    <p>
                        <span className="font-semibold text-gray-900">Risk Level: </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskColorClasses[result.riskLevel] || riskColorClasses.default}`}>
                            {result.riskLevel}
                        </span>
                    </p>
                    <p className="text-gray-700 leading-relaxed">{result.analysis}</p>
                 </div>
             )}
        </div>
    );
}