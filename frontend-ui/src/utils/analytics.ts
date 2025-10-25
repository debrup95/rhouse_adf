// Google Analytics utility functions for tracking user engagement

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Initialize Google Analytics
export const initGA = () => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-93E5SY0V4W', {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// Track page views
export const trackPageView = (pageTitle?: string, pagePath?: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-93E5SY0V4W', {
      page_title: pageTitle || document.title,
      page_location: pagePath || window.location.href,
    });
  }
};

// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track user engagement events
export const trackUserEngagement = {
  // Authentication events
  login: (method: 'google' | 'email' | 'phone') => {
    trackEvent('login', 'authentication', method);
  },
  
  signup: (method: 'google' | 'email' | 'phone') => {
    trackEvent('sign_up', 'authentication', method);
  },
  
  logout: () => {
    trackEvent('logout', 'authentication');
  },

  // Property estimation events
  startEstimate: (propertyType?: string) => {
    trackEvent('begin_checkout', 'estimation', propertyType);
  },
  
  completeEstimate: (estimatedValue?: number) => {
    trackEvent('purchase', 'estimation', 'estimate_completed', estimatedValue);
  },
  
  saveEstimate: () => {
    trackEvent('save_estimate', 'estimation');
  },

  // Property condition events
  selectPropertyCondition: (condition: string) => {
    trackEvent('select_content', 'property_condition', condition);
  },
  
  uploadPropertyPhotos: (photoCount: number) => {
    trackEvent('upload_photos', 'property_photos', `count_${photoCount}`);
  },

  // Buyer matching events
  startBuyerMatching: () => {
    trackEvent('begin_checkout', 'buyer_matching');
  },
  
  completeBuyerMatching: (buyerCount: number) => {
    trackEvent('purchase', 'buyer_matching', `buyers_${buyerCount}`);
  },

  // Payment events
  startPayment: (amount: number, credits: number) => {
    trackEvent('begin_checkout', 'payment', `credits_${credits}`, amount);
  },
  
  completePayment: (amount: number, credits: number) => {
    trackEvent('purchase', 'payment', `credits_${credits}`, amount);
  },
  
  paymentCancelled: (amount: number, credits: number) => {
    trackEvent('payment_cancelled', 'payment', `credits_${credits}`, amount);
  },

  // Skip trace events
  startSkipTrace: (propertyCount: number) => {
    trackEvent('begin_checkout', 'skip_trace', `properties_${propertyCount}`);
  },
  
  completeSkipTrace: (propertyCount: number, resultsCount: number) => {
    trackEvent('purchase', 'skip_trace', `properties_${propertyCount}_results_${resultsCount}`);
  },

  // Navigation events
  navigateToPage: (pageName: string) => {
    trackEvent('page_view', 'navigation', pageName);
  },
  
  clickButton: (buttonName: string, pageName?: string) => {
    trackEvent('click', 'button', `${pageName}_${buttonName}`);
  },

  // Form interactions
  startForm: (formName: string) => {
    trackEvent('begin_checkout', 'form', formName);
  },
  
  completeForm: (formName: string) => {
    trackEvent('purchase', 'form', formName);
  },
  
  formError: (formName: string, errorType: string) => {
    trackEvent('form_error', 'form', `${formName}_${errorType}`);
  },

  // Contact events
  contactSupport: (method: 'email' | 'phone' | 'callback') => {
    trackEvent('contact_support', 'contact', method);
  },
  
  requestCallback: () => {
    trackEvent('request_callback', 'contact');
  },

  // Error tracking
  trackError: (errorType: string, errorMessage: string) => {
    trackEvent('exception', 'error', `${errorType}_${errorMessage}`);
  },

  // User preferences
  updatePreferences: (preferenceType: string) => {
    trackEvent('update_preferences', 'user_settings', preferenceType);
  },

  // Search events
  searchProperties: (searchTerm: string) => {
    trackEvent('search', 'property_search', searchTerm);
  },

  // Time on page tracking
  timeOnPage: (pageName: string, timeSpent: number) => {
    trackEvent('timing_complete', 'engagement', pageName, timeSpent);
  },

  // Scroll depth tracking
  scrollDepth: (pageName: string, scrollPercentage: number) => {
    trackEvent('scroll', 'engagement', `${pageName}_${scrollPercentage}%`);
  },
};

// Track user properties for better segmentation
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-93E5SY0V4W', {
      custom_map: properties,
    });
  }
};

// Track user ID for cross-device tracking
export const setUserId = (userId: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-93E5SY0V4W', {
      user_id: userId,
    });
  }
};

// Enhanced ecommerce tracking
export const trackEcommerce = {
  addToCart: (itemId: string, itemName: string, price: number, quantity: number = 1) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'add_to_cart', {
        currency: 'USD',
        value: price * quantity,
        items: [{
          item_id: itemId,
          item_name: itemName,
          price: price,
          quantity: quantity,
        }],
      });
    }
  },

  removeFromCart: (itemId: string, itemName: string, price: number, quantity: number = 1) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'remove_from_cart', {
        currency: 'USD',
        value: price * quantity,
        items: [{
          item_id: itemId,
          item_name: itemName,
          price: price,
          quantity: quantity,
        }],
      });
    }
  },

  viewItem: (itemId: string, itemName: string, price: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'view_item', {
        currency: 'USD',
        value: price,
        items: [{
          item_id: itemId,
          item_name: itemName,
          price: price,
        }],
      });
    }
  },
};

export default {
  initGA,
  trackPageView,
  trackEvent,
  trackUserEngagement,
  setUserProperties,
  setUserId,
  trackEcommerce,
}; 