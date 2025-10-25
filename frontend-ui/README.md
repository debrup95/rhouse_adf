# Frontend UI - Rehouzd React Application

This is the React frontend application for the Rehouzd property estimation platform, built with TypeScript and Chakra UI.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Environment Configuration

The frontend supports **dual environment configuration** - build-time environment variables for local development and runtime environment injection for production deployment.

### Local Development Setup

1. **Create `.env` file in the frontend-ui directory:**
   ```env
   # Backend API URL (automatically proxied during development)
   REACT_APP_API_URL=http://localhost:5004
   
   # Google Maps integration (optional for basic development)
   REACT_APP_Maps_API_KEY=your-google-maps-api-key
   REACT_APP_GOOGLE_MAP_ID=your-google-map-id
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

The development server automatically proxies `/api/*` requests to the backend server.

### How Environment Variables Work

**Local Development:**
- Uses `.env` file or `process.env.REACT_APP_*` variables
- Webpack bundles these at build time
- Proxy automatically routes API calls to backend

**Production Deployment:**
- Uses `window.env` object populated at container startup
- Runtime environment injection via `docker-entrypoint.sh`
- Environment variables injected by Azure Container Apps

**Configuration Priority:**
1. `window.env.*` (runtime injection - production)
2. `process.env.REACT_APP_*` (build-time - development)
3. Fallback defaults (localhost:5004 for dev, /api for production)

## Architecture Overview

### Technology Stack

- **React 19** with TypeScript
- **Chakra UI** for component library and theming
- **Redux Toolkit** + Redux Persist for state management
- **React Router** for client-side routing
- **Google Maps API** for address input and mapping
- **Framer Motion** for animations
- **Axios** for HTTP requests

### Directory Structure

```
src/
├── rehouzd/estimator/          # Main application logic
│   ├── address/                # Address input components (Google Places)
│   ├── auth/                   # Authentication components
│   ├── components/             # Shared UI components
│   ├── estimates/              # Property estimation workflow
│   ├── landing/                # Landing page components
│   ├── pricing/                # Pricing page
│   ├── store/                  # Redux store and slices
│   └── utils/                  # Utility functions
├── config.ts                   # Environment configuration
├── theme.ts                    # Chakra UI theme customization
├── App.tsx                     # Main app component
└── index.tsx                   # Application entry point
```

### State Management (Redux)

**Store Structure:**
- **addressSlice** - Property address and Google Places data
- **propertySlice** - Property details, conditions, and images
- **userSlice** - User authentication and profile data
- **buyerSlice** - Buyer profiles and matching data
- **underwriteSlice** - Investment analysis parameters
- **buyerMatchingSlice** - Buyer connection workflow state

**Persistence:**
- State persists to localStorage via redux-persist
- Automatic rehydration on app restart
- Selective persistence (excludes sensitive data)

### Key Features

**Property Estimation Workflow:**
1. **Address Input** - Google Places autocomplete
2. **Condition Assessment** - Property condition selection with galleries
3. **Market Analysis** - Automated property valuation
4. **Buyer Matching** - Connect with potential buyers
5. **Specialist Services** - Schedule expert consultations

**Authentication:**
- JWT-based authentication
- Google OAuth integration
- User profile management
- Password reset functionality

**Responsive Design:**
- Mobile-first approach with Chakra UI
- Custom theme with brand colors and typography
- Accessible components following ARIA guidelines

## Development Workflow

### Running Locally

**Prerequisites:**
- Node.js v16 or later
- Backend server running on port 5004
- Optional: Google Maps API key for full functionality

**Development Commands:**
```bash
# Install dependencies
npm install

# Start development server (with proxy)
npm start

# Build production bundle
npm run build

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Eject from Create React App (irreversible!)
npm run eject
```

### Backend Integration

**Development Proxy:**
- `/api/*` requests automatically proxied to `http://localhost:5004`
- Configured in `src/setupProxy.js`
- No CORS issues during development

**API Integration:**
- Uses the centralized config from `src/config.ts`
- Automatic API URL resolution based on environment
- Error handling and loading states throughout the app

**Authentication Flow:**
- JWT tokens stored in Redux state (persisted)
- Automatic token refresh handling
- Protected routes with authentication checks

### Google Maps Integration

**Features:**
- Address autocomplete with Google Places
- Property location mapping
- Neighborhood boundary visualization
- Geographic data enrichment

**Setup:**
1. Get API key from Google Cloud Console
2. Enable Places API and Maps JavaScript API
3. Add `REACT_APP_Maps_API_KEY` to `.env`
4. Configure Map ID in Google Cloud Console

**Fallback Behavior:**
- Graceful degradation when API key missing
- Manual address input as fallback
- Error handling for API failures

## Production Deployment

### Docker Container

**Build Process:**
1. Multi-stage Docker build
2. Production React build with optimized bundle
3. Nginx serving static files
4. Runtime environment injection

**Runtime Configuration:**
```bash
# Environment variables injected at container startup
REACT_APP_API_URL=https://your-backend-url
REACT_APP_Maps_API_KEY=your-maps-key
REACT_APP_GOOGLE_MAP_ID=your-map-id
```

**Container Startup:**
1. `docker-entrypoint.sh` generates `env-config.js`
2. Environment variables become available via `window.env`
3. Nginx serves the application with updated config

### Azure Container Apps

**Environment Variables:**
- Set via Azure Container Apps configuration
- Injected at container startup via entrypoint script
- No rebuild required for environment changes

**SSL and Custom Domains:**
- Automatic HTTPS with managed certificates
- Custom domain binding support
- CDN integration for global performance

## Testing

### Test Structure

```bash
# Run all tests
npm test

# Run specific test file
npm test -- AddressInput.test.tsx

# Run tests with coverage
npm test -- --coverage --watchAll=false
```

**Testing Strategy:**
- Unit tests for utilities and helper functions
- Component tests with React Testing Library
- Integration tests for Redux actions and reducers
- Mock external dependencies (Google Maps, API calls)

**Test Coverage:**
- Aim for >80% coverage on business logic
- Focus on user interaction flows
- Test error states and edge cases

## Styling and Theming

### Chakra UI Theme

**Custom Theme (`src/theme.ts`):**
- Brand colors and typography
- Component style overrides
- Responsive breakpoints
- Dark mode support (if implemented)

**Styling Approach:**
- Utility-first with Chakra UI components
- Custom CSS for specific animations
- Responsive design with mobile-first approach
- Accessible color contrast and focus states

### Design System

**Component Hierarchy:**
- Shared components in `components/` directory
- Feature-specific components in respective feature folders
- Consistent prop interfaces and naming conventions

## Performance Optimization

### Bundle Optimization

- Code splitting by route
- Lazy loading for non-critical components
- Tree shaking for unused code
- Production build optimization

### Runtime Performance

- React.memo for expensive components
- useMemo and useCallback for expensive calculations
- Debounced API calls for search inputs
- Image optimization and lazy loading

## Troubleshooting

### Common Issues

**API Connection Problems:**
- Verify backend server is running on port 5004
- Check proxy configuration in `setupProxy.js`
- Ensure CORS is properly configured on backend

**Environment Variable Issues:**
- Prefix must be `REACT_APP_` for visibility to React
- Restart development server after adding new variables
- Check `src/config.ts` for proper fallback handling

**Google Maps Not Loading:**
- Verify API key is valid and has necessary permissions
- Check browser console for API errors
- Ensure Places API and Maps JavaScript API are enabled

**Build Failures:**
- Clear `node_modules` and reinstall dependencies
- Check for TypeScript errors: `npx tsc --noEmit`
- Verify all environment variables are properly set

**State Persistence Issues:**
- Clear localStorage if Redux state structure changed
- Check Redux DevTools for state debugging
- Verify persistor configuration in `store/index.tsx`

### Development Tips

**State Management:**
- Use Redux DevTools browser extension for debugging
- Leverage TypeScript for type-safe actions and selectors
- Keep components pure and move side effects to Redux middleware

**Component Development:**
- Use Chakra UI components as building blocks
- Follow established patterns for forms and modals
- Implement proper loading and error states

**API Integration:**
- Centralize API calls in Redux async thunks
- Handle loading states consistently across components
- Implement proper error boundaries for API failures

## Contributing

### Development Guidelines

1. **TypeScript:** Use strict typing throughout the application
2. **Components:** Follow functional component patterns with hooks
3. **State:** Use Redux for global state, local state for component-specific data
4. **Styling:** Use Chakra UI components and theme system
5. **Testing:** Write tests for new components and features
6. **Accessibility:** Ensure components are keyboard navigable and screen reader friendly

### Code Quality

- ESLint configuration for code consistency
- Prettier for automatic code formatting
- TypeScript strict mode for type safety
- Pre-commit hooks for quality checks (if configured)

For questions or support, check the main project documentation or reach out to the development team.