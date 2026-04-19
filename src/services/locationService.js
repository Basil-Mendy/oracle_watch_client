/**
 * Location Services - APIs for LGA, Ward, and Polling Unit management
 */

import api from './api';

// LGA endpoints
export const locationService = {
    // LGAs
    getLGAs: () => api.get('/locations/lgas/'),
    createLGA: (data) => api.post('/locations/lgas/', data),

    // Wards
    getWards: (lgaId = null) => {
        const params = lgaId ? { lga_id: lgaId } : {};
        return api.get('/locations/wards/', { params });
    },
    createWard: (data) => api.post('/locations/wards/', data),

    // Polling Units
    getPollingUnits: (lgaId = null, wardId = null) => {
        const params = {};
        if (lgaId) params.lga_id = lgaId;
        if (wardId) params.ward_id = wardId;
        return api.get('/locations/polling-units/', { params });
    },
    getPollingUnit: (id) => api.get(`/locations/polling-units/${id}/`),
    createPollingUnit: (data) => api.post('/locations/polling-units/', data),
    updatePollingUnit: (id, data) => api.put(`/locations/polling-units/${id}/`, data),
    deletePollingUnit: (id) => api.delete(`/locations/polling-units/${id}/`),
    getPollingUnitByUnitId: (unitId) =>
        api.get('/locations/polling-units/', { params: { unit_id: unitId } })
            .then(response => response.data[0]),

    // Polling Unit Admin Functions
    resetPollingUnitPassword: (pollingUnitId) =>
        api.post('/locations/polling-units/reset-password/', {
            polling_unit_id: pollingUnitId,
        }).then(response => response.data),

    fetchPollingUnitPasswords: (lgaId = null, wardId = null, unitIds = []) =>
        api.post('/locations/polling-units/fetch-passwords/', {
            lga_id: lgaId,
            ward_id: wardId,
            unit_ids: unitIds,
        }),

    // Bulk operations
    bulkCreatePollingUnits: (wards, pollingUnits) =>
        api.post('/locations/bulk-create/', {
            wards,
            polling_units: pollingUnits,
        }),

    // Excel file upload for bulk polling unit creation
    bulkCreateFromExcel: (formData) =>
        api.post('/locations/polling-units/bulk-upload-excel/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export default locationService;
