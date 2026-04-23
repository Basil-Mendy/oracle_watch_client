/**
 * ResultCenterPage - Abia Election Results Dashboard
 * Matches oracle_watch_result_page.jpeg design exactly
 * Layout: Header → Party Bar → 3 Charts → Polling Unit Won → Ward/PU Tables → Footer
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useElection } from '../context/ElectionContext';
import Header from '../components/Common/Header';
import Footer from '../components/Common/Footer';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

/* ─── Party colour map ─────────────────────────────────────── */
const PARTY_COLORS = {
  LP: '#1d9e75',
  ADC: '#3266ad',
  APC: '#e6a817',
  PDP: '#e24b4a',
};
const colorFor = (acronym, idx) =>
  PARTY_COLORS[acronym?.toUpperCase()] ||
  ['#1d9e75', '#3266ad', '#e6a817', '#e24b4a', '#9b59b6', '#e67e22'][idx % 6];

/* ─── Helpers ──────────────────────────────────────────────── */
const pct = (votes, total) => (total > 0 ? ((votes / total) * 100).toFixed(1) : '0.0');

/* ─── Styles (inline so the file is self-contained) ────────── */
const S = {
  page: { background: '#f0f0f0', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
  /* hero */
  hero: {
    background: '#1a2744', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px', flexWrap: 'wrap', gap: 10,
  },
  heroTitle: { fontSize: 20, fontWeight: 700, letterSpacing: 0.5, minWidth: 200 },
  heroDate: { fontSize: 14, color: '#ccc' },
  /* party carousel */
  partyBar: {
    background: '#1d9e75',
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 14px', overflowX: 'auto',
  },
  partyItem: {
    background: '#fff', borderRadius: 6,
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 14px', minWidth: 160, flex: '1 0 auto',
  },
  partyLogo: {
    width: 40, height: 40, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  partyVotes: { fontSize: 20, fontWeight: 700, color: '#222' },
  partyAcronym: { fontSize: 13, color: '#666', marginTop: 2 },
  navArrow: {
    background: '#fff', border: 'none', borderRadius: '50%',
    width: 32, height: 32, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginLeft: 'auto',
    fontSize: 14,
  },
  /* charts row */
  chartsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 14, padding: '14px 16px',
  },
  chartCard: { background: '#fff', borderRadius: 6, padding: 14 },
  chartTitle: {
    fontSize: 12, fontWeight: 700, textAlign: 'center',
    marginBottom: 10, color: '#222', letterSpacing: 0.3,
  },
  legendRow: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginTop: 8,
  },
  legendItem: {
    fontSize: 10, color: '#555',
    display: 'flex', alignItems: 'center', gap: 3,
  },
  legendDot: { width: 9, height: 9, borderRadius: 2, display: 'inline-block' },
  wardTotal: { textAlign: 'center', fontSize: 11, color: '#555', marginTop: 8, fontWeight: 700 },
  /* polling unit won */
  pollingSection: {
    background: '#fff', margin: '0 16px 14px',
    borderRadius: 6, padding: 14,
  },
  pollingTitle: { fontSize: 12, fontWeight: 700, textAlign: 'center', marginBottom: 12, color: '#222' },
  pollingBars: { display: 'flex', gap: 0, alignItems: 'stretch', height: 40, borderRadius: 5, overflow: 'hidden' },
  pollingBar: (flex, bg) => ({
    flex: flex > 0 ? flex : 0, background: bg, borderRadius: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 8px', color: '#fff', fontWeight: 700, fontSize: 12, minWidth: flex > 0.05 ? 'auto' : 0,
  }),
  pollingBarUnfilled: (flex) => ({
    flex: flex > 0 ? flex : 0, background: '#e0e0e0', borderRadius: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 8px', color: '#999', fontWeight: 700, fontSize: 12, minWidth: flex > 0.05 ? 'auto' : 0,
  }),
  pollingCounts: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  pollingCount: (flex) => ({
    flex: flex > 0 ? flex : 0, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#222', minWidth: 60,
  }),
  /* tables row */
  tablesRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 14, padding: '0 16px 14px',
  },
  tableCard: {
    background: '#fff', borderRadius: 6, padding: 20,
    minHeight: 160, display: 'flex', flexDirection: 'column', gap: 12,
  },
  tablePlaceholder: { color: '#888', fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.5 },
  tableSub: { color: '#888', fontSize: 11, textAlign: 'center', marginTop: 8 },
  tableHeader: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tableSearchInput: { flex: 1, minWidth: 150, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 },
  tableFilterSelect: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, fontSize: 12 },
  tableList: { flex: 1, overflowY: 'auto', maxHeight: 400 },
  tableItem: { padding: 10, borderBottom: '1px solid #eee', fontSize: 12, cursor: 'pointer', background: '#fff', transition: 'background 0.2s' },
  tableItemHover: { background: '#f5f5f5' },
  tableItemHeader: { fontWeight: 700, color: '#222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  tableItemDetails: { fontSize: 11, color: '#666', marginTop: 6 },
  tableItemDropdown: { fontSize: 11, marginTop: 8, padding: 8, background: '#f9f9f9', borderRadius: 3 },
  tableItemDropdownParty: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #eee' },
  footer: {
    background: '#1a2744', color: '#fff', textAlign: 'center',
    padding: 18, fontSize: 16, fontWeight: 700, letterSpacing: 2, marginTop: 4,
  },
};

