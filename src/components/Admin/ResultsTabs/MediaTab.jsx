/**
 * Media Tab - Shows pictures and comments from polling units
 * CCTV-style grid view with filtering
 * Same UI pattern as VoteCountsTab and LiveVideosTab for consistency
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Image as ImageIcon, MessageSquare, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getApiUrl } from '../../../utils/apiUrl';
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
            const imagesResponse = await fetch(getApiUrl(`/results/admin/images/?election_id=${electionId}`), {
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
            const commentsResponse = await fetch(getApiUrl(`/results/admin/comments/?election_id=${electionId}`), {
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

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                color: '#888'
            }}>
                <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ marginLeft: '12px' }}>Loading media...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '16px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '6px',
                border: '1px solid #f5c6cb',
                margin: '16px'
            }}>
                ⚠️ {error}
            </div>
        );
    }

    return (
        <div style={{ padding: '16px' }}>
            {/* Stats Header - Similar to LiveVideosTab and VoteCountsTab */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '18px',
                        borderRadius: '12px',
                        background: 'white',
                        borderLeft: '4px solid #e6a817',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            background: 'rgba(230, 168, 23, 0.1)',
                            borderRadius: '8px',
                            color: '#e6a817'
                        }}>
                            <ImageIcon size={24} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>Media Submissions</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#222' }}>
                                {submittedCount}<span style={{ fontSize: '1rem', color: '#999' }}> / {totalRegistered}</span>
                            </span>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '18px',
                        borderRadius: '12px',
                        background: 'white',
                        borderLeft: '4px solid #28a745',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            background: 'rgba(40, 167, 69, 0.1)',
                            borderRadius: '8px',
                            color: '#28a745'
                        }}>
                            <ImageIcon size={24} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>Total Images</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#222' }}>{totalImages}</span>
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '18px',
                        borderRadius: '12px',
                        background: 'white',
                        borderLeft: '4px solid #17a2b8',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '48px',
                            height: '48px',
                            background: 'rgba(23, 162, 184, 0.1)',
                            borderRadius: '8px',
                            color: '#17a2b8'
                        }}>
                            <MessageSquare size={24} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 500 }}>Total Comments</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#222' }}>{totalComments}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div style={{
                marginBottom: '24px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
            }}>
                <div style={{
                    flex: '1 1 250px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    transition: 'border-color 0.3s'
                }}>
                    <Search size={18} style={{ color: '#999' }} />
                    <input
                        type="text"
                        placeholder="Search by PU name, ID, or comment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            flex: 1,
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px',
                            backgroundColor: 'transparent'
                        }}
                    />
                </div>

                <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value)}
                    style={{
                        padding: '10px 12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backgroundColor: '#fff',
                        transition: 'border-color 0.3s'
                    }}
                >
                    <option value="all">All Media</option>
                    <option value="images">Images Only</option>
                    <option value="comments">Comments Only</option>
                </select>

                <select
                    value={selectedLGA}
                    onChange={(e) => setSelectedLGA(e.target.value)}
                    style={{
                        padding: '10px 12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        backgroundColor: '#fff',
                        transition: 'border-color 0.3s'
                    }}
                >
                    <option value="">All LGAs</option>
                    {allLGAs.map(lga => (
                        <option key={lga.id} value={lga.id}>{lga.name}</option>
                    ))}
                </select>

                <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    disabled={!selectedLGA}
                    style={{
                        padding: '10px 12px',
                        border: '2px solid #e0e0e0',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: selectedLGA ? 'pointer' : 'not-allowed',
                        backgroundColor: '#fff',
                        opacity: !selectedLGA ? 0.6 : 1,
                        transition: 'border-color 0.3s'
                    }}
                >
                    <option value="">All Wards</option>
                    {wards.map(ward => (
                        <option key={ward.id} value={ward.id}>{ward.name}</option>
                    ))}
                </select>

                <button
                    onClick={() => {
                        setSearchQuery('');
                        setSelectedLGA('');
                        setSelectedWard('');
                        setMediaType('all');
                    }}
                    style={{
                        padding: '10px 16px',
                        backgroundColor: '#e0e0e0',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.3s'
                    }}
                >
                    Reset
                </button>
            </div>

            {/* Media Items Grid */}
            {groupedList.length === 0 ? (
                <div style={{
                    padding: '32px',
                    textAlign: 'center',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '8px',
                    color: '#888'
                }}>
                    <p>No media found matching your filters</p>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px'
                }}>
                    {groupedList.map((item) => {
                        const counts = getMediaCount(item.media_items);
                        const puId = item.polling_unit.id;
                        return (
                            <div
                                key={puId}
                                style={{
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s',
                                    border: '1px solid #ddd'
                                }}
                            >
                                {/* Card Header */}
                                <div
                                    onClick={() => togglePU(puId)}
                                    style={{
                                        padding: '12px',
                                        backgroundColor: '#f8f9fa',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        borderBottom: '1px solid #ddd',
                                        transition: 'background 0.3s'
                                    }}
                                >
                                    <div style={{
                                        flex: 1,
                                        minWidth: 0
                                    }}>
                                        <h5 style={{
                                            margin: '0 0 4px 0',
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: '#222'
                                        }}>
                                            {item.polling_unit.name}
                                        </h5>
                                        <div style={{
                                            fontSize: '11px',
                                            color: '#666',
                                            display: 'flex',
                                            gap: '8px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <span>ID: {item.polling_unit.unit_id}</span>
                                            <span>•</span>
                                            <span>{getWardName(item.polling_unit.ward)}</span>
                                            <span>•</span>
                                            <span>{getLGAName(item.polling_unit.lga)}</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        alignItems: 'center'
                                    }}>
                                        {counts.images > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                backgroundColor: '#28a745',
                                                color: '#fff',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                <ImageIcon size={12} /> {counts.images}
                                            </div>
                                        )}
                                        {counts.comments > 0 && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                backgroundColor: '#17a2b8',
                                                color: '#fff',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                <MessageSquare size={12} /> {counts.comments}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ color: '#666' }}>
                                        {expandedPUs[puId] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expandable Content */}
                                {expandedPUs[puId] && (
                                    <div style={{ padding: '12px' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                            gap: '12px'
                                        }}>
                                            {item.media_items.map((media, idx) => (
                                                media.type === 'image' ? (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            borderRadius: '6px',
                                                            overflow: 'hidden',
                                                            backgroundColor: '#f0f0f0',
                                                            position: 'relative',
                                                            aspectRatio: '1',
                                                            cursor: 'pointer',
                                                            transition: 'transform 0.3s'
                                                        }}
                                                    >
                                                        <img
                                                            src={media.image}
                                                            alt={`From ${media.polling_unit?.name}`}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                            onError={(e) => {
                                                                e.target.src = '/api/placeholder.jpg';
                                                            }}
                                                        />
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '4px',
                                                            right: '4px',
                                                            backgroundColor: '#28a745',
                                                            color: '#fff',
                                                            padding: '2px 6px',
                                                            borderRadius: '3px',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px'
                                                        }}>
                                                            <ImageIcon size={10} /> Image
                                                        </div>
                                                        <a
                                                            href={media.image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                position: 'absolute',
                                                                bottom: 0,
                                                                left: 0,
                                                                right: 0,
                                                                padding: '4px',
                                                                backgroundColor: 'rgba(0,0,0,0.7)',
                                                                color: '#fff',
                                                                fontSize: '10px',
                                                                textAlign: 'center',
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            View Full
                                                        </a>
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            backgroundColor: '#e8f4f8',
                                                            padding: '10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #b3d9e6',
                                                            gridColumn: 'span 1'
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            marginBottom: '6px',
                                                            fontSize: '10px',
                                                            fontWeight: 'bold',
                                                            color: '#17a2b8'
                                                        }}>
                                                            <MessageSquare size={12} /> Comment
                                                        </div>
                                                        <p style={{
                                                            margin: '0 0 6px 0',
                                                            fontSize: '11px',
                                                            color: '#222',
                                                            lineHeight: '1.3',
                                                            maxHeight: '60px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}>
                                                            {media.comment_text}
                                                        </p>
                                                        <div style={{
                                                            fontSize: '9px',
                                                            color: '#999'
                                                        }}>
                                                            {new Date(media.timestamp).toLocaleTimeString()}
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MediaTab;
