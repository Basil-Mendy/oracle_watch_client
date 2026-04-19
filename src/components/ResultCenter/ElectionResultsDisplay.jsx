/**
 * ElectionResultsDisplay Component - Show results by view level
 */
import React, { useState, useEffect } from 'react';
import { BarChart3, Check } from 'lucide-react';
import resultService from '../../services/resultService';
import ResultCard from './ResultCard';
import LoadingSpinner from '../Common/LoadingSpinner';

const ElectionResultsDisplay = ({
    election,
    viewLevel,
    selectedLGA,
    lgas
}) => {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!election) return;

        const fetchResults = async () => {
            setLoading(true);
            setError('');
            try {
                let response;
                if (viewLevel === 'national') {
                    response = await resultService.getAggregateResults(election.id, 'election');
                } else if (viewLevel === 'lga' && selectedLGA) {
                    response = await resultService.getAggregateResults(
                        election.id,
                        'lga',
                        selectedLGA
                    );
                }

                if (response) {
                    setResults(response.data);
                }
            } catch (err) {
                console.error('Error fetching results:', err);
                setError('Failed to load results');
            } finally {
                setLoading(false);
            }
        };

        if (viewLevel === 'lga' && !selectedLGA) {
            setResults(null);
            return;
        }

        fetchResults();
    }, [election, viewLevel, selectedLGA]);

    const getViewTitle = () => {
        if (viewLevel === 'national') {
            return `${election?.name} - National Results`;
        } else if (viewLevel === 'lga' && selectedLGA) {
            const lgaName = lgas.find(l => l.id === selectedLGA)?.name;
            return `${election?.name} - ${lgaName}`;
        }
        return election?.name;
    };

    const calculateTotal = (partyResults) => {
        if (!partyResults) return 0;
        return Object.values(partyResults).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    const getSortedParties = () => {
        if (!results?.party_results) return [];

        return Object.entries(results.party_results)
            .map(([partyId, votes]) => ({
                partyId,
                votes: parseInt(votes) || 0
            }))
            .sort((a, b) => b.votes - a.votes);
    };

    const getPartyDetails = (partyId) => {
        const party = election?.parties?.find(p => p.id === partyId);
        return party || { name: 'Unknown Party', acronym: 'UNK' };
    };

    const totalVotes = calculateTotal(results?.party_results);
    const sortedParties = getSortedParties();
    const leadingParty = sortedParties[0];

    if (!election) {
        return (
            <div className="results-container">
                <p className="no-results">Select an election to view results</p>
            </div>
        );
    }

    if (viewLevel === 'lga' && !selectedLGA) {
        return (
            <div className="results-container">
                <p className="no-results">Select an LGA to view results</p>
            </div>
        );
    }

    return (
        <div className="results-container">
            <div className="results-header-bar">
                <h2>{getViewTitle()}</h2>
                {loading && <LoadingSpinner />}
            </div>

            {error && (
                <div className="results-error">
                    <p>{error}</p>
                </div>
            )}

            {!loading && results && (
                <>
                    {/* Results Stats */}
                    <div className="results-stats">
                        <div className="stat-box">
                            <div className="stat-label">Total Votes</div>
                            <div className="stat-value">{totalVotes.toLocaleString()}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">Parties Competing</div>
                            <div className="stat-value">{sortedParties.length}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">Polling Units Reporting</div>
                            <div className="stat-value">{results.polling_units_submitted || 0}</div>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="results-grid">
                        {sortedParties.map((result, index) => {
                            const party = getPartyDetails(result.partyId);
                            const percentage = totalVotes > 0
                                ? ((result.votes / totalVotes) * 100).toFixed(1)
                                : 0;
                            const isLeading = index === 0;

                            return (
                                <ResultCard
                                    key={result.partyId}
                                    rank={index + 1}
                                    party={party}
                                    votes={result.votes}
                                    percentage={parseFloat(percentage)}
                                    totalVotes={totalVotes}
                                    isLeading={isLeading}
                                />
                            );
                        })}
                    </div>

                    {/* Detailed Results Table */}
                    {sortedParties.length > 0 && (
                        <div className="results-table-section">
                            <h3>Detailed Vote Distribution</h3>
                            <div className="results-table-wrapper">
                                <table className="results-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Party</th>
                                            <th>Acronym</th>
                                            <th>Votes</th>
                                            <th>Percentage</th>
                                            <th>Bar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedParties.map((result, index) => {
                                            const party = getPartyDetails(result.partyId);
                                            const percentage = totalVotes > 0
                                                ? ((result.votes / totalVotes) * 100).toFixed(1)
                                                : 0;

                                            return (
                                                <tr key={result.partyId} className={index === 0 ? 'leading' : ''}>
                                                    <td className="rank">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                                                    <td className="party-name">{party.name}</td>
                                                    <td className="party-acronym"><strong>{party.acronym}</strong></td>
                                                    <td className="votes"><strong>{result.votes.toLocaleString()}</strong></td>
                                                    <td className="percentage">{percentage}%</td>
                                                    <td className="bar">
                                                        <div className="progress-bar">
                                                            <div
                                                                className="progress-fill"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    background: index === 0 ? '#f39c12' : '#1abc9c'
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Leader Announcement */}
                    {leadingParty && (
                        <div className="leader-announcement">
                            <div className="trophy">🏆</div>
                            <div className="leader-info">
                                <h3>Current Leader</h3>
                                <p className="leader-party">
                                    {getPartyDetails(leadingParty.partyId).name}
                                </p>
                                <p className="leader-votes">
                                    {leadingParty.votes.toLocaleString()} votes
                                    ({((leadingParty.votes / totalVotes) * 100).toFixed(1)}%)
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Data Quality Info */}
                    <div className="data-quality-info">
                        <h4><BarChart3 size={20} className="inline-icon" /> Data Quality</h4>
                        <ul>
                            <li><Check size={18} className="inline-icon" /> Results update every 30 seconds</li>
                            <li><Check size={18} className="inline-icon" /> Verified from polling unit agents</li>
                            <li><Check size={18} className="inline-icon" /> {results.polling_units_submitted || 0} polling units have reported</li>
                            <li><Check size={18} className="inline-icon" /> Last updated: {new Date().toLocaleTimeString()}</li>
                        </ul>
                    </div>
                </>
            )}

            {loading && (
                <div className="results-loading">
                    <LoadingSpinner />
                    <p>Loading results...</p>
                </div>
            )}
        </div>
    );
};

export default ElectionResultsDisplay;
