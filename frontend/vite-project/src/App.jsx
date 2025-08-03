// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import our new auth and protected route components
import { AuthProvider } from './AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

// Import shared UI components
import { Toast } from './UIComponents.jsx';

// Import page components
import Dashboard from './DashboardPage.jsx';
import PoolDetail from './PoolDetailPage.jsx';
import LoginPage from './LoginPage.jsx'; // Import the new login page

export default function App() {
    const [toast, setToast] = useState(null);
    const [globalDataVersion, setGlobalDataVersion] = useState(0);

    const showToast = (message, type) => setToast({ message, type, key: Date.now() });
    const handleDataUpdate = () => setGlobalDataVersion(v => v + 1);

    return (
        // 1. Wrap the entire application in the AuthProvider
        <AuthProvider>
            <Router>
                <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
                    {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

                    <Routes>
                        {/* 2. Create a public route for the login page */}
                        <Route path="/login" element={<LoginPage showToast={showToast} />} />

                        {/* 3. Wrap your Dashboard in the ProtectedRoute component */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Dashboard
                                        showToast={showToast}
                                        handleDataUpdate={handleDataUpdate}
                                        globalDataVersion={globalDataVersion}
                                    />
                                </ProtectedRoute>
                            }
                        />

                        {/* 4. Wrap your PoolDetail in the ProtectedRoute component */}
                        <Route
                            path="/pool/:poolId"
                            element={
                                <ProtectedRoute>
                                    <PoolDetail
                                        showToast={showToast}
                                        handleDataUpdate={handleDataUpdate}
                                    /> 
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}