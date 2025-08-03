import { useState, useEffect, useCallback } from 'react';

// Custom Hook: useApi - Fixed to prevent infinite loops
export const useApi = () => {
    const [loading, setLoading] = useState(false);

    // FIXED: Make functions stable to prevent useEffect loops
    const post = useCallback(async (url, body) => {
        setLoading(true);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    try {
                        const errorText = await response.text();
                        if (errorText) errorMessage = errorText;
                    } catch (textError) {
                        // Use default error message
                    }
                }
                
                throw new Error(errorMessage);
            }

            return await response.json();

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Could not connect to server.');
            } else if (error.name === 'SyntaxError') {
                throw new Error('Server returned invalid response.');
            } else {
                throw error;
            }
        } finally {
            setLoading(false);
        }
    }, []); // FIXED: Empty dependencies

    // FIXED: Make get function stable
    const get = useCallback(async (url) => {
        setLoading(true);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    try {
                        const errorText = await response.text();
                        if (errorText) errorMessage = errorText;
                    } catch (textError) {
                        // Use default error message
                    }
                }
                
                throw new Error(errorMessage);
            }

            return await response.json();

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Could not connect to server.');
            } else if (error.name === 'SyntaxError') {
                throw new Error('Server returned invalid response.');
            } else {
                throw error;
            }
        } finally {
            setLoading(false);
        }
    }, []); // FIXED: Empty dependencies

    return { post, get, loading };
};

// Custom Hook: useFetch - Fixed to prevent loops
export const useFetch = (url) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // FIXED: More stable fetchData function
    const fetchData = useCallback(async () => {
        if (!url) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                let errorMessage = `HTTP error! status: ${response.status}`;
                
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (parseError) {
                    // Use default error message
                }
                
                throw new Error(errorMessage);
            }

            const result = await response.json();

            if (result.success) {
                setData(result);
            } else {
                throw new Error(result.error || 'Failed to fetch data.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [url]); // FIXED: Only depend on URL

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // FIXED: Add manual retry function
    const retry = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, retry };
};