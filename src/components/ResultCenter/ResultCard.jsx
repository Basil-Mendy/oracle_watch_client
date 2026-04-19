/**
 * ResultCard Component - Display individual party result
 */
import React from 'react';

const ResultCard = ({
    rank,
    party,
    votes,
    percentage,
    totalVotes,
    isLeading
}) => {
    const getRankEmoji = () => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `${rank}`;
        }
    };

    return (
        <div className={`result-card ${isLeading ? 'leading' : ''}`}>
            {/* Rank Badge */}
            <div className="card-rank">{getRankEmoji()}</div>

            {/* Party Info */}
            <div className="card-party-info">
                <div className="party-acronym">{party.acronym}</div>
                <div className="party-name">{party.name}</div>
            </div>

            {/* Vote Display */}
            <div className="card-votes">
                <div className="votes-number">{votes.toLocaleString()}</div>
                <div className="votes-label">votes</div>
            </div>

            {/* Percentage Display */}
            <div className="card-percentage">
                <div className="percentage-value">{percentage}%</div>
            </div>

            {/* Progress Bar */}
            <div className="card-progress-container">
                <div className="progress-bar">
                    <div
                        className={`progress-fill ${isLeading ? 'leading' : ''}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {/* Leader Badge */}
            {isLeading && (
                <div className="leader-badge">
                    <span>🏆 Leading</span>
                </div>
            )}
        </div>
    );
};

export default ResultCard;
