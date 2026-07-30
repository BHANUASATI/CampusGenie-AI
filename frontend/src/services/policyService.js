import { policies } from '../data/policies';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const policyService = {
  // Get all policies
  getPolicies: async () => {
    await delay(300);
    return policies;
  },

  // Get policy by ID
  getPolicyById: async (id) => {
    await delay(200);
    return policies.find((policy) => policy.id === id) || null;
  },

  // Filter policies by category
  getPoliciesByCategory: async (category) => {
    await delay(300);
    if (category === 'All') return policies;
    return policies.filter((policy) => policy.category === category);
  },

  // Search policies
  searchPolicies: async (query) => {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return policies.filter(
      (policy) =>
        policy.title.toLowerCase().includes(lowerQuery) ||
        policy.description.toLowerCase().includes(lowerQuery) ||
        policy.category.toLowerCase().includes(lowerQuery)
    );
  },
};
