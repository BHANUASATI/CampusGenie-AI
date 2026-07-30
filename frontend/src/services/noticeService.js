import { notices } from '../data/notices';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const noticeService = {
  // Get all notices
  getNotices: async () => {
    await delay(300);
    return notices;
  },

  // Get notice by ID
  getNoticeById: async (id) => {
    await delay(200);
    return notices.find((notice) => notice.id === id) || null;
  },

  // Filter notices by category
  getNoticesByCategory: async (category) => {
    await delay(300);
    if (category === 'All') return notices;
    return notices.filter((notice) => notice.category === category);
  },

  // Search notices
  searchNotices: async (query) => {
    await delay(300);
    const lowerQuery = query.toLowerCase();
    return notices.filter(
      (notice) =>
        notice.title.toLowerCase().includes(lowerQuery) ||
        notice.description.toLowerCase().includes(lowerQuery) ||
        notice.category.toLowerCase().includes(lowerQuery)
    );
  },
};
