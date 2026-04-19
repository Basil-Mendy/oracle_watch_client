/**
 * Helper functions for the frontend
 */

export const formatDate = (dateString) => {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

export const formatTime = (dateString) => {
    const options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    };
    return new Date(dateString).toLocaleTimeString('en-US', options);
};

export const capitalizeWords = (str) => {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

export const isElectionActive = (election) => {
    return election.status === 'active';
};

export const isElectionUpcoming = (election) => {
    return election.status === 'upcoming';
};

export const isElectionEnded = (election) => {
    return election.status === 'ended';
};

export const getElectionStatus = (election) => {
    if (isElectionActive(election)) return 'Live 📍';
    if (isElectionUpcoming(election)) return 'Upcoming 📅';
    if (isElectionEnded(election)) return 'Completed ✓';
    return 'Unknown';
};
