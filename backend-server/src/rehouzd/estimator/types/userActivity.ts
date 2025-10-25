// User Activity Tracking Types
export interface UserSearchActivity {
  userId?: number;
  sessionId?: string;  
  searchType?: 'address_lookup' | 'property_details' | 'comparables' | 'market_analysis';
  searchSource?: 'web_app' | 'mobile_app' | 'api';
  resultsFound?: boolean;
}

export interface UserSearchContext {
  userId?: number;
  sessionId?: string;
  searchType?: string;
  searchSource?: string;
}

// Helper function to generate session ID
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Helper function to extract user context from request
export const extractUserContext = (req: any): UserSearchContext => {
  // Try multiple ways to get user ID
  const userId = req.user?.user_id || 
                 req.user?.id || 
                 req.userId || 
                 req.body?.userId || 
                 req.query?.userId ||
                 req.headers['x-user-id'];

  // Try multiple ways to get session ID
  const sessionId = req.sessionID || 
                    req.session?.id ||
                    req.headers['x-session-id'] || 
                    req.body?.sessionId ||
                    req.query?.sessionId;

  // Determine search type
  const searchType = req.body?.searchType || 
                     req.query?.searchType || 
                     req.headers['x-search-type'] ||
                     'address_lookup';

  // Determine search source based on user agent or explicit header
  let searchSource = 'web_app';
  if (req.headers['x-search-source']) {
    searchSource = req.headers['x-search-source'];
  } else if (req.headers['user-agent']) {
    const userAgent = req.headers['user-agent'].toLowerCase();
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      searchSource = 'mobile_app';
    }
  }

  return {
    userId: userId ? parseInt(userId.toString()) : undefined,
    sessionId: sessionId || generateSessionId(),
    searchType,
    searchSource
  };
}; 