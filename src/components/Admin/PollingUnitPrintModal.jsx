/**
 * Polling Unit Print Modal - Display polling units with passwords for viewing and printing
 */
import React, { useState, useEffect } from 'react';
import { X, Download, Filter } from 'lucide-react';
import html2pdf from 'html2pdf.js';
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

    const handleDownloadPDF = () => {
        const element = document.getElementById('print-area');

        if (!element) {
            console.error('Print area not found');
            return;
        }

        // Clone the element to avoid modifying the DOM
        const clonedElement = element.cloneNode(true);

        // Remove flex constraints and overflow that html2canvas struggles with
        clonedElement.style.display = 'block';
        clonedElement.style.width = '100%';
        clonedElement.style.height = 'auto';
        clonedElement.style.overflow = 'visible';
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.flex = 'none';
        clonedElement.style.padding = '20px';
        clonedElement.style.backgroundColor = '#fff';
        clonedElement.style.color = '#000';

        // Style table for proper PDF rendering
        const table = clonedElement.querySelector('.print-table');
        if (table) {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '15px';
            table.style.fontSize = '12px';
        }

        // Ensure table rows are visible
        const rows = clonedElement.querySelectorAll('tr');
        rows.forEach(row => {
            row.style.pageBreakInside = 'avoid';
        });

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `Polling_Units_Credentials_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: 'auto', avoid: ['tr'] }
        };

        html2pdf().set(opt).from(clonedElement).save();
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
                    <div className="print-content" id="print-area">
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
                        className="btn btn-primary"
                        onClick={handleDownloadPDF}
                    >
                        <Download size={18} />
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PollingUnitPrintModal;
