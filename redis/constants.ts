export const REDIS_KEYS = {
  USER_SESSIONS: 'user_sessions',
  NOTIFICATIONS: 'notifications',
  CHAT_HISTORY: 'chat_history',
  DCA_SUBSCRIPTIONS: 'dca_subscriptions',
  SWAP_ORDERS: 'swap_orders',
};

export const REDIS_TTL = {
  SESSION: 7 * 24 * 60 * 60, // 7 days
  NOTIFICATION: 30 * 24 * 60 * 60, // 30 days
  CHAT: 24 * 60 * 60, // 24 hours
};
