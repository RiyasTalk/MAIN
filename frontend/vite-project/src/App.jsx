import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import shared UI components
import { Toast } from './UIComponents.jsx';

// Import page components
import Dashboard from './DashboardPage.jsx';
// FIXED: Corrected typo from "PoolDetai" to "PoolDetail"
import PoolDetail from './PoolDetailPage.jsx';

// Main App Component
// This component sets up the main structure, routing, and shared state like toasts.
export default function App() {
    const [toast, setToast] = useState(null);
    // This state can be used to trigger a refresh across different components if needed.
    const [globalDataVersion, setGlobalDataVersion] = useState(0);

    // Function to display a toast message
    const showToast = (message, type) => setToast({ message, type, key: Date.now() });

    // Function to signal a global data update
    const handleDataUpdate = () => setGlobalDataVersion(v => v + 1);

    return (
        <Router>
            <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
                {/* Toast component for displaying notifications */}
                {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

                {/* Application routes */}
                <Routes>
                    <Route
                        path="/"
                        element={
                            <Dashboard
                                showToast={showToast}
                                handleDataUpdate={handleDataUpdate}
                                // Pass globalDataVersion if you want the dashboard to react to global updates
                                globalDataVersion={globalDataVersion}
                            />
                        }
                    />
                    <Route
                        path="/pool/:poolId"
                        element={
                            // FIXED: Corrected component name to match the import
                            <PoolDetail
                                showToast={showToast}
                                handleDataUpdate={handleDataUpdate}
                            />
                        }
                    />
                </Routes>
            </div>
        </Router>
    );
}
