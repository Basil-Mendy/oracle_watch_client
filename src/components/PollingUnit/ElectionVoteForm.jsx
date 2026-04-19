/**
 * ElectionVoteForm Component - Enter vote counts for each party
 */
import React, { useState } from 'react';
import { AlertCircle, FileText } from 'lucide-react';

const ElectionVoteForm = ({ election, voteData, onVoteChange }) => {
    const [totalVotes, setTotalVotes] = useState(0);

    const calculateTotal = () => {
        return Object.values(voteData).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    const handleVoteInput = (partyId, value) => {
        const numValue = parseInt(value) || 0;
        onVoteChange(partyId, numValue);
    };

    const getTotalVotes = () => {
        return Object.values(voteData).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    return (
        <div className="vote-form">
            {election?.parties && election.parties.length > 0 ? (
                <>
                    <div className="vote-instructions">
                        <p><FileText size={18} className="inline-icon" /> Enter the number of votes received by each party at this polling unit.</p>
                        <p style={{ fontSize: '13px', color: '#7f8c8d', marginTop: '8px' }}>
                            Ensure accuracy as these figures will be aggregated with all other polling units.
                        </p>
                    </div>

                    <div className="vote-entries">
                        {election.parties.map(party => {
                            // Handle both direct party data and nested party_details
                            const partyData = party.party_details || party;
                            const partyId = party.party || party.id;

                            return (
                                <div key={partyId} className="vote-entry">
                                    <div className="party-display">
                                        {partyData.logo_url && (
                                            <img
                                                src={partyData.logo_url}
                                                alt={partyData.acronym}
                                                className="party-logo"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <div className="party-info">
                                            <div className="party-acronym">{partyData.acronym}</div>
                                            <div className="party-name">{partyData.name}</div>
                                        </div>
                                    </div>
                                    <div className="vote-input-group">
                                        <input
                                            type="number"
                                            min="0"
                                            value={voteData[partyId] || ''}
                                            onChange={(e) => handleVoteInput(partyId, e.target.value)}
                                            placeholder="0"
                                            className="vote-input"
                                        />
                                        <span className="vote-unit">votes</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="vote-summary">
                        <div className="summary-card">
                            <span className="summary-label">Total Votes Entered:</span>
                            <span className="summary-value">{getTotalVotes()}</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="no-parties">
                    <AlertCircle size={20} style={{ color: '#dc3545' }} />
                    <p>No parties found for this election</p>
                </div>
            )}
        </div>
    );
};

export default ElectionVoteForm;
