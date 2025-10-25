# Google Analytics Implementation Guide

This document outlines the comprehensive Google Analytics implementation for the Rehouzd application to track user engagement and retention.

## Overview

The analytics system is built with the following components:
- **Analytics Utility** (`src/utils/analytics.ts`) - Core tracking functions
- **Analytics Hook** (`src/hooks/useAnalytics.ts`) - React hook for easy integration
- **Analytics Button** (`src/components/AnalyticsButton.tsx`) - Pre-built button component with tracking

## Setup

### 1. Google Analytics Code (Already Implemented)
The Google Analytics tracking code is already included in `public/index.html`:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-93E5SY0V4W"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-93E5SY0V4W');
</script>
```

### 2. App-Level Integration (Already Implemented)
The main App component automatically:
- Initializes Google Analytics on startup
- Tracks page views on route changes
- Sets user ID when users log in
- Tracks authentication events (login, signup, logout)

## Usage Examples

### Basic Event Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const MyComponent = () => {
  const { trackUserEngagement, trackCustomEvent } = useAnalytics();

  const handleButtonClick = () => {
    // Track button click
    trackUserEngagement.clickButton('get_estimate', 'landing_page');
    
    // Your button logic here
    console.log('Button clicked!');
  };

  const handleFormSubmit = () => {
    // Track form completion
    trackUserEngagement.completeForm('contact_form');
  };

  return (
    <button onClick={handleButtonClick}>
      Get Estimate
    </button>
  );
};
```

### Using the Analytics Button Component

```typescript
import { AnalyticsButton } from '../components/AnalyticsButton';

const MyComponent = () => {
  return (
    <AnalyticsButton
      analyticsName="get_estimate_button"
      onClick={() => console.log('Estimate button clicked')}
      className="btn-primary"
    >
      Get My Estimate
    </AnalyticsButton>
  );
};
```

### Property Estimation Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const EstimateComponent = () => {
  const { trackUserEngagement } = useAnalytics();

  const handleStartEstimate = () => {
    trackUserEngagement.startEstimate('single_family');
  };

  const handleCompleteEstimate = (estimatedValue: number) => {
    trackUserEngagement.completeEstimate(estimatedValue);
  };

  const handleSelectCondition = (condition: string) => {
    trackUserEngagement.selectPropertyCondition(condition);
  };

  return (
    <div>
      <button onClick={handleStartEstimate}>Start Estimate</button>
      <button onClick={() => handleSelectCondition('fixer')}>Fixer</button>
      <button onClick={() => handleCompleteEstimate(250000)}>Complete</button>
    </div>
  );
};
```

### Payment Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const PaymentComponent = () => {
  const { trackUserEngagement } = useAnalytics();

  const handleStartPayment = (amount: number, credits: number) => {
    trackUserEngagement.startPayment(amount, credits);
  };

  const handlePaymentSuccess = (amount: number, credits: number) => {
    trackUserEngagement.completePayment(amount, credits);
  };

  const handlePaymentCancelled = (amount: number, credits: number) => {
    trackUserEngagement.paymentCancelled(amount, credits);
  };

  return (
    <div>
      <button onClick={() => handleStartPayment(29.99, 200)}>
        Buy 200 Credits
      </button>
    </div>
  );
};
```

### Skip Trace Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const SkipTraceComponent = () => {
  const { trackUserEngagement } = useAnalytics();

  const handleStartSkipTrace = (propertyCount: number) => {
    trackUserEngagement.startSkipTrace(propertyCount);
  };

  const handleCompleteSkipTrace = (propertyCount: number, resultsCount: number) => {
    trackUserEngagement.completeSkipTrace(propertyCount, resultsCount);
  };

  return (
    <div>
      <button onClick={() => handleStartSkipTrace(5)}>
        Skip Trace 5 Properties
      </button>
    </div>
  );
};
```

### Form Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const ContactForm = () => {
  const { trackFormStart, trackFormComplete, trackFormError } = useAnalytics();

  useEffect(() => {
    // Track when form is loaded
    trackFormStart('contact_form');
  }, []);

  const handleSubmit = async (formData: any) => {
    try {
      // Submit form data
      await submitForm(formData);
      
      // Track successful submission
      trackFormComplete('contact_form');
    } catch (error) {
      // Track form error
      trackFormError('contact_form', 'validation_error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
};
```

