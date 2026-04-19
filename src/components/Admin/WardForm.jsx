/**
 * Ward Form Component - Create new wards
 */
import React, { useState, useEffect } from 'react';
import { useElection } from '../../context/ElectionContext';
import locationService from '../../services/locationService';
import WardListViewer from './WardListViewer';
import { Plus, Copy, X } from 'lucide-react';

const WardForm = () => {
    const { lgas, loadLGAs } = useElection();
    const [formData, setFormData] = useState({
        name: '',
        lga_id: '',
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [bulkWardNames, setBulkWardNames] = useState('Ward A\nWard B\nWard C');
    const [showSingleModal, setShowSingleModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);

    useEffect(() => {
        if (lgas.length === 0) {
            loadLGAs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.name.trim()) {
                setMessage({ type: 'error', text: 'Ward name is required' });
                return;
            }

            if (!formData.lga_id) {
                setMessage({ type: 'error', text: 'LGA is required' });
                return;
            }

            await locationService.createWard({
                name: formData.name.trim(),
                lga: formData.lga_id
            });

            setMessage({ type: 'success', text: 'Ward created successfully!' });
            setFormData({ name: '', lga_id: '' });
        } catch (error) {
            console.error('Error creating ward:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Failed to create ward'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleBulkCreate = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.lga_id) {
                setMessage({ type: 'error', text: 'LGA is required' });
                return;
            }

            const wardNames = bulkWardNames
                .split('\n')
                .map(name => name.trim())
                .filter(name => name.length > 0);

            if (wardNames.length === 0) {
                setMessage({ type: 'error', text: 'Please enter at least one ward name' });
                return;
            }

            let successCount = 0;
            for (const wardName of wardNames) {
                try {
                    await locationService.createWard({
                        name: wardName,
                        lga: formData.lga_id
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed to create ward "${wardName}":`, err);
                }
            }

            setMessage({
                type: 'success',
                text: `${successCount} of ${wardNames.length} wards created successfully!`
            });
            setBulkWardNames('Ward A\nWard B\nWard C');
            setShowBulkModal(false);
        } catch (error) {
            console.error('Error creating wards:', error);
            setMessage({
                type: 'error',
                text: 'Failed to create wards'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            {/* Action Buttons at Top */}
            <div className="form-actions-bar">
                <div className="form-actions-buttons">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowSingleModal(true)}
                    >
                        <Plus size={18} />
                        Create Single Ward
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowBulkModal(true)}
                    >
                        <Copy size={18} />
                        Create Multiple Wards
                    </button>
                </div>
                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Single Ward Modal */}
            {showSingleModal && (
                <div className="modal-overlay" onClick={() => setShowSingleModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Single Ward</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowSingleModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => {
                                handleSubmit(e);
                                setShowSingleModal(false);
                            }}>
                                <div className="form-group">
                                    <label htmlFor="lga_id_single">Select LGA *</label>
                                    <select
                                        id="lga_id_single"
                                        name="lga_id"
                                        value={formData.lga_id}
                                        onChange={handleChange}
                                        disabled={loading}
                                        required
                                    >
                                        <option value="">-- Choose an LGA --</option>
                                        {lgas.map(lga => (
                                            <option key={lga.id} value={lga.id}>
                                                {lga.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="name_single">Ward Name *</label>
                                    <input
                                        type="text"
                                        id="name_single"
                                        name="name"
                                        placeholder="e.g., Ward A, Ward B"
                                        value={formData.name}
                                        onChange={handleChange}
                                        disabled={loading}
                                        required
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => setShowSingleModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Creating...' : 'Create Ward'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Ward Modal */}
            {showBulkModal && (
                <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Multiple Wards</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowBulkModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleBulkCreate();
                            }}>
                                <div className="form-group">
                                    <label htmlFor="lga_id_bulk">Select LGA *</label>
                                    <select
                                        id="lga_id_bulk"
                                        value={formData.lga_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lga_id: e.target.value }))}
                                        disabled={loading}
                                        required
                                    >
                                        <option value="">-- Choose an LGA --</option>
                                        {lgas.map(lga => (
                                            <option key={lga.id} value={lga.id}>
                                                {lga.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="bulkWardNames">Ward Names (one per line) *</label>
                                    <p style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '8px' }}>
                                        Create multiple wards at once. Enter one ward name per line.
                                    </p>
                                    <textarea
                                        id="bulkWardNames"
                                        value={bulkWardNames}
                                        onChange={(e) => setBulkWardNames(e.target.value)}
                                        disabled={loading}
                                        placeholder="Ward A&#10;Ward B&#10;Ward C"
                                        rows="8"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            fontSize: '14px',
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => setShowBulkModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading || !formData.lga_id}
                                    >
                                        {loading ? 'Creating...' : 'Create All Wards'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Ward List Viewer */}
            <WardListViewer />
        </div>
    );
};

export default WardForm;
