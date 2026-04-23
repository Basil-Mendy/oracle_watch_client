/**
 * Polling Unit Form Component - Create polling units with modals
 * Features: Single creation, multiple creation (with LGA+Ward validation), Excel upload, View/Print with passwords
 */
import React, { useState, useEffect } from 'react';
import { useElection } from '../../context/ElectionContext';
import locationService from '../../services/locationService';
import PollingUnitListViewer from './PollingUnitListViewer';
import PollingUnitSuccessModal from './PollingUnitSuccessModal';
import PollingUnitPrintModal from './PollingUnitPrintModal';
import { Plus, Copy, Upload, Eye, X } from 'lucide-react';

const PollingUnitForm = () => {
    const { lgas, wards, loadLGAs, loadWards } = useElection();
    const [formData, setFormData] = useState({
        name: '',
        lga_id: '',
        ward_id: '',
    });
    const [filteredWards, setFilteredWards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Modal states
    const [showSingleModal, setShowSingleModal] = useState(false);
    const [showMultipleModal, setShowMultipleModal] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);

    const [bulkCount, setBulkCount] = useState(5);
    const [bulkUnitNames, setBulkUnitNames] = useState('');  // Store unit names for bulk creation
    const [excelFile, setExcelFile] = useState(null);
    const [successModal, setSuccessModal] = useState({ isOpen: false, unit: null });
    const [pollingUnitsForPrint, setPollingUnitsForPrint] = useState([]);

    useEffect(() => {
        // Load all LGAs and wards on component mount
        if (lgas.length === 0) {
            loadLGAs();
        }
        loadWards(null);
    }, []);

    useEffect(() => {
        if (formData.lga_id && wards.length > 0) {
            // Filter wards by selected LGA
            const filtered = wards.filter(w => String(w.lga) === String(formData.lga_id));
            setFilteredWards(filtered);
            setFormData(prev => ({ ...prev, ward_id: '' }));
        } else {
            setFilteredWards([]);
        }
    }, [formData.lga_id, wards]);

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
                setMessage({ type: 'error', text: 'Name is required' });
                return;
            }
            if (!formData.lga_id) {
                setMessage({ type: 'error', text: 'LGA is required' });
                return;
            }
            if (!formData.ward_id) {
                setMessage({ type: 'error', text: 'Ward is required' });
                return;
            }

            const response = await locationService.createPollingUnit({
                name: formData.name.trim(),
                lga: formData.lga_id,
                ward: formData.ward_id,
            });

            // Show success modal with the temporary password
            setSuccessModal({ isOpen: true, unit: response });
            setShowSingleModal(false);
            setFormData({ name: '', lga_id: '', ward_id: '' });
        } catch (error) {
            console.error('Error:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.detail || 'Failed to create polling unit'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleMultipleBulkCreate = async () => {
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            if (!formData.lga_id) {
                setMessage({ type: 'error', text: 'LGA is required' });
                return;
            }
            if (!formData.ward_id) {
                setMessage({ type: 'error', text: 'Ward is required' });
                return;
            }

            // Parse unit names from textarea
            const names = bulkUnitNames
                .split('\n')
                .map(name => name.trim())
                .filter(name => name.length > 0);

            if (names.length === 0) {
                setMessage({ type: 'error', text: 'Please enter at least one polling unit name' });
                return;
            }

            // Create units array with parsed names
            const units = names.map(name => ({
                name: name,
                lga_id: formData.lga_id,    // ✅ Fixed: was "lga"
                ward_id: formData.ward_id,  // ✅ Fixed: was "ward"
            }));

            await locationService.bulkCreatePollingUnits({}, units);
            setMessage({
                type: 'success',
                text: `${units.length} polling units created successfully!`
            });
            setShowMultipleModal(false);
            setBulkUnitNames('');
        } catch (error) {
            console.error('Error:', error);
            setMessage({
                type: 'error',
                text: 'Failed to create polling units'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExcelFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Accept .xlsx and .xls files
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel') {
                setExcelFile(file);
                setMessage({ type: 'success', text: 'File selected successfully' });
            } else {
                setMessage({ type: 'error', text: 'Please select a valid Excel file (.xlsx or .xls)' });
                setExcelFile(null);
            }
        }
    };

    const handleExcelUpload = async () => {
        if (!excelFile) {
            setMessage({ type: 'error', text: 'Please select an Excel file first' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('file', excelFile);

            const response = await locationService.bulkCreateFromExcel(formDataToSend);

            // Access the data from the Axios response object
            const { created_count, failed_count, errors } = response.data;

            console.log(`✅ Excel Upload Success: Created ${created_count} units, ${failed_count} failed`);
            if (errors.length > 0) {
                console.log('Failed rows:');
                errors.forEach(err => {
                    console.log(`  Row ${err.row}: ${err.error}`);
                });
            }

            setMessage({
                type: 'success',
                text: `Successfully created ${created_count} polling units from Excel file!${failed_count > 0 ? ` (${failed_count} rows failed)` : ''}`
            });

            setExcelFile(null);
            setShowExcelModal(false);

            // Reset the file input
            const fileInput = document.getElementById('excel-file-input');
            if (fileInput) fileInput.value = '';

            // Reload polling units to show new ones
            loadWards(null);
        } catch (error) {
            console.error('Error uploading Excel:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || error.response?.data?.detail || 'Failed to process Excel file'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPrintModal = async () => {
        setLoading(true);
        try {
            // Fetch all polling units with their passwords
            const response = await locationService.fetchPollingUnitPasswords();
            // Response is now a direct array, not wrapped in an object
            setPollingUnitsForPrint(Array.isArray(response.data) ? response.data : []);
            setShowPrintModal(true);
        } catch (error) {
            console.error('Error fetching polling units for print:', error);
            setMessage({
                type: 'error',
                text: 'Failed to load polling units for printing'
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
                        Create Single Unit
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowMultipleModal(true)}
                    >
                        <Copy size={18} />
                        Create Multiple Units
                    </button>
                    <button
                        className="btn btn-info"
                        onClick={() => setShowExcelModal(true)}
                    >
                        <Upload size={18} />
                        Upload Excel
                    </button>
                    <button
                        className="btn btn-success"
                        onClick={handleOpenPrintModal}
                    >
                        <Eye size={18} />
                        View & Print
                    </button>
                </div>
                {message.text && (
                    <div className={`message message-${message.type}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Single Unit Modal */}
            {showSingleModal && (
                <div className="modal-overlay" onClick={() => setShowSingleModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Single Polling Unit</h3>
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
                                    <label htmlFor="ward_id_single">Select Ward *</label>
                                    <select
                                        id="ward_id_single"
                                        name="ward_id"
                                        value={formData.ward_id}
                                        onChange={handleChange}
                                        disabled={loading || !formData.lga_id}
                                        required
                                    >
                                        <option value="">-- Choose a Ward --</option>
                                        {filteredWards.map(ward => (
                                            <option key={ward.id} value={ward.id}>
                                                {ward.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="name_single">Polling Unit Name *</label>
                                    <input
                                        type="text"
                                        id="name_single"
                                        name="name"
                                        placeholder="e.g., Primary School, Community Center"
                                        value={formData.name}
                                        onChange={handleChange}
                                        disabled={loading}
                                        required
                                    />
                                    <small>Password will be auto-generated</small>
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
                                        {loading ? 'Creating...' : 'Create Unit'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Multiple Units Modal - Only enabled when BOTH LGA and Ward are selected */}
            {showMultipleModal && (
                <div className="modal-overlay" onClick={() => setShowMultipleModal(false)}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Multiple Polling Units</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowMultipleModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-info-alert">
                                <p>⚠️ <strong>Important:</strong> You must select both an LGA and a Ward to create multiple units. All units will be created under the selected Ward in the selected LGA.</p>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleMultipleBulkCreate();
                            }}>
                                <div className="form-group">
                                    <label htmlFor="lga_id_bulk">Select LGA *</label>
                                    <select
                                        id="lga_id_bulk"
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
                                    <label htmlFor="ward_id_bulk">Select Ward *</label>
                                    <select
                                        id="ward_id_bulk"
                                        name="ward_id"
                                        value={formData.ward_id}
                                        onChange={handleChange}
                                        disabled={loading || !formData.lga_id}
                                        required
                                    >
                                        <option value="">-- Choose a Ward --</option>
                                        {filteredWards.map(ward => (
                                            <option key={ward.id} value={ward.id}>
                                                {ward.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {formData.lga_id && formData.ward_id && (
                                    <>
                                        <div className="form-group">
                                            <label htmlFor="bulkUnitNames">Polling Unit Names (One per line) *</label>
                                            <textarea
                                                id="bulkUnitNames"
                                                placeholder="Unit 1&#10;Unit 2&#10;Unit 3&#10;Unit 4&#10;Unit 5"
                                                value={bulkUnitNames}
                                                onChange={(e) => setBulkUnitNames(e.target.value)}
                                                disabled={loading}
                                                rows="8"
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '4px',
                                                    fontFamily: 'monospace',
                                                    fontSize: '14px'
                                                }}
                                            />
                                            <small>Enter each polling unit name on a separate line. Example: Primary School, Community Center, Health Clinic, etc.</small>
                                        </div>

                                        <div className="form-info-box">
                                            <p>✓ <strong>{bulkUnitNames.split('\n').filter(n => n.trim()).length} polling units</strong> will be created with auto-generated passwords under:</p>
                                            <ul style={{ marginTop: '8px' }}>
                                                <li><strong>LGA:</strong> {lgas.find(l => l.id === formData.lga_id)?.name}</li>
                                                <li><strong>Ward:</strong> {filteredWards.find(w => w.id === formData.ward_id)?.name}</li>
                                            </ul>
                                        </div>
                                    </>
                                )}

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => setShowMultipleModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loading || !formData.lga_id || !formData.ward_id || bulkUnitNames.split('\n').filter(n => n.trim()).length === 0}
                                    >
                                        {loading ? 'Creating...' : `Create ${bulkUnitNames.split('\n').filter(n => n.trim()).length} Units`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Excel Upload Modal */}
            {showExcelModal && (
                <div className="modal-overlay" onClick={() => setShowExcelModal(false)}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Upload Polling Units from Excel</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowExcelModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-info-alert">
                                <p>📋 <strong>Excel File Requirements:</strong></p>
                                <p>Upload an Excel file with the following columns (in any order):</p>
                                <ul>
                                    <li><code>lga_name</code> - Name of the LGA</li>
                                    <li><code>ward_name</code> - Name of the Ward within the LGA</li>
                                    <li><code>unit_name</code> - Name of the Polling Unit</li>
                                    <li><code>unit_id</code> (optional) - Custom polling unit ID</li>
                                </ul>
                                <p style={{ marginTop: '12px' }}><strong>Notes:</strong></p>
                                <ul>
                                    <li>LGA and Ward must already exist in the system</li>
                                    <li>Passwords are auto-generated for each unit</li>
                                    <li>Headers are case-insensitive</li>
                                </ul>
                            </div>

                            <div className="excel-upload-section" style={{ marginTop: '20px' }}>
                                <label htmlFor="excel-file-input" className="file-input-label">
                                    <div className="file-input-box">
                                        <Upload size={24} />
                                        <p>{excelFile ? excelFile.name : 'Click to select Excel file (.xlsx or .xls)'}</p>
                                    </div>
                                </label>
                                <input
                                    type="file"
                                    id="excel-file-input"
                                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                    onChange={handleExcelFileChange}
                                    disabled={loading}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: '20px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() => {
                                        setShowExcelModal(false);
                                        setExcelFile(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleExcelUpload}
                                    disabled={loading || !excelFile}
                                >
                                    {loading ? 'Uploading...' : 'Upload & Create Units'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Polling Unit List Viewer */}
            <PollingUnitListViewer />

            {/* Success Modal for displaying temporary password */}
            <PollingUnitSuccessModal
                isOpen={successModal.isOpen}
                unit={successModal.unit}
                onClose={() => setSuccessModal({ isOpen: false, unit: null })}
            />

            {/* Print/View Modal */}
            {showPrintModal && (
                <PollingUnitPrintModal
                    isOpen={showPrintModal}
                    units={pollingUnitsForPrint}
                    onClose={() => {
                        setShowPrintModal(false);
                        setPollingUnitsForPrint([]);
                    }}
                />
            )}
        </div>
    );
};


export default PollingUnitForm;
