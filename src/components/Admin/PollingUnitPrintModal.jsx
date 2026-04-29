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

        // Create a new document fragment with all content
        const printContent = element.innerHTML;

        // Create HTML string with proper styling
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; background: #ffffff; color: #000; }
                    .print-content { width: 100%; padding: 20px; }
                    h2 { font-size: 18px; margin: 0 0 15px 0; text-align: center; color: #000; }
                    .print-summary { background: #f8f9fa; padding: 10px; margin-bottom: 15px; border-radius: 3px; page-break-inside: avoid; }
                    .print-summary p { margin: 5px 0; font-size: 12px; color: #555; }
                    .print-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 11px; }
                    .print-table thead { background: #2c3e50; color: white; }
                    .print-table th { padding: 8px 6px; text-align: left; font-weight: 600; border: 1px solid #34495e; background: #2c3e50; color: white; }
                    .print-table td { padding: 8px 6px; border: 1px solid #ddd; color: #000; word-break: break-word; }
                    .print-table tbody tr { page-break-inside: avoid; }
                    .print-table tbody tr:nth-child(odd) { background: #fff; }
                    .print-table tbody tr:nth-child(even) { background: #f8f9fa; }
                    code { font-family: 'Courier New', monospace; font-size: 10px; padding: 2px 4px; border-radius: 2px; display: inline-block; }
                    code.print-code { background: #f5f5f5; color: #c7254e; }
                    code.print-password { background: #fff3cd; color: #856404; font-weight: 600; }
                    .print-footer { background: #fff3cd; padding: 10px; border-radius: 3px; border-left: 3px solid #ffc107; margin-top: 15px; page-break-inside: avoid; }
                    .print-footer p { margin: 0; font-size: 11px; color: #000; }
                    .empty-state { text-align: center; padding: 20px; }
                    @page { margin: 10mm; }
                    @media print {
                        body { background: white; }
                        .print-table { page-break-inside: avoid; }
                        tr { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="print-content">
                    ${printContent}
                </div>
            </body>
            </html>
        `;

        // Create a blob from HTML
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        
        iframe.onload = function() {
            try {
                const opt = {
                    margin: [10, 10, 10, 10],
                    filename: `Polling_Units_Credentials_${new Date().getTime()}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        logging: false
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak: { mode: 'avoid', avoid: 'tr' }
                };

                // Get the HTML element from iframe
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                html2pdf().set(opt).from(iframeDoc.body).save();
            } finally {
                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                }, 500);
            }
        };

        document.body.appendChild(iframe);
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