/* ─── LGA horizontal stacked bar (pure SVG, no lib needed) ── */
const LGAChart = ({ parties = [], lgas = [] }) => {
  const barH = 14, gap = 8, labelW = 110, chartW = 260, top = 20;
  const height = top + lgas.length * (barH + gap) + 10;

  // Find max total votes across all LGAs for consistent scaling
  const maxTotal = Math.max(
    ...lgas.map(lga => parties.reduce((s, p) => s + (lga[p.acronym] || 0), 0)),
    1
  );

  return (
    <svg viewBox={`0 0 ${labelW + chartW + 10} ${height}`} width="100%" height={height}>
      {/* axis labels */}
      {[0, 20, 40, 60, 80, 100, 120].map(v => (
        <g key={v}>
          <line x1={labelW + (v / 120) * chartW} y1={top - 6}
            x2={labelW + (v / 120) * chartW} y2={height - 10}
            stroke="#eee" strokeWidth={0.8} />
          <text x={labelW + (v / 120) * chartW} y={top - 8}
            textAnchor="middle" fontSize={7} fill="#888">{v}</text>
        </g>
      ))}

      {lgas.map((lga, i) => {
        const y = top + i * (barH + gap);
        let x = labelW;
        const total = parties.reduce((s, p) => s + (lga[p.acronym] || 0), 0) || 1;

        return (
          <g key={lga.name}>
            <text x={labelW - 4} y={y + barH / 2 + 3.5}
              textAnchor="end" fontSize={7} fill="#333">{lga.name}</text>
            {parties.map((p, pi) => {
              const votes = lga[p.acronym] || 0;
              const w = (votes / maxTotal) * chartW;
              if (w > 0) {
                return <rect key={p.acronym} x={x} y={y} width={w} height={barH}
                  fill={colorFor(p.acronym, pi)} />;
              }
              x += w;
              return null;
            })}
          </g>
        );
      })}
    </svg>
  );
};

