/**
 * Election Context - Manages election and result data
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { electionService, locationService, resultService } from '../services';

const ElectionContext = createContext();

export const useElection = () => {
    const context = useContext(ElectionContext);
    if (!context) {
        throw new Error('useElection must be used within ElectionProvider');
    }
    return context;
};

export const ElectionProvider = ({ children }) => {
    const [elections, setElections] = useState([]);
    const [parties, setParties] = useState([]);
    const [lgas, setLgas] = useState([]);
    const [wards, setWards] = useState([]);
    const [pollingUnits, setPollingUnits] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load all elections
    const loadElections = useCallback(async (status = null) => {
        setLoading(true);
        try {
            const response = await electionService.getElections(status);
            const electionsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setElections(electionsData);
            setError(null);
        } catch (err) {
            console.error('Error loading elections:', err);
            setError(err.message);
            // Don't clear existing elections on error - preserve the data we have
            // Only set to empty if we have no existing data
            setElections(prev => prev.length > 0 ? prev : []);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load all parties
    const loadParties = useCallback(async () => {
        setLoading(true);
        try {
            const response = await electionService.getParties();
            const partiesData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setParties(partiesData);
            setError(null);
        } catch (err) {
            console.error('Error loading parties:', err);
            setError(err.message);
            // Don't clear existing parties on error - preserve the data we have
            setParties(prev => prev.length > 0 ? prev : []);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load all LGAs
    const loadLGAs = useCallback(async () => {
        setLoading(true);
        try {
            const response = await locationService.getLGAs();
            // Handle both array and paginated response formats
            const lgasData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setLgas(lgasData);
            setError(null);
        } catch (err) {
            console.error('Error loading LGAs:', err);
            setError(err.message);
            // Don't clear existing LGAs on error - preserve the data we have
            setLgas(prev => prev.length > 0 ? prev : []);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load wards for a specific LGA
    const loadWards = useCallback(async (lgaId) => {
        setLoading(true);
        try {
            const response = await locationService.getWards(lgaId);
            const wardsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            console.log('Wards loaded from API:', wardsData.length);
            console.log('First ward sample:', wardsData[0]);
            setWards(wardsData);
            setError(null);
        } catch (err) {
            console.error('Error loading wards:', err);
            setError(err.message);
            // Don't clear existing wards on error - preserve the data we have
            setWards(prev => prev.length > 0 ? prev : []);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load polling units
    const loadPollingUnits = useCallback(async (lgaId = null, wardId = null) => {
        setLoading(true);
        try {
            const response = await locationService.getPollingUnits(lgaId, wardId);
            const unitsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setPollingUnits(unitsData);
            setError(null);
        } catch (err) {
            console.error('Error loading polling units:', err);
            setError(err.message);
            // Don't clear existing polling units on error - preserve the data we have
            setPollingUnits(prev => prev.length > 0 ? prev : []);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load aggregated results for an election
    const loadAggregateResults = useCallback(async (electionId, level = 'lga') => {
        setLoading(true);
        try {
            const response = await resultService.getAggregateResults(electionId, level);
            const resultsData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setResults(resultsData);
            setError(null);
        } catch (err) {
            console.error('Error loading results:', err);
            setError(err.message);
            // Don't clear existing results on error - preserve the data we have
            setResults(prev => prev.length > 0 ? prev : []);
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        elections,
        parties,
        lgas,
        wards,
        pollingUnits,
        results,
        loading,
        error,
        loadElections,
        loadParties,
        loadLGAs,
        loadWards,
        loadPollingUnits,
        loadAggregateResults,
    };

    return (
        <ElectionContext.Provider value={value}>
            {children}
        </ElectionContext.Provider>
    );
};

export default ElectionContext;
