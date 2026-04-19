/**
 * Ward List Viewer Component - Display all wards in the system
 */
import React, { useState, useEffect } from 'react';
import locationService from '../../services/locationService';
import '../styles/ListViewer.css';

const WardListViewer = () => {
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [lgas, setLGAs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadLGAs();
        loadWards();
    }, []);

    const loadLGAs = async () => {
        try {
            const response = await locationService.getLGAs();
            // Handle both paginated and non-paginated responses
            let lgaData = response.data;
            if (Array.isArray(lgaData)) {
                // Direct array response
            } else if (lgaData?.results) {
                // Paginated response
                lgaData = lgaData.results;
            } else {
                // Fallback
                lgaData = [];
            }
            setLGAs(Array.isArray(lgaData) ? lgaData : []);
        } catch (err) {
            console.error('Error loading LGAs:', err);
            setLGAs([]);
        }
    };

    const loadWards = async () => {
        setLoading(true);
        setError('');
        try {
            const lgaId = selectedLGA || null;
            const response = await locationService.getWards(lgaId);
            // Handle both paginated and non-paginated responses
            let wardData = response.data;
            if (Array.isArray(wardData)) {
                // Direct array response
            } else if (wardData?.results) {
                // Paginated response - extract results array
                wardData = wardData.results;
            } else {
                // Fallback
                wardData = [];
            }
            setWards(Array.isArray(wardData) ? wardData : []);
        } catch (err) {
            console.error('Error loading wards:', err);
            setError('Failed to load wards');
            setWards([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWards();
    }, [selectedLGA]);

    const filteredWards = wards.filter(ward =>
        ward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.lga_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="list-viewer">
            <div className="list-header">
                <h3>📍 Wards in System</h3>
                <p>Total Wards: {filteredWards.length}</p>
            </div>

            <div className="list-filters">
                <div className="filter-group">
                    <label>Filter by LGA</label>
                    <select
                        value={selectedLGA}
                        onChange={(e) => setSelectedLGA(e.target.value)}
                    >
                        <option value="">All LGAs</option>
                        {Array.isArray(lgas) && lgas.map(lga => (
                            <option key={lga.id} value={lga.id}>
                                {lga.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Search</label>
                    <input
                        type="text"
                        placeholder="Search ward name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {error && <div className="message message-error">{error}</div>}

            {loading ? (
                <div className="loading">Loading wards...</div>
            ) : filteredWards.length === 0 ? (
                <div className="empty-state">
                    <p>No wards found</p>
                </div>
            ) : (
                <div className="list-table">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Ward Name</th>
                                <th>LGA</th>
                                <th>Polling Units</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredWards.map((ward, index) => (
                                <tr key={ward.id}>
                                    <td>{index + 1}</td>
                                    <td><strong>{ward.name}</strong></td>
                                    <td>{ward.lga_name}</td>
                                    <td>
                                        <span className="badge">{ward.polling_unit_count}</span>
                                    </td>
                                    <td>{new Date(ward.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default WardListViewer;
