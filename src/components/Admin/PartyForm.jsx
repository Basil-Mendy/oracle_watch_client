/**
 * Party Form Component - Create and manage political parties
 */
import React, { useState, useEffect } from 'react';
import { useElection } from '../../context/ElectionContext';
import electionService from '../../services/electionService';
import { Upload, Trash2, Star } from 'lucide-react';

const PartyForm = () => {
    const { parties, loadParties } = useElection();
    const [formData, setFormData] = useState({
        name: '',
        acronym: '',
        logo: null,
        is_starred: false,
    });
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (parties.length === 0) {
            loadParties();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;

        if (type === 'file') {
            const file = files[0];
            setFormData(prev => ({
                ...prev,
                [name]: file
            }));
            // Create preview
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoPreview(reader.result);
                };
                reader.readAsDataURL(file);
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleClearLogo = () => {
        setFormData(prev => ({
            ...prev,
            logo: null
        }));
        setLogoPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.name.trim()) {
                setMessage({ type: 'error', text: 'Party name is required' });
                setLoading(false);
                return;
            }

            if (!formData.acronym.trim()) {
                setMessage({ type: 'error', text: 'Party acronym is required' });
                setLoading(false);
                return;
            }

            // Create FormData for multipart/form-data submission
            const submitData = new FormData();
            submitData.append('name', formData.name.trim());
            submitData.append('acronym', formData.acronym.trim().toUpperCase());
            submitData.append('is_starred', formData.is_starred);

            // Append logo file if selected
            if (formData.logo) {
                submitData.append('logo', formData.logo);
            }

            await electionService.createParty(submitData);

            setMessage({ type: 'success', text: 'Party created successfully!' });
            setFormData({ name: '', acronym: '', logo: null, is_starred: false });
            setLogoPreview(null);
            await loadParties(); // Refresh list
        } catch (error) {
            console.error('Error:', error);
            const errorMsg = error.response?.data?.detail ||
                error.response?.data?.name?.[0] ||
                error.response?.data?.acronym?.[0] ||
                error.response?.data?.logo?.[0] ||
                'Failed to create party';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setLoading(false);
        }
    };

    const handleStarParty = async (partyId, shouldStar) => {
        try {
            if (shouldStar) {
                await electionService.starParty(partyId);
                setMessage({ type: 'success', text: 'Party marked as starred!' });
            } else {
                await electionService.unstarParty(partyId);
                setMessage({ type: 'success', text: 'Party unmarked as starred!' });
            }
            loadParties();
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update party status' });
        }
    };

    return (
        <div className="form-container">
            {/* Parties Grid Display */}
            {parties.length > 0 && (
                <div className="form-section">
                    <h3 className="form-section-title">Registered Parties ({parties.length})</h3>
                    <div className="parties-grid">
                        {parties.map(party => (
                            <div key={party.id} className="party-card">
                                <div className="party-logo-container">
                                    {party.logo ? (
                                        <img
                                            src={party.logo}
                                            alt={party.name}
                                            className="party-logo"
                                        />
                                    ) : (
                                        <div className="party-logo-placeholder">
                                            {party.acronym?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    {party.is_starred && (
                                        <div className="party-star-badge">⭐</div>
                                    )}
                                </div>
                                <div className="party-info">
                                    <h4 className="party-name">{party.name}</h4>
                                    <p className="party-acronym">{party.acronym}</p>
                                    <div className="party-actions">
                                        {!party.is_starred && (
                                            <button
                                                className="btn btn-small btn-primary"
                                                onClick={() => handleStarParty(party.id, true)}
                                                title="Mark as Starred"
                                            >
                                                <Star size={14} />
                                            </button>
                                        )}
                                        {party.is_starred && (
                                            <button
                                                className="btn btn-small btn-secondary"
                                                onClick={() => handleStarParty(party.id, false)}
                                                title="Unstar"
                                            >
                                                <Star size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="form-section">
                <h3 className="form-section-title">Create New Party</h3>

                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Party Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            placeholder="e.g., People's Democratic Party"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="acronym">Party Acronym *</label>
                        <input
                            type="text"
                            id="acronym"
                            name="acronym"
                            placeholder="e.g., PDP"
                            maxLength="10"
                            value={formData.acronym}
                            onChange={handleChange}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="logo">Party Logo (Optional)</label>
                        <div className="file-input-wrapper">
                            <input
                                type="file"
                                id="logo"
                                name="logo"
                                accept="image/*"
                                onChange={handleChange}
                                disabled={loading}
                                className="file-input"
                            />
                            <label htmlFor="logo" className="file-input-label">
                                <Upload size={20} />
                                <span>{formData.logo ? formData.logo.name : 'Choose Logo Image'}</span>
                            </label>
                        </div>
                        {logoPreview && (
                            <div className="logo-preview">
                                <img src={logoPreview} alt="Logo Preview" />
                                <button
                                    type="button"
                                    className="btn btn-small btn-danger"
                                    onClick={handleClearLogo}
                                >
                                    <Trash2 size={14} />
                                    Remove
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="form-group checkbox">
                        <input
                            type="checkbox"
                            id="is_starred"
                            name="is_starred"
                            checked={formData.is_starred}
                            onChange={handleChange}
                            disabled={loading}
                        />
                        <label htmlFor="is_starred">Mark as Starred (Main Party)</label>
                    </div>

                    <div className="form-buttons">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Creating...' : 'Create Party'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="form-section">
                <h3 className="form-section-title">📋 Instructions</h3>
                <ul style={{ marginLeft: '20px', color: '#7f8c8d', lineHeight: '1.8' }}>
                    <li>Create all political parties participating in the election</li>
                    <li>Only one party can be marked as "Starred" (main party)</li>
                    <li>Other parties will be displayed as "Rival" or "Regular"</li>
                    <li>Party acronyms will be auto-converted to uppercase</li>
                </ul>
            </div>
        </div>
    );
};

export default PartyForm;
