/**
 * Result Viewer Component - View and analyze election results
 */
import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useElection } from '../../context/ElectionContext';
import resultService from '../../services/resultService';
import LoadingSpinner from '../Common/LoadingSpinner';

const ResultViewer = () => {
    const { elections, lgas, loadElections, loadLGAs } = useElection();
    const [selectedElectionId, setSelectedElectionId] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [viewLevel, setViewLevel] = useState('election'); // election, lga, ward, unit
    const [selectedLGA, setSelectedLGA] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (elections.length === 0) loadElections();
        if (lgas.length === 0) loadLGAs();
    }, []);

    const fetchResults = async () => {
        if (!selectedElectionId) {
            setMessage({ type: 'error', text: 'Please select an election' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            let response;
            if (viewLevel === 'election') {
                response = await resultService.getAggregateResults(selectedElectionId, 'election');
            } else if (viewLevel === 'lga' && selectedLGA) {
                response = await resultService.getAggregateResults(selectedElectionId, 'lga', selectedLGA);
            } else {
                setMessage({ type: 'error', text: 'Please select an LGA' });
                return;
            }

            setResults(response.data);
        } catch (error) {
            console.error('Error fetching results:', error);
            setMessage({
                type: 'error',
                text: 'Failed to fetch results'
            });
        } finally {
            setLoading(false);
        }
    };

    const getCurrentElection = () => {
        return elections.find(e => e.id === selectedElectionId);
    };

    const calculateTotal = (results) => {
        if (!results) return 0;
        return Object.values(results).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    const getPartyName = (partyId) => {
        const election = getCurrentElection();
        if (!election) return 'Unknown Party';
        const party = election.parties?.find(p => p.id === partyId || p.party === partyId);
        if (!party) return 'Unknown Party';

        // Handle both direct party data and nested party_details
        const partyData = party.party_details || party;
        return partyData ? `${partyData.acronym} - ${partyData.name}` : 'Unknown Party';
    };

    return (
        <div className="form-container">
            <div className="form-section">
                <h3 className="form-section-title">View Election Results</h3>

                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="election">Select Election *</label>
                    <select
                        id="election"
                        value={selectedElectionId}
                        onChange={(e) => {
                            setSelectedElectionId(e.target.value);
                            setResults(null);
                        }}
                        disabled={loading}
                    >
                        <option value="">-- Choose an Election --</option>
                        {elections.map(election => (
                            <option key={election.id} value={election.id}>
                                {election.name} ({election.status})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>View Level</label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button
                            className={`btn ${viewLevel === 'election' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => {
                                setViewLevel('election');
                                setResults(null);
                            }}
                            disabled={loading}
                        >
                            🌍 National
                        </button>
                        <button
                            className={`btn ${viewLevel === 'lga' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => {
                                setViewLevel('lga');
                                setResults(null);
                            }}
                            disabled={loading}
                        >
                            📍 By LGA
                        </button>
                    </div>
                </div>

                {viewLevel === 'lga' && (
                    <div className="form-group">
                        <label htmlFor="lga">Select LGA</label>
                        <select
                            id="lga"
                            value={selectedLGA}
                            onChange={(e) => {
                                setSelectedLGA(e.target.value);
                                setResults(null);
                            }}
                            disabled={loading}
                        >
                            <option value="">-- Choose an LGA --</option>
                            {lgas.map(lga => (
                                <option key={lga.id} value={lga.id}>
                                    {lga.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="form-buttons">
                    <button
                        className="btn btn-primary"
                        onClick={fetchResults}
                        disabled={loading || !selectedElectionId}
                    >
                        {loading ? 'Loading...' : 'View Results'}
                    </button>
                </div>
            </div>

            {results && (
                <div className="form-section">
                    <h3 className="form-section-title">
                        <BarChart3 size={24} className="inline-icon" /> {getCurrentElection()?.name}
                        {viewLevel === 'lga' && ` - ${lgas.find(l => l.id === selectedLGA)?.name}`}
                    </h3>

                    {results.party_results && Object.keys(results.party_results).length > 0 ? (
                        <>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                {Object.entries(results.party_results).map(([partyId, votes]) => {
                                    const total = calculateTotal(results.party_results);
                                    const percentage = total > 0 ? ((votes / total) * 100).toFixed(1) : 0;
                                    return (
                                        <div
                                            key={partyId}
                                            style={{
                                                padding: '16px',
                                                border: '1px solid #ddd',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                backgroundColor: '#f8f9fa'
                                            }}
                                        >
                                            <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                                                {getPartyName(partyId)}
                                            </div>
                                            <div style={{
                                                fontSize: '32px',
                                                fontWeight: 'bold',
                                                color: 'var(--primary-color)',
                                                marginBottom: '8px'
                                            }}>
                                                {votes}
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: '#7f8c8d',
                                                backgroundColor: 'white',
                                                padding: '6px',
                                                borderRadius: '4px'
                                            }}>
                                                {percentage}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{
                                padding: '16px',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '8px',
                                borderLeft: '4px solid var(--secondary-color)',
                                marginBottom: '20px'
                            }}>
                                <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                                    Total Votes Cast
                                </div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 'bold',
                                    color: 'var(--secondary-color)'
                                }}>
                                    {calculateTotal(results.party_results)}
                                </div>
                            </div>

                            {results.polling_units_submitted && (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: '#f0f3f7',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    color: '#2c3e50'
                                }}>
                                    <strong><BarChart3 size={16} className="inline-icon" /> Data Status:</strong> Results from {results.polling_units_submitted} polling units submitted
                                </div>
                            )}

                            {results.winner && (
                                <div style={{
                                    marginTop: '20px',
                                    padding: '16px',
                                    backgroundColor: '#fff3cd',
                                    borderRadius: '8px',
                                    borderLeft: '4px solid #f39c12',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '8px' }}>
                                        LEADING PARTY
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f39c12' }}>
                                        {getPartyName(results.winner)} 🏆
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#7f8c8d',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '6px'
                        }}>
                            No results available yet for this selection.
                        </div>
                    )}
                </div>
            )}

            <div className="form-section">
                <h3 className="form-section-title">📋 Instructions</h3>
                <ul style={{ marginLeft: '20px', color: '#7f8c8d', lineHeight: '1.8' }}>
                    <li>Select an election to view its results</li>
                    <li>View overall results for the entire election</li>
                    <li>Drill down by LGA to see regional results</li>
                    <li>Results update in real-time as polling units submit data</li>
                    <li>Shows both leading parties and trailing parties</li>
                </ul>
            </div>
        </div>
    );
};

export default ResultViewer;
