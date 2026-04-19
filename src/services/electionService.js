/**
 * Election Services - APIs for elections and parties
 */

import api from './api';

export const electionService = {
    // Parties
    getParties: () => api.get('/elections/parties/'),
    getParty: (id) => api.get(`/elections/parties/${id}/`),
    createParty: (formData) => {
        // formData should include 'name', 'logo' (file), and 'is_starred'
        return api.post('/elections/parties/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    updateParty: (id, data) => api.put(`/elections/parties/${id}/`, data),
    deleteParty: (id) => api.delete(`/elections/parties/${id}/`),
    starParty: (id) => api.put(`/elections/parties/${id}/`, { is_starred: true }),
    unstarParty: (id) => api.put(`/elections/parties/${id}/`, { is_starred: false }),

    // Elections
    getElections: (status = null) => {
        const params = status ? { status } : {};
        return api.get('/elections/', { params });
    },
    getElection: (id) => api.get(`/elections/${id}/`),
    createElection: (data) => api.post('/elections/', data),
    updateElection: (id, data) => api.put(`/elections/${id}/`, data),
    deleteElection: (id) => api.delete(`/elections/${id}/`),

    // Election Management
    endElection: (electionId) =>
        api.post(`/elections/${electionId}/end/`),

    addPartiesToElection: (electionId, partyIds) =>
        api.post('/elections/add-parties/', {
            election_id: electionId,
            party_ids: partyIds,
        }),

    removePartyFromElection: (electionId, partyId) =>
        api.delete('/elections/remove-party/', {
            data: {
                election_id: electionId,
                party_id: partyId,
            },
        }),
};

export default electionService;
