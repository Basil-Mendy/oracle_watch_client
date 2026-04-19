/**
 * Media Tab - Shows pictures and comments from polling units
 * List view with submitted count and expandable media details
 * Same pattern as vote counts tab for consistency
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Image as ImageIcon, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import locationService from '../../../services/locationService';
import '../../../styles/components/ResultsTabs.css';

const MediaTab = ({ electionId }) => {
    const { user } = useAuth();
    const [images, setImages] = useState([]);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLGA, setSelectedLGA] = useState('');
    const [selectedWard, setSelectedWard] = useState('');
    const [mediaType, setMediaType] = useState('all'); // all, images, comments
    const [lgas, setLGAs] = useState([]);
    const [wards, setWards] = useState([]);
    const [error, setError] = useState('');
    const [expandedPUs, setExpandedPUs] = useState({});
    const [allLGAs, setAllLGAs] = useState([]);

    // Load LGAs on component mount
    useEffect(() => {
        loadLGAs();
    }, []);

    // Load wards when LGA selection changes
    useEffect(() => {
        if (selectedLGA) {
            loadWards(selectedLGA);
        } else {
            setWards([]);
        }
    }, [selectedLGA]);

    // Fetch media when election changes
    useEffect(() => {
        if (electionId) {
            fetchMedia();
        }
    }, [electionId]);

    const loadLGAs = async () => {
        try {
            const response = await locationService.getLGAs();
            const lgaList = response.data || [];
            setAllLGAs(lgaList);
        } catch (err) {
            console.error('Failed to load LGAs:', err);
        }
    };

    const loadWards = async (lgaId) => {
        try {
            const response = await locationService.getWards(lgaId);
            const wardList = response.data || [];
            setWards(wardList);
            setSelectedWard(''); // Reset ward filter when LGA changes
        } catch (err) {
            console.error('Failed to load wards:', err);
            setWards([]);
        }
    };

    const fetchMedia = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('auth_token');

            // Fetch images
            const imagesResponse = await fetch(`http://localhost:8000/api/results/admin/images/?election_id=${electionId}`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!imagesResponse.ok) {
                throw new Error(`Failed to fetch images: ${imagesResponse.status}`);
            }

            const imagesData = await imagesResponse.json();
            setImages(imagesData.images || []);

            // Fetch comments
            const commentsResponse = await fetch(`http://localhost:8000/api/results/admin/comments/?election_id=${electionId}`, {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!commentsResponse.ok) {
                throw new Error(`Failed to fetch comments: ${commentsResponse.status}`);
            }

            const commentsData = await commentsResponse.json();
            setComments(commentsData.comments || []);
        } catch (err) {
            setError('Failed to load media: ' + err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Group media by polling unit
    const { filteredMediaGrouped, submittedCount, totalRegistered, groupedList, totalImages, totalComments } = useMemo(() => {
        let allMedia = [];

        // Include images
        if (mediaType === 'all' || mediaType === 'images') {
            allMedia = [...allMedia, ...images.map(img => ({
                ...img,
                type: 'image',
                timestamp: img.uploaded_at
            }))];
        }

        // Include comments
        if (mediaType === 'all' || mediaType === 'comments') {
            allMedia = [...allMedia, ...comments.map(comment => ({
                ...comment,
                type: 'comment',
                timestamp: comment.created_at
            }))];
        }

        // Apply filters
        let filtered = allMedia;

        if (searchQuery) {
            filtered = filtered.filter(m =>
                m.polling_unit?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.polling_unit?.unit_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (m.comment_text && m.comment_text.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        if (selectedLGA) {
            filtered = filtered.filter(m => {
                const puLgaId = m.polling_unit?.lga?.id || m.polling_unit?.lga;
                return puLgaId === selectedLGA;
            });
        }

        if (selectedWard) {
            filtered = filtered.filter(m => {
                const puWardId = m.polling_unit?.ward?.id || m.polling_unit?.ward;
                return puWardId === selectedWard;
            });
        }

        // Group by polling unit
        const grouped = {};
        filtered.forEach(media => {
            const puId = media.polling_unit?.id;
            if (!grouped[puId]) {
                grouped[puId] = {
                    polling_unit: media.polling_unit,
                    media_items: []
                };
            }
            grouped[puId].media_items.push(media);
        });

        const pollingUnits = Object.values(grouped);
        const submitted = pollingUnits.length;
        // Total registered = number of unique polling units that have submitted media
        const allMediaItems = [...images, ...comments];
        const total = new Set(allMediaItems.map(m => m.polling_unit?.id)).size || submitted;

        // Count totals
        const imgCount = images.length;
        const cmtCount = comments.length;

        return {
            filteredMediaGrouped: grouped,
            submittedCount: submitted,
            totalRegistered: total,
            groupedList: pollingUnits,
            totalImages: imgCount,
            totalComments: cmtCount
        };
    }, [images, comments, searchQuery, selectedLGA, selectedWard, mediaType]);

    const togglePU = (puId) => {
        setExpandedPUs(prev => ({
            ...prev,
            [puId]: !prev[puId]
        }));
    };

    const getMediaCount = (items) => {
        const imgCount = items.filter(i => i.type === 'image').length;
        const cmtCount = items.filter(i => i.type === 'comment').length;
        return { images: imgCount, comments: cmtCount };
    };

    const getWardName = (wardData) => {
        if (!wardData) return 'N/A';
        if (typeof wardData === 'string') return wardData;
        if (wardData.name) return wardData.name;
        return 'N/A';
    };

    const getLGAName = (lgaData) => {
        if (!lgaData) return 'N/A';
        if (typeof lgaData === 'string') return lgaData;
        if (lgaData.name) return lgaData.name;
        return 'N/A';
    };

    if (loading) return <div className="loading-spinner">Loading media...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="media-tab-v2">
            {/* Submitted Count Header */}
            <div className="submitted-header">
                <div className="count-card">
                    <div className="count-label">Media Submissions</div>
                    <div className="count-display">
                        <span className="count-number">{submittedCount}</span>
                        <span className="count-total">/ {totalRegistered}</span>
                    </div>
                    <div className="count-percentage">
                        {((submittedCount / totalRegistered) * 100).toFixed(1)}% Complete
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="filters-section-v2">
                <div className="search-box">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by polling unit name, ID, or comment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-controls-v2">
                    <select
                        value={mediaType}
                        onChange={(e) => setMediaType(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Media</option>
                        <option value="images">Images Only</option>
                        <option value="comments">Comments Only</option>
                    </select>

                    <select
                        value={selectedLGA}
                        onChange={(e) => setSelectedLGA(e.target.value)}
                        className="filter-select"
                    >
                        <option value="">All LGAs</option>
                        {allLGAs.map(lga => (
                            <option key={lga.id} value={lga.id}>{lga.name}</option>
                        ))}
                    </select>

                    <select
                        value={selectedWard}
                        onChange={(e) => setSelectedWard(e.target.value)}
                        className="filter-select"
                        disabled={!selectedLGA}
                    >
                        <option value="">All Wards</option>
                        {wards.map(ward => (
                            <option key={ward.id} value={ward.id}>{ward.name}</option>
                        ))}
                    </select>

                    <button className="reset-filters" onClick={() => {
                        setSearchQuery('');
                        setSelectedLGA('');
                        setSelectedWard('');
                        setMediaType('all');
                    }}>
                        Reset
                    </button>
                </div>
            </div>

            {/* Media List */}
            <div className="media-list-container">
                {groupedList.length === 0 ? (
                    <div className="no-results">
                        <p>No media found matching your filters</p>
                    </div>
                ) : (
                    <div className="pu-media-wrapper">
                        {groupedList.map((item, index) => {
                            const counts = getMediaCount(item.media_items);
                            return (
                                <div key={item.polling_unit.id} className="pu-media-item">
                                    <div
                                        className="pu-media-header"
                                        onClick={() => togglePU(item.polling_unit.id)}
                                    >
                                        <div className="row-number">{index + 1}</div>
                                        <div className="row-info">
                                            <div className="pu-name">{item.polling_unit.name}</div>
                                            <div className="pu-details">
                                                <span className="pu-id">ID: {item.polling_unit.unit_id}</span>
                                                <span className="separator">•</span>
                                                <span className="pu-ward">Ward: {getWardName(item.polling_unit.ward)}</span>
                                                <span className="separator">•</span>
                                                <span className="pu-lga">LGA: {getLGAName(item.polling_unit.lga)}</span>
                                            </div>
                                        </div>
                                        <div className="media-counts">
                                            {counts.images > 0 && (
                                                <span className="count-badge images">
                                                    <ImageIcon size={14} /> {counts.images}
                                                </span>
                                            )}
                                            {counts.comments > 0 && (
                                                <span className="count-badge comments">
                                                    <MessageSquare size={14} /> {counts.comments}
                                                </span>
                                            )}
                                        </div>
                                        <div className="row-toggle">
                                            {expandedPUs[item.polling_unit.id] ? (
                                                <ChevronUp size={20} />
                                            ) : (
                                                <ChevronDown size={20} />
                                            )}
                                        </div>
                                    </div>

                                    {expandedPUs[item.polling_unit.id] && (
                                        <div className="pu-media-details">
                                            <div className="media-items-grid">
                                                {item.media_items.map((media, idx) => (
                                                    media.type === 'image' ? (
                                                        <div key={idx} className="media-item-image">
                                                            <img
                                                                src={media.image}
                                                                alt={`From ${media.polling_unit?.name}`}
                                                                className="media-thumbnail"
                                                                onError={(e) => {
                                                                    e.target.src = '/api/placeholder.jpg';
                                                                }}
                                                            />
                                                            <div className="media-type-badge">
                                                                <ImageIcon size={14} /> Image
                                                            </div>
                                                            <div className="media-time">
                                                                {new Date(media.timestamp).toLocaleTimeString()}
                                                            </div>
                                                            <a href={media.image} target="_blank" rel="noopener noreferrer" className="view-link">
                                                                View Full
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div key={idx} className="media-item-comment">
                                                            <div className="comment-badge">
                                                                <MessageSquare size={14} /> Comment
                                                            </div>
                                                            <div className="comment-content">
                                                                {media.comment_text}
                                                            </div>
                                                            <div className="comment-time">
                                                                {new Date(media.timestamp).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                            <div className="submission-time">
                                                Submitted: {new Date(item.media_items[0]?.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaTab;
