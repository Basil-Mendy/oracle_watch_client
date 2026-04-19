/**
 * Election Form Component - Create and manage elections
 */
import React, { useState, useEffect } from 'react';
import { useElection } from '../../context/ElectionContext';
import electionService from '../../services/electionService';

const ElectionForm = () => {
    const { elections, parties, loadElections, loadParties } = useElection();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        election_date: '',
        status: 'upcoming',
    });
    const [selectedParties, setSelectedParties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [expandedElection, setExpandedElection] = useState(null);

    useEffect(() => {
        if (elections.length === 0) loadElections();
        if (parties.length === 0) loadParties();
    }, []);

    // Auto-refresh elections every 30 seconds to catch status changes (upcoming → active)
    useEffect(() => {
        const interval = setInterval(() => {
            loadElections();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [loadElections]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const convertDatetimeToISO = (datetimeLocalValue) => {
        // datetime-local returns format: "2026-04-13T14:30" (in user's local timezone)
        // We need to convert this to UTC ISO format to send to backend
        if (!datetimeLocalValue) return '';

        // Parse the datetime-local value
        const [datePart, timePart] = datetimeLocalValue.split('T');
        if (!datePart || !timePart) return '';

        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes] = timePart.split(':').map(Number);

        // Create a Date object from local time values
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);

        // getTime() returns milliseconds since epoch (accounts for timezone automatically)
        // toISOString() converts back to UTC ISO format
        return localDate.toISOString();
    };

    const handlePartyToggle = (partyId) => {
        setSelectedParties(prev => {
            if (prev.includes(partyId)) {
                return prev.filter(id => id !== partyId);
            } else {
                return [...prev, partyId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.name.trim()) {
                setMessage({ type: 'error', text: 'Election name is required' });
                return;
            }

            if (!formData.election_date) {
                setMessage({ type: 'error', text: 'Election date is required' });
                return;
            }

            if (selectedParties.length === 0) {
                setMessage({ type: 'error', text: 'Select at least one party' });
                return;
            }

            // Create election with proper ISO datetime
            const electionData = {
                name: formData.name.trim(),
                election_date: convertDatetimeToISO(formData.election_date),
                status: formData.status,
            };

            if (formData.description.trim()) {
                electionData.description = formData.description.trim();
            }

            const electionResponse = await electionService.createElection(electionData);
            const electionId = electionResponse.data.id;

            // Add parties to election
            const partiesResponse = await electionService.addPartiesToElection(electionId, selectedParties);

            setMessage({
                type: 'success',
                text: `Election created successfully with ${selectedParties.length} parties!`
            });

            // Refresh elections to show the newly created election with parties
            setTimeout(() => {
                loadElections();
            }, 500);

            setFormData({
                name: '',
                description: '',
                election_date: '',
                status: 'upcoming',
            });
            setSelectedParties([]);
            loadElections(); // Refresh list
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = error.response?.data?.detail ||
                error.response?.data?.name?.[0] ||
                'Failed to create election';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    const handleEndElection = async (electionId) => {
        if (window.confirm('Are you sure you want to end this election?')) {
            try {
                await electionService.endElection(electionId);
                setMessage({ type: 'success', text: 'Election ended successfully!' });
                loadElections();
            } catch (error) {
                setMessage({ type: 'error', text: 'Failed to end election' });
            }
        }
    };

    return (
        <div className="form-container">
            <div className="form-section">
                <h3 className="form-section-title">Create New Election</h3>

                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Election Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="e.g., Gubernatorial Election 2026"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="election_date">Election Date *</label>
                        <input
                            type="datetime-local"
                            id="election_date"
                            name="election_date"
                            value={formData.election_date}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description (Optional)</label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Add any additional information about this election"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="active">Active</option>
                            <option value="ended">Ended</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Select Parties to Include * ({selectedParties.length} selected)</label>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            marginTop: '12px'
                        }}>
                            {parties.map(party => (
                                <label
                                    key={party.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        border: selectedParties.includes(party.id)
                                            ? '2px solid var(--primary-color)'
                                            : '1px solid #ddd',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        backgroundColor: selectedParties.includes(party.id)
                                            ? 'rgba(26, 188, 156, 0.05)'
                                            : 'white'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedParties.includes(party.id)}
                                        onChange={() => handlePartyToggle(party.id)}
                                        disabled={loading}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{party.acronym}</div>
                                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                                            {party.name}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-buttons">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Election'}
                        </button>
                    </div>
                </form>
            </div>

            {elections.length > 0 && (
                <div className="form-section">
                    <h3 className="form-section-title">Elections ({elections.length})</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {elections.map(election => (
                            <div
                                key={election.id}
                                style={{
                                    padding: '12px',
                                    borderBottom: '1px solid #eee',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setExpandedElection(
                                    expandedElection === election.id ? null : election.id
                                )}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <strong>{election.name}</strong>
                                        <span style={{
                                            marginLeft: '10px',
                                            padding: '4px 8px',
                                            borderRadius: '3px',
                                            fontSize: '12px',
                                            backgroundColor: election.status === 'active'
                                                ? '#d4edda'
                                                : election.status === 'ended'
                                                    ? '#e2e3e5'
                                                    : '#fff3cd',
                                            color: election.status === 'active'
                                                ? '#155724'
                                                : election.status === 'ended'
                                                    ? '#383d41'
                                                    : '#856404'
                                        }}>
                                            {election.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        {election.status !== 'ended' && (
                                            <button
                                                className="btn btn-small btn-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEndElection(election.id);
                                                }}
                                            >
                                                End
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedElection === election.id && (
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '13px', color: '#7f8c8d' }}>
                                        <p><strong>Date:</strong> {new Date(election.election_date).toLocaleString()}</p>
                                        {election.description && <p><strong>Description:</strong> {election.description}</p>}
                                        <p><strong>Parties:</strong> {election.parties?.length || 0} parties</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="form-section">
                <h3 className="form-section-title">📋 Instructions</h3>
                <ul style={{ marginLeft: '20px', color: '#7f8c8d', lineHeight: '1.8' }}>
                    <li>Create elections with a specific date/time</li>
                    <li>Select all parties that will participate</li>
                    <li>Status auto-updates: upcoming→active at election time→end manually</li>
                    <li>Once ended, polling units can no longer submit results</li>
                </ul>
            </div>
        </div>
    );
};

export default ElectionForm;
