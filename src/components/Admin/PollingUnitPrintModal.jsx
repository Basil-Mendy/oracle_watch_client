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

    const handleDownloadPDF = async () => {
        const element = document.getElementById('print-area');

        if (!element) {
            console.error('Print area not found');
            return;
        }

        try {
            // Create a container to hold the content for PDF generation
            const pdfContainer = document.createElement('div');
            pdfContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 210mm;
                background: white;
                padding: 20px;
                z-index: -9999;
                visibility: hidden;
            `;

            // Clone the print element
            const clone = element.cloneNode(true);
            
            // Apply comprehensive styles to ensure rendering
            const style = document.createElement('style');
            style.textContent = `
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body, div { background: white !important; color: black !important; }
                h2 { font-size: 18px !important; margin: 0 0 15px 0 !important; text-align: center !important; color: #000 !important; }
                .print-summary { background: #f8f9fa !important; padding: 10px !important; margin-bottom: 15px !important; border-radius: 3px !important; }
                .print-summary p { margin: 5px 0 !important; font-size: 12px !important; color: #555 !important; }
                .print-table { width: 100% !important; border-collapse: collapse !important; margin-bottom: 15px !important; font-size: 11px !important; }
                .print-table thead { background: #2c3e50 !important; color: white !important; }
                .print-table th { padding: 8px 6px !important; text-align: left !important; font-weight: 600 !important; border: 1px solid #34495e !important; color: white !important; }
                .print-table td { padding: 8px 6px !important; border: 1px solid #ddd !important; color: #000 !important; }
                .print-table tbody tr:nth-child(odd) { background: #fff !important; }
                .print-table tbody tr:nth-child(even) { background: #f8f9fa !important; }
                code { font-family: 'Courier New', monospace !important; font-size: 10px !important; padding: 2px 4px !important; display: inline-block !important; }
                code.print-code { background: #f5f5f5 !important; color: #c7254e !important; }
                code.print-password { background: #fff3cd !important; color: #856404 !important; font-weight: 600 !important; }
                .print-footer { background: #fff3cd !important; padding: 10px !important; border-radius: 3px !important; border-left: 3px solid #ffc107 !important; margin-top: 15px !important; }
                .print-footer p { margin: 0 !important; font-size: 11px !important; color: #000 !important; }
                .empty-state { text-align: center !important; padding: 20px !important; }
            `;

            pdfContainer.appendChild(style);
            pdfContainer.appendChild(clone);
            document.body.appendChild(pdfContainer);

            // Add delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            const options = {
                margin: [10, 10, 10, 10],
                filename: `Polling_Units_Credentials_${new Date().getTime()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowHeight: pdfContainer.scrollHeight
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'portrait'
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy'],
                    avoid: 'tr'
                }
            };

            // Generate PDF from the visible container
            await html2pdf().set(options).from(pdfContainer).save();

            // Cleanup
            document.body.removeChild(pdfContainer);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
            
            // Ensure cleanup even on error
            const containers = document.querySelectorAll('div[style*="z-index: -9999"]');
            containers.forEach(container => {
                try {
                    document.body.removeChild(container);
                } catch (e) {
                    // Already removed
                }
            });
        }
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
