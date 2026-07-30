import { placements } from '../data/placements';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const placementService = {
  // Get all placements
  getPlacements: async () => {
    await delay(300);
    return placements;
  },

  // Get placement by ID
  getPlacementById: async (id) => {
    await delay(200);
    return placements.find((placement) => placement.id === id) || null;
  },

  // Filter placements by status
  getPlacementsByStatus: async (status) => {
    await delay(300);
    if (status === 'All') return placements;
    return placements.filter((placement) => placement.status === status);
  },

  // Search placements
  searchPlacements: async (query) => {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return placements.filter(
      (placement) =>
        placement.company.toLowerCase().includes(lowerQuery) ||
        placement.role.toLowerCase().includes(lowerQuery) ||
        placement.requirements.some((req) => req.toLowerCase().includes(lowerQuery))
    );
  },
};
