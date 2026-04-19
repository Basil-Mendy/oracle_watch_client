/**
 * CommentsSection Component - Add observations and comments about the election
 */
import React, { useState } from 'react';
import { AlertCircle, Clock, Users, Shield } from 'lucide-react';

const CommentsSection = ({ comments, onCommentsChange }) => {
    const [charCount, setCharCount] = useState(comments.length);
    const maxChars = 1000;

    const handleInputChange = (e) => {
        const text = e.target.value;
        if (text.length <= maxChars) {
            onCommentsChange(text);
            setCharCount(text.length);
        }
    };

    return (
        <div className="comments-section">
            <div className="comments-instructions">
                <p>💬 Add any observations, incidents, or issues observed at this polling unit</p>
                <p style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '8px' }}>
                    Examples: Equipment issues, crowd size, delays, irregularities, etc.
                </p>
            </div>

            <div className="comments-form">
                <textarea
                    value={comments}
                    onChange={handleInputChange}
                    placeholder="Share your observations here... (optional)"
                    className="comments-input"
                    rows={5}
                />
                <div className="comments-footer">
                    <span className="char-count">
                        {charCount} / {maxChars} characters
                    </span>
                    {charCount > maxChars * 0.8 && (
                        <span className="char-warning"><AlertCircle size={14} className="inline-icon" /> Approaching character limit</span>
                    )}
                </div>
            </div>

            {/* Common observations template */}
            <div className="observation-templates">
                <h5>🔹 Quick Tags (optional)</h5>
                <div className="tag-buttons">
                    <button
                        type="button"
                        className="tag-btn"
                        onClick={() => onCommentsChange(
                            comments + (comments ? '\n' : '') + 'Delayed start'
                        )}
                    >
                        <Clock size={14} className="inline-icon" /> Delayed Start
                    </button>
                    <button
                        type="button"
                        className="tag-btn"
                        onClick={() => onCommentsChange(
                            comments + (comments ? '\n' : '') + 'Large crowd'
                        )}
                    >
                        <Users size={14} className="inline-icon" /> Large Crowd
                    </button>
                    <button
                        type="button"
                        className="tag-btn"
                        onClick={() => onCommentsChange(
                            comments + (comments ? '\n' : '') + 'Equipment issue'
                        )}
                    >
                        <AlertCircle size={14} className="inline-icon" /> Equipment Issue
                    </button>
                    <button
                        type="button"
                        className="tag-btn"
                        onClick={() => onCommentsChange(
                            comments + (comments ? '\n' : '') + 'Security concern'
                        )}
                    >
                        <Shield size={14} className="inline-icon" /> Security Concern
                    </button>
                    <button
                        type="button"
                        className="tag-btn"
                        onClick={() => onCommentsChange(
                            comments + (comments ? '\n' : '') + '✅ Smooth operations'
                        )}
                    >
                        ✅ Smooth Operations
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentsSection;