### Error Tracking

```typescript
import { useAnalytics } from '../hooks/useAnalytics';

const MyComponent = () => {
  const { trackUserEngagement } = useAnalytics();

  const handleApiCall = async () => {
    try {
      await apiCall();
    } catch (error) {
      trackUserEngagement.trackError('api_error', error.message);
    }
  };
};
```

## Available Tracking Functions

### Authentication Events
- `trackUserEngagement.login(method)` - Track user login
- `trackUserEngagement.signup(method)` - Track user signup
- `trackUserEngagement.logout()` - Track user logout

### Property Estimation Events
- `trackUserEngagement.startEstimate(propertyType)` - Track estimate start
- `trackUserEngagement.completeEstimate(estimatedValue)` - Track estimate completion
- `trackUserEngagement.saveEstimate()` - Track estimate save

### Property Condition Events
- `trackUserEngagement.selectPropertyCondition(condition)` - Track condition selection
- `trackUserEngagement.uploadPropertyPhotos(photoCount)` - Track photo uploads

### Buyer Matching Events
- `trackUserEngagement.startBuyerMatching()` - Track buyer matching start
- `trackUserEngagement.completeBuyerMatching(buyerCount)` - Track buyer matching completion

### Payment Events
- `trackUserEngagement.startPayment(amount, credits)` - Track payment start
- `trackUserEngagement.completePayment(amount, credits)` - Track payment completion
- `trackUserEngagement.paymentCancelled(amount, credits)` - Track payment cancellation

### Skip Trace Events
- `trackUserEngagement.startSkipTrace(propertyCount)` - Track skip trace start
- `trackUserEngagement.completeSkipTrace(propertyCount, resultsCount)` - Track skip trace completion

### Navigation Events
- `trackUserEngagement.navigateToPage(pageName)` - Track page navigation
- `trackUserEngagement.clickButton(buttonName, pageName)` - Track button clicks

### Form Events
- `trackUserEngagement.startForm(formName)` - Track form start
- `trackUserEngagement.completeForm(formName)` - Track form completion
- `trackUserEngagement.formError(formName, errorType)` - Track form errors

### Contact Events
- `trackUserEngagement.contactSupport(method)` - Track support contact
- `trackUserEngagement.requestCallback()` - Track callback requests

### Engagement Events
- `trackUserEngagement.timeOnPage(pageName, timeSpent)` - Track time on page
- `trackUserEngagement.scrollDepth(pageName, scrollPercentage)` - Track scroll depth

### Error Tracking
- `trackUserEngagement.trackError(errorType, errorMessage)` - Track errors

## Automatic Tracking

The following events are automatically tracked:

1. **Page Views** - Every route change
2. **Time on Page** - When users leave a page
3. **Scroll Depth** - At 25%, 50%, 75%, and 100% scroll
4. **User Authentication** - Login, signup, logout events
5. **User ID Setting** - When users log in

## Google Analytics Reports

With this implementation, you can create reports for:

### User Engagement
- Page views and time on page
- Scroll depth analysis
- Button click tracking
- Form completion rates

### Conversion Funnel
- Estimate start → completion
- Payment start → completion
- Skip trace start → completion

### User Behavior
- Authentication methods
- Property condition preferences
- Feature usage patterns

### Error Tracking
- Form validation errors
- API error rates
- User experience issues

## Best Practices

1. **Consistent Naming** - Use consistent event names across components
2. **Meaningful Labels** - Include relevant data in event labels
3. **Value Tracking** - Track monetary values for conversion analysis
4. **Error Handling** - Always track errors for debugging
5. **User Privacy** - Don't track personally identifiable information

## Testing

To test analytics tracking:

1. Open browser developer tools
2. Go to Network tab
3. Filter by "google-analytics" or "collect"
4. Perform actions in your app
5. Verify events are being sent

## Troubleshooting

### Events Not Tracking
- Check if Google Analytics is loaded (`window.gtag`)
- Verify event names are correct
- Check browser console for errors

### Duplicate Events
- Ensure events are only called once per action
- Use proper event cleanup in useEffect hooks

### Missing Data
- Verify user ID is set correctly
- Check if page views are tracking
- Ensure proper event categorization 