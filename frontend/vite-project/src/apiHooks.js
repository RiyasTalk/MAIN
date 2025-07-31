import { useState, useEffect, useCallback } from 'react';

// Custom Hook: useApi
// A hook for handling POST requests, managing loading state, and basic error handling.
export const useApi = () => {
    const [loading, setLoading] = useState(false);

    const post = async (url, body) => {
        setLoading(true);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                // Try to parse error message from response body
                const errorBody = await response.json().catch(() => ({ error: 'An unknown error occurred.' }));
                throw new Error(errorBody.error);
            }
            return await response.json();
        } finally {
            setLoading(false);
        }
    };

    return { post, loading };
};

// Custom Hook: useFetch
// A hook for handling GET requests, managing loading, error, and data states.
export const useFetch = (url) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
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
    }, [url]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { data, loading, error, retry: fetchData };
};
