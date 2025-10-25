import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, trackUserEngagement, setUserId, trackEvent } from '../utils/analytics';

export const useAnalytics = () => {
  const location = useLocation();
  const pageStartTime = useRef<number>(Date.now());
  const scrollDepth = useRef<number>(0);

  // Track page views on route changes
  useEffect(() => {
    trackPageView();
    pageStartTime.current = Date.now();
    scrollDepth.current = 0;
  }, [location.pathname]);

  // Track time on page when component unmounts
  useEffect(() => {
    return () => {
      const timeSpent = Date.now() - pageStartTime.current;
      if (timeSpent > 1000) { // Only track if spent more than 1 second
        trackUserEngagement.timeOnPage(location.pathname, timeSpent);
      }
    };
  }, [location.pathname]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.body.offsetHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      // Track at 25%, 50%, 75%, and 100% scroll depths
      if (scrollPercent >= 25 && scrollDepth.current < 25) {
        trackUserEngagement.scrollDepth(location.pathname, 25);
        scrollDepth.current = 25;
      } else if (scrollPercent >= 50 && scrollDepth.current < 50) {
        trackUserEngagement.scrollDepth(location.pathname, 50);
        scrollDepth.current = 50;
      } else if (scrollPercent >= 75 && scrollDepth.current < 75) {
        trackUserEngagement.scrollDepth(location.pathname, 75);
        scrollDepth.current = 75;
      } else if (scrollPercent >= 100 && scrollDepth.current < 100) {
        trackUserEngagement.scrollDepth(location.pathname, 100);
        scrollDepth.current = 100;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Set user ID when available
  const setUser = useCallback((userId: string) => {
    setUserId(userId);
  }, []);

  // Track button clicks
  const trackButtonClick = useCallback((buttonName: string, pageName?: string) => {
    trackUserEngagement.clickButton(buttonName, pageName || location.pathname);
  }, [location.pathname]);

  // Track form interactions
  const trackFormStart = useCallback((formName: string) => {
    trackUserEngagement.startForm(formName);
  }, []);

  const trackFormComplete = useCallback((formName: string) => {
    trackUserEngagement.completeForm(formName);
  }, []);

  const trackFormError = useCallback((formName: string, errorType: string) => {
    trackUserEngagement.formError(formName, errorType);
  }, []);

  // Track custom events
  const trackCustomEvent = useCallback((
    action: string,
    category: string,
    label?: string,
    value?: number
  ) => {
    trackEvent(action, category, label, value);
  }, []);

  return {
    trackButtonClick,
    trackFormStart,
    trackFormComplete,
    trackFormError,
    trackCustomEvent,
    setUser,
    trackUserEngagement,
  };
}; 