/* ─── Main Component ───────────────────────────────────────── */
const ResultCenterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const electionId = searchParams.get('election');
  const { elections, lgas: lgaList, loadElections, loadLGAs, aggregateResults } = useElection();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [electionsLoaded, setElectionsLoaded] = useState(false);
  const [wards, setWards] = useState([]);
  const [pollingUnits, setPollingUnits] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [puLoading, setPULoading] = useState(false);
  const [wardSearch, setWardSearch] = useState('');
  const [puSearch, setPUSearch] = useState('');
  const [selectedWardLGA, setSelectedWardLGA] = useState('');
  const [selectedPULGA, setSelectedPULGA] = useState('');
  const [selectedPUWard, setSelectedPUWard] = useState('');
  const [expandedWard, setExpandedWard] = useState(null);
  const [expandedPU, setExpandedPU] = useState(null);
  const [puWards, setPUWards] = useState([]);
  const [wardsFetched, setWardsFetched] = useState(false);  // Prevent redundant fetches
  const [puFetched, setPUFetched] = useState(false);  // Prevent redundant fetches

  const currentElection = elections.find(e => String(e.id) === String(electionId));

  /* ─── FETCH FUNCTIONS (must be defined before useEffects) ─── */
  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/results/?election=${electionId}&level=state`));
      const data = await res.json();
      if (!data.error) {
        // Transform state-level data - use real backend values
        const transformedData = {
          parties: data.parties || [],
          total_votes: data.total_votes || 0,
          total_wards: 184,
          total_polling_units: 4062,
          lgas: data.lgas || [],
        };

        // Use REAL polling_unit_wins from backend
        const partyWins = {};
        data.parties?.forEach(p => {
          // Use polling_wins from backend, fallback to 0 if not available
          partyWins[p.acronym] = p.polling_wins || p.polling_unit_wins || 0;
        });
        transformedData.polling_unit_wins = partyWins;

        console.log('📊 Results updated:', {
          parties: data.parties?.length,
          totalVotes: data.total_votes,
          partyWins: partyWins
        });

        setResults(transformedData);
      }
      setLastUpdated(new Date());
    } catch (e) {
      console.error('❌ Error fetching results:', e);
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  const fetchWards = useCallback(async (lgaId = '') => {
    setWardsLoading(true);
    try {
      let wardsList = [];

      if (lgaId && electionId) {
        // Fetch wards for a specific LGA with result data
        const url = getApiUrl(`/results/?election=${electionId}&level=ward&lga=${lgaId}`);
        const res = await fetch(url);
        const data = await res.json();

        if (data.wards && Array.isArray(data.wards)) {
          wardsList = data.wards;
        }
      } else if (electionId) {
        // Fetch ALL wards that have results by querying EACH LGA
        // This is a one-time fetch that happens on mount
        try {
          // First get all LGAs
          const lgaRes = await fetch(getApiUrl('/locations/lgas/'));
          const lgas = await lgaRes.json();

          // Then fetch wards for each LGA
          for (const lga of (Array.isArray(lgas) ? lgas : lgas.results || [])) {
            try {
              const wardUrl = getApiUrl(`/results/?election=${electionId}&level=ward&lga=${lga.id}`);
              const wardRes = await fetch(wardUrl);
              const wardData = await wardRes.json();

              if (wardData.wards && Array.isArray(wardData.wards)) {
                wardsList = wardsList.concat(wardData.wards);
              }
            } catch (err) {
              console.warn(`Failed to fetch wards for LGA ${lga.id}:`, err);
            }
          }
        } catch (err) {
          console.error('Failed to fetch LGAs:', err);
        }
      }

      console.log(`📊 Fetched ${wardsList.length} wards with results`);
      setWards(wardsList);
    } catch (e) {
      console.error('Failed to fetch wards:', e);
      setWards([]);
    } finally {
      setWardsLoading(false);
    }
  }, [electionId]);

  const fetchPUWards = useCallback(async (lgaId = '') => {
    try {
      const url = getApiUrl(`/locations/wards/?lga=${lgaId}`);
      const res = await fetch(url);
      const data = await res.json();
      setPUWards(Array.isArray(data) ? data : data.wards || []);
    } catch (e) {
      console.error('Failed to fetch polling unit wards:', e);
      setPUWards([]);
    }
  }, []);

  const fetchPollingUnits = useCallback(async (wardId = '', lgaId = '') => {
    setPULoading(true);
    try {
      let puList = [];

      if (wardId && electionId) {
        // Fetch polling units for a specific ward with result data
        const url = getApiUrl(`/results/?election=${electionId}&level=polling_unit&ward=${wardId}`);
        const res = await fetch(url);
        const data = await res.json();

        if (data.polling_units && Array.isArray(data.polling_units)) {
          puList = data.polling_units;
        }
      } else if (electionId) {
        // Fetch ALL polling units that have results by querying EACH ward that has results
        // Use the wards we already fetched
        const wardsWithResults = wards.filter(w => w.total_votes && w.total_votes > 0);

        for (const ward of wardsWithResults) {
          try {
            const puUrl = getApiUrl(`/results/?election=${electionId}&level=polling_unit&ward=${ward.id}`);
            const puRes = await fetch(puUrl);
            const puData = await puRes.json();

            if (puData.polling_units && Array.isArray(puData.polling_units)) {
              puList = puList.concat(puData.polling_units);
            }
          } catch (err) {
            console.warn(`Failed to fetch polling units for ward ${ward.id}:`, err);
          }
        }
      }

      console.log(`✅ Fetched ${puList.length} polling units with results`);
      setPollingUnits(puList);
    } catch (e) {
      console.error('Failed to fetch polling units:', e);
      setPollingUnits([]);
    } finally {
      setPULoading(false);
    }
  }, [electionId, wards]);

  /* ─── useEFFECTS (now fetch functions are defined) ─── */
  /* load initial data */
  useEffect(() => {
    (async () => {
      if (!elections.length) await loadElections();
      if (!lgaList.length) await loadLGAs();
      setElectionsLoaded(true);
    })();
  }, []);

  /* load results - only fetch on election change */
  useEffect(() => {
    if (!electionId) return;
    fetchResults();
  }, [electionId, fetchResults]);

  /* load wards once on election load (one time only) */
  useEffect(() => {
    if (!electionId || wardsFetched) return;

    fetchWards();
    setWardsFetched(true);
  }, [electionId, wardsFetched, fetchWards]);

  /* load polling units after wards are loaded (depends on wards data) */
  useEffect(() => {
    if (!electionId || puFetched || !wardsFetched || wards.length === 0) return;

    fetchPollingUnits();
    setPUFetched(true);
  }, [electionId, puFetched, wardsFetched, wards, fetchPollingUnits]);

  /* auto-refresh - refetch results every 30 seconds */
  useEffect(() => {
    if (!autoRefresh || !electionId) return;

    const id = setInterval(() => {
      console.log('🔄 Auto-refreshing state-level results...');
      fetchResults();
      // Optional: re-fetch filtered ward/pu data if user has a filter active
      if (selectedWardLGA) {
        fetchWards(selectedWardLGA);
      }
      if (selectedPUWard) {
        fetchPollingUnits(selectedPUWard, selectedPULGA);
      }
    }, 30_000);

    return () => clearInterval(id);
  }, [autoRefresh, electionId, selectedWardLGA, selectedPUWard, selectedPULGA, fetchResults, fetchWards, fetchPollingUnits]);

  /* load wards when LGA filter changes */
  useEffect(() => {
    if (selectedWardLGA) {
      fetchWards(selectedWardLGA);
    } else {
      fetchWards();
    }
  }, [selectedWardLGA, fetchWards]);

  /* load polling unit wards when PU LGA filter changes */
  useEffect(() => {
    if (selectedPULGA) {
      fetchPUWards(selectedPULGA);
      setSelectedPUWard(''); // Reset ward filter
    } else {
      setPUWards([]);
    }
  }, [selectedPULGA, fetchPUWards]);

  /* load polling units when ward filter changes */
  useEffect(() => {
    if (selectedPUWard) {
      fetchPollingUnits(selectedPUWard, selectedPULGA);
    }
  }, [selectedPUWard, selectedPULGA, fetchPollingUnits]);

  /* ── derived data ── */
  const parties = results?.parties || [];
  const totalVotes = results?.total_votes || 0;
  const lgaResults = results?.lgas || [];

  // Count wards and polling units with results
  const wardsWithResults = wards.filter(w => w.total_votes && w.total_votes > 0).length;
  const totalWardsInSystem = 184;
  const puWithResults = pollingUnits.filter(pu => pu.total_votes && pu.total_votes > 0).length;
  const totalPUInSystem = 4062;

  /* Ward bar chart data - only show wards with results (ward_wins > 0) */
  const wardData = {
    labels: parties.map(p => p.acronym),
    datasets: [{
      data: parties.map(p => p.ward_wins || 0),
      backgroundColor: parties.map((p, i) => colorFor(p.acronym, i)),
      borderRadius: 3,
    }],
  };

  /* Pie chart data */
  const pieData = {
    labels: parties.map(p => `${p.acronym} ${pct(p.votes, totalVotes)}%`),
    datasets: [{
      data: parties.map(p => p.votes || 0),
      backgroundColor: parties.map((p, i) => colorFor(p.acronym, i)),
      borderWidth: 1, borderColor: '#fff',
    }],
  };

  const chartOpts = (horizontal = false) => ({
    responsive: true, maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: { legend: { display: false } },
    scales: {
      x: { stacked: horizontal, ticks: { font: { size: 9 } }, grid: { color: '#eee' } },
      y: { stacked: horizontal, ticks: { font: { size: horizontal ? 8 : 10 } }, grid: { display: !horizontal, color: '#eee' } },
    },
  });

  /* ── polling unit totals ── */
  const pollingWins = results?.polling_unit_wins || {};
  const totalPollUnits = results?.total_polling_units || 4062;

  /* ── if elections not loaded yet ── */
  if (!electionsLoaded) {
    return (
      <div style={S.page}>
        <Header />
        <div style={{ padding: '4rem', textAlign: 'center', color: '#666' }}>
          Loading election data…
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentElection) {
    return (
      <div style={S.page}>
        <Header />
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <h2>Election Not Found</h2>
          <p style={{ margin: '1rem 0' }}>The election results you're looking for don't exist.</p>
          <button onClick={() => navigate('/')}
            style={{ padding: '8px 16px', background: '#1a2744', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
            ← Back to Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div style={S.page}>
      <Header />

      {/* ── Hero bar ── */}
      <div style={S.hero}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: '#fff', borderRadius: 4, padding: '4px 8px',
            color: '#1a2744', fontSize: 18, lineHeight: 1,
          }}>⌂</div>
          <span style={S.heroTitle}>{currentElection.name?.toUpperCase()}</span>
        </div>
        <span style={S.heroDate}>
          {new Date(currentElection.date || lastUpdated).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
          }).toUpperCase()}
        </span>
      </div>

      {/* ── Party summary carousel ── */}
      <div style={S.partyBar}>
        {parties.map((party, i) => (
          <div key={party.id} style={S.partyItem}>
            <div style={{ ...S.partyLogo, background: colorFor(party.acronym, i) }}>
              {party.logo_url
                ? <img src={party.logo_url} alt={party.acronym} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{party.acronym}</span>
              }
            </div>
            <div>
              <div style={S.partyVotes}>{(party.votes || 0).toLocaleString()}</div>
              <div style={S.partyAcronym}>{party.acronym}</div>
            </div>
          </div>
        ))}
        <button style={S.navArrow}>▶</button>
      </div>

      {/* ── Three charts ── */}
      <div style={S.chartsRow}>

        {/* Ward bar chart */}
        <div style={S.chartCard}>
          <div style={S.chartTitle}>VOTE CHART BY WARD</div>
          <div style={{ position: 'relative', height: 180 }}>
            <Bar data={wardData} options={chartOpts(false)} />
          </div>
          <div style={S.wardTotal}>
            TOTAL OF {results?.total_wards || 184} WARDS
          </div>
        </div>

        {/* State pie chart */}
        <div style={S.chartCard}>
          <div style={S.chartTitle}>STATE VOTE CHART</div>
          <div style={{ position: 'relative', height: 180 }}>
            <Pie data={pieData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
            }} />
          </div>
          <div style={S.legendRow}>
            {parties.map((p, i) => (
              <span key={p.id} style={S.legendItem}>
                <span style={{ ...S.legendDot, background: colorFor(p.acronym, i) }} />
                {p.acronym} {pct(p.votes, totalVotes)}%
              </span>
            ))}
          </div>
        </div>

        {/* LGA horizontal chart */}
        <div style={S.chartCard}>
          <div style={S.chartTitle}>VOTE CHART BY L G A</div>
          <LGAChart parties={parties} lgas={lgaResults} />
          <div style={S.legendRow}>
            {parties.map((p, i) => (
              <span key={p.id} style={S.legendItem}>
                <span style={{ ...S.legendDot, background: colorFor(p.acronym, i) }} />
                {p.acronym}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Polling Unit Won ── */}
      <div style={S.pollingSection}>
        <div style={S.pollingTitle}>
          POLLING UNIT WON (TOTAL OF {totalPollUnits.toLocaleString()} POLLING UNIT)
        </div>

        {/* proportional stacked bar */}
        <div style={S.pollingBars}>
          {parties.map((p, i) => {
            const wins = pollingWins[p.acronym] || p.polling_wins || 0;
            const flex = wins / totalPollUnits;

            if (flex <= 0) return null;  // Skip parties with no wins

            return (
              <div key={p.id} style={S.pollingBar(flex, colorFor(p.acronym, i))}>
                {wins > 0 && flex > 0.05 ? p.acronym : ''}
              </div>
            );
          })}

          {/* unfilled segment */}
          {(() => {
            const totalWins = parties.reduce((sum, p) => sum + (pollingWins[p.acronym] || p.polling_wins || 0), 0);
            const unfilledFlex = (totalPollUnits - totalWins) / totalPollUnits;
            return (
              <div key="unfilled" style={S.pollingBarUnfilled(unfilledFlex)}>
                {unfilledFlex > 0.1 ? `No Results (${totalPollUnits - totalWins})` : ''}
              </div>
            );
          })()}
        </div>

        {/* counts below */}
        <div style={S.pollingCounts}>
          {parties.map((p, i) => {
            const wins = pollingWins[p.acronym] || p.polling_wins || 0;
            const flex = wins / totalPollUnits;

            if (flex <= 0) return null;  // Skip parties with no wins

            return (
              <div key={p.id} style={S.pollingCount(flex)}>
                <div style={{ fontSize: 11, color: '#666' }}>{p.acronym}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{wins.toLocaleString()}</div>
              </div>
            );
          })}

          {/* unfilled count */}
          {(() => {
            const totalWins = parties.reduce((sum, p) => sum + (pollingWins[p.acronym] || p.polling_wins || 0), 0);
            const unfilled = totalPollUnits - totalWins;
            const unfilledFlex = unfilled / totalPollUnits;

            return (
              <div key="unfilled-count" style={S.pollingCount(unfilledFlex)}>
                <div style={{ fontSize: 11, color: '#999' }}>Pending</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#999' }}>{unfilled.toLocaleString()}</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Ward & Polling Unit tables ── */}
      <div style={S.tablesRow}>
        {/* Wards Table */}
        <div style={S.tableCard}>
          <div style={S.tableHeader}>
            <input
              type="text"
              placeholder="Search ward..."
              value={wardSearch}
              onChange={(e) => setWardSearch(e.target.value)}
              style={S.tableSearchInput}
            />
            <select
              value={selectedWardLGA}
              onChange={(e) => setSelectedWardLGA(e.target.value)}
              style={S.tableFilterSelect}
            >
              <option value="">All LGAs</option>
              {results?.lgas?.map(lga => (
                <option key={lga.id} value={lga.id}>{lga.name}</option>
              ))}
            </select>
          </div>

          {/* Progress counter */}
          <div style={{ paddingBottom: 8, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#666' }}>
            Wards: {wardsWithResults}/{totalWardsInSystem}
          </div>

          <div style={S.tableList}>
            {wardsLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading wards...</div>
            ) : wardsWithResults === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No wards with results yet</div>
            ) : (
              wards
                .filter(w => w.total_votes && w.total_votes > 0)  // Only show wards with results
                .filter(w => !wardSearch || w.name?.toLowerCase().includes(wardSearch.toLowerCase()))
                .map(ward => (
                  <div
                    key={ward.id}
                    style={{ ...S.tableItem, ...(expandedWard === ward.id ? { background: '#f5f5f5' } : {}) }}
                  >
                    <div
                      style={S.tableItemHeader}
                      onClick={() => setExpandedWard(expandedWard === ward.id ? null : ward.id)}
                    >
                      <span>{ward.name}</span>
                      <span style={{ fontSize: 10, color: '#999' }}>{expandedWard === ward.id ? '▼' : '▶'}</span>
                    </div>
                    <div style={S.tableItemDetails}>Total Votes: {(ward.total_votes || 0).toLocaleString()}</div>

                    {expandedWard === ward.id && (
                      <div style={S.tableItemDropdown}>
                        {ward.parties?.map((p, idx) => (
                          <div key={p.id} style={S.tableItemDropdownParty}>
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

        {/* Polling Units Table */}
        <div style={S.tableCard}>
          <div style={S.tableHeader}>
            <input
              type="text"
              placeholder="Search polling unit..."
              value={puSearch}
              onChange={(e) => setPUSearch(e.target.value)}
              style={S.tableSearchInput}
            />
            <select
              value={selectedPULGA}
              onChange={(e) => setSelectedPULGA(e.target.value)}
              style={S.tableFilterSelect}
            >
              <option value="">All LGAs</option>
              {results?.lgas?.map(lga => (
                <option key={lga.id} value={lga.id}>{lga.name}</option>
              ))}
            </select>
            <select
              value={selectedPUWard}
              onChange={(e) => setSelectedPUWard(e.target.value)}
              style={S.tableFilterSelect}
              disabled={!selectedPULGA}
            >
              <option value="">All Wards</option>
              {puWards.map(ward => (
                <option key={ward.id} value={ward.id}>{ward.name}</option>
              ))}
            </select>
          </div>

          {/* Progress counter */}
          <div style={{ paddingBottom: 8, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#666' }}>
            Polling Units: {puWithResults}/{totalPUInSystem}
          </div>

          <div style={S.tableList}>
            {puLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>Loading polling units...</div>
            ) : puWithResults === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No polling units with results yet</div>
            ) : (
              pollingUnits
                .filter(pu => pu.total_votes && pu.total_votes > 0)  // Only show PUs with results
                .filter(pu => !puSearch || pu.name?.toLowerCase().includes(puSearch.toLowerCase()) || pu.unit_id?.toLowerCase().includes(puSearch.toLowerCase()))
                .map(pu => (
                  <div
                    key={pu.id}
                    style={{ ...S.tableItem, ...(expandedPU === pu.id ? { background: '#f5f5f5' } : {}) }}
                  >
                    <div
                      style={S.tableItemHeader}
                      onClick={() => setExpandedPU(expandedPU === pu.id ? null : pu.id)}
                    >
                      <span>{pu.name || `PU-${pu.unit_id}`}</span>
                      <span style={{ fontSize: 10, color: '#999' }}>{expandedPU === pu.id ? '▼' : '▶'}</span>
                    </div>
                    <div style={S.tableItemDetails}>
                      ID: {pu.unit_id} • Ward: {pu.ward?.name || 'N/A'} • LGA: {pu.lga?.name || 'N/A'}
                    </div>

                    {expandedPU === pu.id && (
                      <div style={S.tableItemDropdown}>
                        {pu.parties?.map((p, idx) => (
                          <div key={p.id} style={S.tableItemDropdownParty}>
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
      </div>

      <Footer />
    </div>
  );
};

export default ResultCenterPage;
