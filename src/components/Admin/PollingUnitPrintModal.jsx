/**
 * Polling Unit Print Modal - Display polling units with passwords for viewing and printing
 */
import React, { useState, useEffect } from 'react';
import { X, Printer, Download, Filter } from 'lucide-react';
import '../../styles/components/PrintModal.css';

const PollingUnitPrintModal = ({ isOpen, units = [], onClose }) => {
    const [filteredUnits, setFilteredUnits] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [lgas, setLGAs] = useState([]);
    const [wards, setWards] = useState([]);

    useEffect(() => {
        if (units.length > 0) {
            // Extract unique LGAs and Wards
            const uniqueLGAs = [...new Set(units.map(u => u.lga_name))].filter(Boolean);
            const uniqueWards = [...new Set(units.map(u => u.ward_name))].filter(Boolean);

            setLGAs(uniqueLGAs);
            setWards(uniqueWards);
            setFilteredUnits(units);
        }
    }, [units]);

    useEffect(() => {
        // Apply filters
        let filtered = units;

        if (searchTerm) {
            filtered = filtered.filter(u =>
                u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.unit_id?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedLGA) {
            filtered = filtered.filter(u => u.lga_name === selectedLGA);
        }

        if (selectedWard) {
            filtered = filtered.filter(u => u.ward_name === selectedWard);
        }

        setFilteredUnits(filtered);
    }, [searchTerm, selectedLGA, selectedWard, units]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        // Generate a simple text-to-PDF approach or use a library
        // For now, we'll show instructions for print-to-PDF
        alert('Use your browser\'s print function (Ctrl+P or Cmd+P) and select "Save as PDF" to download');
        handlePrint();
    };

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedLGA('');
        setSelectedWard('');
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-print-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>View & Print Polling Units with Passwords</h3>
                    <button
                        className="modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Filter Controls */}
                    <div className="print-filters">
                        <div className="filter-group">
                            <label>Search Unit Name/ID</label>
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="filter-group">
                            <label>Filter by LGA</label>
                            <select
                                value={selectedLGA}
                                onChange={(e) => setSelectedLGA(e.target.value)}
                            >
                                <option value="">All LGAs ({lgas.length})</option>
                                {lgas.map(lga => (
                                    <option key={lga} value={lga}>
                                        {lga}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Filter by Ward</label>
                            <select
                                value={selectedWard}
                                onChange={(e) => setSelectedWard(e.target.value)}
                            >
                                <option value="">All Wards ({wards.length})</option>
                                {wards.map(ward => (
                                    <option key={ward} value={ward}>
                                        {ward}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            className="btn btn-small btn-secondary"
                            onClick={resetFilters}
                        >
                            <Filter size={16} />
                            Reset
                        </button>
                    </div>

                    {/* Print Content */}
                    <div className="print-content">
                        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
                            Polling Units & Credentials Report
                        </h2>

                        {filteredUnits.length === 0 ? (
                            <div className="empty-state">
                                <p>No polling units match your filters</p>
                            </div>
                        ) : (
                            <>
                                <div className="print-summary">
                                    <p><strong>Total Units Found:</strong> {filteredUnits.length}</p>
                                    <p><strong>Print Date:</strong> {new Date().toLocaleString()}</p>
                                </div>

                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Unit ID</th>
                                            <th>Unit Name</th>
                                            <th>Ward</th>
                                            <th>LGA</th>
                                            <th>Password</th>
                                            <th>Created</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUnits.map((unit, index) => (
                                            <tr key={unit.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <code className="print-code">{unit.unit_id}</code>
                                                </td>
                                                <td><strong>{unit.name}</strong></td>
                                                <td>{unit.ward_name}</td>
                                                <td>{unit.lga_name}</td>
                                                <td>
                                                    <code className="print-password">{unit.password || 'N/A'}</code>
                                                </td>
                                                <td>{new Date(unit.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="print-footer">
                                    <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
                                        ⚠️ <strong>Confidential:</strong> This document contains polling unit passwords. Keep it secure and distribute only to authorized personnel.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Modal Actions */}
                <div className="modal-actions" style={{ borderTop: '1px solid #ddd', paddingTop: '16px' }}>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleDownloadPDF}
                    >
                        <Download size={18} />
                        Download as PDF
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handlePrint}
                    >
                        <Printer size={18} />
                        Print
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PollingUnitPrintModal;
