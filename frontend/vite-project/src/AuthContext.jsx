// src/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useApi } from './apiHooks';
import { API_BASE_URL } from './apiConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false); // ADDED: Track if we've checked initial auth
    const { get, post } = useApi();

    // FIXED: Only check auth status once on app startup
    useEffect(() => {
            const checkLoggedIn = async () => {
            // Don't check again if we've already initialized
            if (initialized) return;
            
            try {
                console.log('Checking initial auth status...'); // Debug log
                const result = await get(`${API_BASE_URL}/status`);
                console.log('Auth status result:', result); // Debug log
                
                if (result.success && result.user) {
                    setUser(result.user);
                    console.log('User authenticated:', result.user); // Debug log
                } else {
                    console.log('No active session'); // Debug log
                }
            } catch (error) {
                console.log("Auth check failed (normal on first visit):", error.message);
                // Don't treat this as an error - user just isn't logged in
            } finally {
                setLoading(false);
                setInitialized(true); // IMPORTANT: Mark as initialized
            }
        };

        checkLoggedIn();
    }, [initialized, get]); // FIXED: Dependencies

    const login = async (name, password) => {
        try {
            console.log('Attempting login...'); // Debug log
            const result = await post(`${API_BASE_URL}/login`, { name, password });
            console.log('Login result:', result); // Debug log
            
            if (result.success && result.user) {
                setUser(result.user);
                console.log('Login successful, user set:', result.user); // Debug log
                return result;
            } else {
                throw new Error(result.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error); // Debug log
            throw error;
        }
    };

    const logout = async () => {
        try {
            console.log('Logging out...'); // Debug log
            await post(`${API_BASE_URL}/logout`);
            setUser(null);
            setInitialized(false); // ADDED: Reset initialization on logout
            console.log('Logout successful'); // Debug log
        } catch (error) {
            console.error("Logout error:", error);
            // Still clear user state even if logout request fails
            setUser(null);
            setInitialized(false);
        }
    };

    const value = { 
        user, 
        loading: loading && !initialized, // FIXED: Only show loading during initial check
        login, 
        logout 
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};