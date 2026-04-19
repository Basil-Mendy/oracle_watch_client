/**
 * Polling Unit List Viewer Component - Display all polling units with ID and password reset
 */
import React, { useState, useEffect } from 'react';
import locationService from '../../services/locationService';
import PasswordResetModal from './PasswordResetModal';
import '../styles/ListViewer.css';

const PollingUnitListViewer = () => {
    const [pollingUnits, setPollingUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [lgas, setLGAs] = useState([]);
    const [wards, setWards] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPollingUnit, setSelectedPollingUnit] = useState(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    useEffect(() => {
        loadLGAs();
        loadPollingUnits();
    }, []);

    const loadLGAs = async () => {
        try {
            console.log('Loading LGAs...');
            const response = await locationService.getLGAs();
            console.log('LGAs API response:', response);
            let lgaData = response.data;
            if (Array.isArray(lgaData)) {
                console.log('LGAs response is array, count:', lgaData.length);
            } else if (lgaData?.results) {
                lgaData = lgaData.results;
                console.log('LGAs response is paginated, count:', lgaData.length);
            } else {
                lgaData = [];
            }
            setLGAs(Array.isArray(lgaData) ? lgaData : []);
        } catch (err) {
            console.error('Error loading LGAs:', err);
            setLGAs([]);
        }
    };

    const loadWards = async (lgaId) => {
        try {
            console.log('Loading wards for LGA:', lgaId);
            const response = await locationService.getWards(lgaId);
            console.log('Wards API response:', response);
            let wardData = response.data;
            if (Array.isArray(wardData)) {
                console.log('Wards response is array, count:', wardData.length);
            } else if (wardData?.results) {
                wardData = wardData.results;
                console.log('Wards response is paginated, count:', wardData.length);
            } else {
                wardData = [];
            }
            setWards(Array.isArray(wardData) ? wardData : []);
        } catch (err) {
            console.error('Error loading wards:', err);
            setWards([]);
        }
    };

    const loadPollingUnits = async (lgaId = null, wardId = null) => {
        setLoading(true);
        setError('');
        try {
            console.log('Loading polling units with lgaId:', lgaId, 'wardId:', wardId);
            const response = await locationService.getPollingUnits(lgaId, wardId);
            console.log('Polling units API response:', response);
            let unitData = response.data;
            if (Array.isArray(unitData)) {
                console.log('Response is direct array, units count:', unitData.length);
            } else if (unitData?.results) {
                unitData = unitData.results;
                console.log('Response is paginated, units count:', unitData.length);
            } else {
                console.log('Response format unexpected:', unitData);
                unitData = [];
            }
            console.log('Final polling units to set:', unitData);
            setPollingUnits(Array.isArray(unitData) ? unitData : []);
        } catch (err) {
            console.error('Error loading polling units:', err);
            setError('Failed to load polling units: ' + (err.message || 'Unknown error'));
            setPollingUnits([]);
        } finally {
            setLoading(false);
        }
    };

    const handleLGAChange = (lgaId) => {
        setSelectedLGA(lgaId);
        setSelectedWard('');
        if (lgaId) {
            loadWards(lgaId);
        } else {
            setWards([]);
        }
        loadPollingUnits(lgaId || null, null);
    };

    const handleWardChange = (wardId) => {
        setSelectedWard(wardId);
        loadPollingUnits(selectedLGA || null, wardId || null);
    };

    const handleOpenResetModal = (unit) => {
        setSelectedPollingUnit(unit);
        setIsResetModalOpen(true);
    };

    const handleCloseResetModal = () => {
        setIsResetModalOpen(false);
        setSelectedPollingUnit(null);
    };

    const handlePasswordResetSuccess = () => {
        // Refresh polling units after password reset
        loadPollingUnits(selectedLGA || null, selectedWard || null);
    };

    const handleDeleteUnit = async (unit) => {
        if (!window.confirm(`Delete polling unit "${unit.name}" (${unit.unit_id})? This action cannot be undone.`)) {
            return;
        }

        try {
            await locationService.deletePollingUnit(unit.id);
            setError('');
            loadPollingUnits(selectedLGA || null, selectedWard || null);
        } catch (err) {
            console.error('Error deleting polling unit:', err);
            setError('Failed to delete polling unit: ' + (err.message || 'Unknown error'));
        }
    };

    const downloadExcel = () => {
        // Export polling units without passwords (passwords are ephemeral - shown only on creation/reset)
        const headers = ['#', 'Unit ID', 'Name', 'Ward', 'LGA', 'Status', 'Created'];
        const rows = filteredUnits.map((unit, index) => [
            index + 1,
            unit.unit_id,
            unit.name,
            unit.ward_name || unit.ward || 'N/A',
            unit.lga_name || unit.lga || 'N/A',
            unit.is_active ? 'Active' : 'Inactive',
            new Date(unit.created_at).toLocaleDateString()
        ]);

        // Create tab-separated content (Excel-compatible)
        const csvContent = [
            headers.join('\t'),
            ...rows.map(r => r.join('\t'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `polling_units_${new Date().toISOString().split('T')[0]}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredUnits = pollingUnits.filter(unit =>
        unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        unit.unit_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="list-viewer">
            <div className="list-header">
                <h3>🏢 Polling Units in System</h3>
                <p>Total Units: {filteredUnits.length}</p>
            </div>

            <div className="list-controls">
                <button
                    className="btn btn-secondary"
                    onClick={downloadExcel}
                >
                    📊 Download Excel
                </button>
            </div>

            <div className="list-filters">
                <div className="filter-group">
                    <label>Filter by LGA</label>
                    <select
                        value={selectedLGA}
                        onChange={(e) => handleLGAChange(e.target.value)}
                    >
                        <option value="">All LGAs</option>
                        {lgas.map(lga => (
                            <option key={lga.id} value={lga.id}>
                                {lga.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Filter by Ward</label>
                    <select
                        value={selectedWard}
                        onChange={(e) => handleWardChange(e.target.value)}
                        disabled={!selectedLGA}
                    >
                        <option value="">All Wards</option>
                        {wards.map(ward => (
                            <option key={ward.id} value={ward.id}>
                                {ward.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Search</label>
                    <input
                        type="text"
                        placeholder="Search unit name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && <div className="message message-error">{error}</div>}

            {loading ? (
                <div className="loading">Loading polling units...</div>
            ) : filteredUnits.length === 0 ? (
                <div className="empty-state">
                    <p>No polling units found</p>
                </div>
            ) : (
                <div className="list-table">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Unit ID</th>
                                <th>Name</th>
                                <th>Ward</th>
                                <th>LGA</th>
                                <th>Status</th>
                                <th>Actions</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUnits.map((unit, index) => (
                                <tr key={unit.id}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <code className="unit-id">{unit.unit_id}</code>
                                    </td>
                                    <td><strong>{unit.name}</strong></td>
                                    <td>{unit.ward_name || unit.ward || 'N/A'}</td>
                                    <td>{unit.lga_name || unit.lga || 'N/A'}</td>
                                    <td>
                                        <span className={`status-badge ${unit.is_active ? 'active' : 'inactive'}`}>
                                            {unit.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn btn-small btn-warning"
                                                onClick={() => handleOpenResetModal(unit)}
                                                title="Reset password"
                                            >
                                                🔐 Reset
                                            </button>
                                            <button
                                                className="btn btn-small btn-danger"
                                                onClick={() => handleDeleteUnit(unit)}
                                                title="Delete unit"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </td>
                                    <td>{new Date(unit.created_at || '').toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <PasswordResetModal
                pollingUnit={selectedPollingUnit}
                isOpen={isResetModalOpen}
                onClose={handleCloseResetModal}
                onSuccess={handlePasswordResetSuccess}
            />
        </div>
    );
};

export default PollingUnitListViewer;
