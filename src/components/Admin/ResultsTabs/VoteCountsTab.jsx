/**
 * Vote Counts Tab - Shows vote submissions from polling units
 * Each polling unit in its own row with expandable party details
 * Replicates Result Center Page polling units layout
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getApiUrl } from '../../../utils/apiUrl';
import { useAuth } from '../../../context/AuthContext';
import locationService from '../../../services/locationService';
import '../../../styles/components/ResultsTabs.css';

const PARTY_COLORS = {
    LP: '#1d9e75',
    ADC: '#3266ad',
    APC: '#e6a817',
    PDP: '#e24b4a',
};

const colorFor = (acronym, idx) =>
    PARTY_COLORS[acronym?.toUpperCase()] ||
    ['#1d9e75', '#3266ad', '#e6a817', '#e24b4a', '#9b59b6', '#e67e22'][idx % 6];

const VoteCountsTab = ({ electionId }) => {
    const { user } = useAuth();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [error, setError] = useState('');
    const [expandedPUs, setExpandedPUs] = useState({});
    const [allLGAs, setAllLGAs] = useState([]);
    const [allFetchedWards, setAllFetchedWards] = useState([]);
    const [wardsFetched, setWardsFetched] = useState(false);
    const [puFetched, setPUFetched] = useState(false);
    const [lgasLoaded, setLGAsLoaded] = useState(false);

    // Load LGAs on component mount
    useEffect(() => {
        console.log('📌 VoteCountsTab mounted');
        loadLGAs();
    }, []);

    // Clear ward selection when LGA changes
    useEffect(() => {
        setSelectedWard('');
    }, [selectedLGA]);

    // Fetch all wards with results when election changes AND LGAs are loaded
    useEffect(() => {
        console.log('📌 Ward fetch effect triggered:', { electionId, lgasLoaded, wardsFetched });
        if (electionId && lgasLoaded && !wardsFetched) {
            console.log('✨ Starting ward fetch...');
            (async () => {
                await fetchWards();
                setWardsFetched(true);  // Only set to true AFTER fetchWards completes
            })();
        }
    }, [electionId, lgasLoaded, wardsFetched]);

    // Fetch all polling units once wards are loaded
    useEffect(() => {
        console.log('📌 Polling unit fetch effect triggered:', { electionId, wardsFetched });
        if (electionId && wardsFetched && !puFetched) {
            console.log('✨ Polling units fetched in fetchWards');
            setPUFetched(true);
        }
    }, [electionId, wardsFetched, puFetched]);

    // Auto-refresh results every 30 seconds to show newly approved results
    useEffect(() => {
        if (!electionId || !wardsFetched) return;

        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing vote counts...');
            (async () => {
                await fetchWards();
            })();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [electionId, wardsFetched]);

    const loadLGAs = async () => {
        try {
            console.log('🔄 Loading LGAs...');
            const response = await locationService.getLGAs();
            const lgaList = response.data || [];
            console.log(`✅ Loaded ${lgaList.length} LGAs`);
            setAllLGAs(lgaList);
            setLGAsLoaded(true);
        } catch (err) {
            console.error('Failed to load LGAs:', err);
            setLGAsLoaded(true); // Mark as loaded even if error, so we don't block forever
        }
    };

    const fetchWards = async () => {
        try {
            const token = localStorage.getItem('auth_token');

            // Fetch wards with results from all LGAs
            const allWardsWithResults = [];
            for (const lga of allLGAs) {
                try {
                    const response = await fetch(
                        getApiUrl(`/results/?election=${electionId}&level=ward&lga=${lga.id}`),
                        {
                            headers: {
                                'Authorization': `Token ${token}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`  LGA ${lga.name}: ${data.wards?.length || 0} wards`);
                        if (data.wards) {
                            // Add lga info to each ward for later filtering
                            const wardsWithLGA = data.wards.map(w => ({ ...w, lga: lga }));
                            allWardsWithResults.push(...wardsWithLGA);
                        }
                    } else {
                        console.warn(`  LGA ${lga.name}: Failed to fetch wards (${response.status})`);
                    }
                } catch (lgaErr) {
                    console.warn(`  LGA ${lga.name}: Error fetching wards:`, lgaErr);
                }
            }
            console.log(`✅ Total wards fetched: ${allWardsWithResults.length}`);
            setAllFetchedWards(allWardsWithResults);
            const allPUs = [];

            // If we have wards, fetch polling units for each ward
            if (allWardsWithResults.length > 0) {
                console.log('📍 Using fetched wards');
                for (const ward of allWardsWithResults) {
                    try {
                        const response = await fetch(
                            getApiUrl(`/results/?election=${electionId}&level=polling_unit&ward=${ward.id}`),
                            {
                                headers: {
                                    'Authorization': `Token ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            }
                        );
                        if (response.ok) {
                            const data = await response.json();
                            console.log(`  Ward ${ward.name}: ${data.polling_units?.length || 0} polling units`);
                            if (data.polling_units) {
                                allPUs.push(...data.polling_units);
                            }
                        } else {
                            console.warn(`  Ward ${ward.name}: Failed to fetch (${response.status})`);
                        }
                    } catch (wardErr) {
                        console.warn(`  Ward ${ward.name}: Error fetching polling units:`, wardErr);
                    }
                }
            } else {
                // Fallback: If no wards were returned, try fetching wards from location API
                // and then get polling units for those
                console.log('⚠️ No wards found from results API, attempting fallback from location API...');
                try {
                    for (const lga of allLGAs) {
                        try {
                            const wardResponse = await fetch(
                                getApiUrl(`/locations/wards/?lga=${lga.id}`),
                                {
                                    headers: {
                                        'Authorization': `Token ${token}`,
                                        'Content-Type': 'application/json'
                                    }
                                }
                            );
                            if (wardResponse.ok) {
                                const wardData = await wardResponse.json();
                                const wardsList = wardData.data || wardData.results || [];
                                console.log(`  LGA ${lga.name}: ${wardsList.length} wards from location API`);

                                // Now fetch polling units for each ward
                                for (const ward of wardsList) {
                                    try {
                                        const puResponse = await fetch(
                                            getApiUrl(`/results/?election=${electionId}&level=polling_unit&ward=${ward.id}`),
                                            {
                                                headers: {
                                                    'Authorization': `Token ${token}`,
                                                    'Content-Type': 'application/json'
                                                }
                                            }
                                        );
                                        if (puResponse.ok) {
                                            const puData = await puResponse.json();
                                            console.log(`    Ward ${ward.name}: ${puData.polling_units?.length || 0} PUs`);
                                            if (puData.polling_units) {
                                                allPUs.push(...puData.polling_units);
                                            }
                                        }
                                    } catch (puErr) {
                                        console.warn(`    Ward ${ward.name}: Error fetching PUs:`, puErr);
                                    }
                                }
                            }
                        } catch (lgaErr) {
                            console.warn(`  LGA ${lga.name}: Error fetching wards:`, lgaErr);
                        }
                    }
                } catch (fallbackErr) {
                    console.error('Fallback fetch failed:', fallbackErr);
                    setError('Failed to fetch results: ' + fallbackErr.message);
                }
            }

            setResults(allPUs);
            if (allPUs.length === 0) {
                setError('No vote results found for this election yet');
            } else {
                setError('');
            }
            console.log(`✅ Total polling units fetched: ${allPUs.length}`);
        } catch (err) {
            console.error('Failed to fetch polling units:', err);
            setError('Failed to fetch polling units: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter results
    const { filteredResults, submittedCount, totalRegistered } = useMemo(() => {
        console.log('🔍 Filtering results. Total results:', results.length);
        if (results.length > 0) {
            console.log('  First PU:', {
                name: results[0].name,
                unit_id: results[0].unit_id,
                total_votes: results[0].total_votes,
                has_parties: !!results[0].parties
            });
        }

        let filtered = results;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(pu =>
                pu.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                pu.unit_id?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // LGA filter
        if (selectedLGA) {
            filtered = filtered.filter(pu => {
                const puLgaId = pu.lga?.id || pu.lga;
                return puLgaId === selectedLGA;
            });
        }

        // Ward filter
        if (selectedWard) {
            filtered = filtered.filter(pu => {
                const puWardId = pu.ward?.id || pu.ward;
                return puWardId === selectedWard;
            });
        }

        // Only show PUs with results
        const withResults = filtered.filter(pu => pu.total_votes && pu.total_votes > 0);
        console.log('  After filters - withResults:', withResults.length);

        return {
            filteredResults: withResults,
            submittedCount: withResults.length,
            totalRegistered: results.filter(pu => pu.total_votes && pu.total_votes > 0).length
        };
    }, [results, searchQuery, selectedLGA, selectedWard]);

    const togglePU = (puId) => {
        setExpandedPUs(prev => ({
            ...prev,
            [puId]: !prev[puId]
        }));
    };

    // Inline styles matching Result Center Page
    const tableItemStyle = {
        padding: 10,
        borderBottom: '1px solid #eee',
        fontSize: 12,
        cursor: 'pointer',
        background: '#fff',
        transition: 'background 0.2s'
    };

    const tableItemHeaderStyle = {
        fontWeight: 700,
        color: '#222',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    const tableItemDetailsStyle = {
        fontSize: 11,
        color: '#666',
        marginTop: 6
    };

    const tableItemDropdownStyle = {
        fontSize: 11,
        marginTop: 8,
        padding: 8,
        background: '#f9f9f9',
        borderRadius: 3
    };

    const tableItemDropdownPartyStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid #eee'
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Loading polling units...</div>;
    if (error) return <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>{error}</div>;

    return (
        <div className="vote-counts-tab">
            {/* Progress Counter */}
            <div style={{ paddingBottom: 16, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#666' }}>
                Polling Units with Results: {submittedCount}/{totalRegistered}
            </div>

            {/* Filters & Search */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search polling unit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12 }}
                    />
                </div>

                <select
                    value={selectedLGA}
                    onChange={(e) => setSelectedLGA(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
                >
                    <option value="">All LGAs</option>
                    {allLGAs.map(lga => (
                        <option key={lga.id} value={lga.id}>{lga.name}</option>
                    ))}
                </select>

                <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 }}
                    disabled={!selectedLGA}
                >
                    <option value="">All Wards</option>
                    {allFetchedWards
                        .filter(w => (w.lga?.id || w.lga) === selectedLGA)
                        .map(ward => (
                            <option key={ward.id} value={ward.id}>{ward.name}</option>
                        ))
                    }
                </select>

                <button
                    onClick={() => {
                        setSearchQuery('');
                        setSelectedLGA('');
                        setSelectedWard('');
                    }}
                    style={{ padding: '6px 14px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                >
                    Reset
                </button>
            </div>

            {/* Polling Units List */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 600, border: '1px solid #eee', borderRadius: 4 }}>
                {submittedCount === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No polling units with results yet</div>
                ) : (
                    filteredResults.map(pu => (
                        <div
                            key={pu.id}
                            style={{ ...tableItemStyle, ...(expandedPUs[pu.id] ? { background: '#f5f5f5' } : {}) }}
                        >
                            <div
                                style={tableItemHeaderStyle}
                                onClick={() => togglePU(pu.id)}
                            >
                                <span>{pu.name || `PU - ${pu.unit_id}`}</span>
                                <span style={{ fontSize: 10, color: '#999' }}>{expandedPUs[pu.id] ? '▼' : '▶'}</span>
                            </div>

                            <div style={tableItemDetailsStyle}>
                                ID: {pu.unit_id} • Ward: {pu.ward?.name || 'N/A'} • LGA: {pu.lga?.name || 'N/A'}
                            </div>

                            {expandedPUs[pu.id] && (
                                <div style={tableItemDropdownStyle}>
                                    {pu.parties?.map((p, idx) => (
                                        <div key={p.id} style={tableItemDropdownPartyStyle}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                                {p.logo_url ? (
                                                    <img
                                                        src={p.logo_url}
                                                        alt={p.acronym}
                                                        style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 20, height: 20, borderRadius: '50%',
                                                        background: colorFor(p.acronym, idx),
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0
                                                    }}>
                                                        {p.acronym?.charAt(0)}
                                                    </div>
                                                )}
                                                <span style={{ fontWeight: 600, fontSize: 12 }}>{p.acronym}</span>
                                            </div>
                                            <span style={{ color: '#222', fontWeight: 700 }}>{(p.votes || 0).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default VoteCountsTab;
