import React, { useMemo } from 'react';
import { useMarketDataFromRedux } from '../hooks';
import { Box, SimpleGrid, VStack, Button, HStack, Icon, Heading, Text } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';
import { useAppSelector } from '../store/hooks';
import { calculateBuyerEstimatedPrice } from '../utils/calculateBuyerEstimatedPrice';
import { getDisplayedNeighborhoodComps } from './investor/utils/getDisplayedNeighborhoodComps';
import rehabCalculatorService, { RehabCalculationRequest } from '../services/rehabCalculatorService';

// Import report components
import ReportHeader from './components/ReportHeader';
import PropertyDetailsCard from './components/PropertyDetailsCard';
import MarketSnapshotCard from './components/MarketSnapshotCard';

import FlipAnalysisCard from './components/FlipAnalysisCard';
import RentalAnalysisCard from './components/RentalAnalysisCard';
import ComparablesSection from './components/ComparablesSection';
import RehabScopeSection from './components/RehabScopeSection';
import ReportFooter from './components/ReportFooter';
import ShareReportButton from './ShareReportButton';

interface InvestorReportProps {
  reportStrategy?: 'rent' | 'flip';
  presetValues?: Record<string, number>;
  selectedNeighborhoodComps?: string[];
  estimateData?: any;
  isSharedView?: boolean;
}

const InvestorReport: React.FC<InvestorReportProps> = ({ reportStrategy, presetValues = {}, selectedNeighborhoodComps, estimateData, isSharedView = false }) => {

  // Format phone number to US format (+1-xxx-xxx-xxxx)
  const formatUSPhoneNumber = (phoneNumber: string | null | undefined): string => {
    if (!phoneNumber) return '';

    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it's a 10-digit number (without country code)
    if (cleaned.length === 10) {
      return `+1-${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // Check if it's an 11-digit number starting with 1 (with country code)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      const withoutCountry = cleaned.slice(1);
      return `+1-${withoutCountry.slice(0, 3)}-${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
    }

    // Return original if it doesn't match expected formats
    return phoneNumber;
  };

  // Generate PDF filename with property address
  const generatePDFFilename = (): string => {
    const baseName = 'Rehouzd-Estimate';

    // Get property address from addressData
    let propertyAddress = '';

    if (addressData) {
      // Try formattedAddress first, then construct from individual fields
      propertyAddress = (addressData as any)?.formattedAddress ||
                       `${(addressData as any)?.address || ''}, ${(addressData as any)?.city || ''}`.trim();

      if (propertyAddress) {
        // Sanitize the address for filename use
        propertyAddress = propertyAddress
          .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
          .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
          .toLowerCase()
          .substring(0, 50); // Limit length to prevent overly long filenames

        return `${baseName}-${propertyAddress}.pdf`;
      }
    }

    // Fallback to default name if no address available
    return `${baseName}.pdf`;
  };
  // Get data from Redux store (step 3 data) or from shared estimate data
  const propertyState = useAppSelector((state) => state.property);
  const underwriteState = useAppSelector((state) => state.underwrite);
  const userState = useAppSelector((state) => state.user);
  const addressState = useAppSelector((state) => state.address);
  const buyerState = useAppSelector((state) => state.buyers);
  
  // Use shared estimate data when in shared view, otherwise use Redux state
  const property = isSharedView && estimateData ? estimateData.property : propertyState.properties[0];
  const addressData = isSharedView && estimateData ? estimateData.property?.addressData?.items?.[0] : property?.addressData?.items?.[0];
  const sharedUnderwriteState = isSharedView && estimateData ? {
    rent: estimateData.rent_underwrite_values,
    flip: estimateData.flip_underwrite_values,
    activeStrategy: reportStrategy || estimateData.active_investment_strategy || 'flip'
  } : underwriteState;
  const sharedAddressState = isSharedView && estimateData ? estimateData.addressState : addressState;
  // For shared view, use the user data from the shared estimate, otherwise use Redux state
  const sharedUserState = isSharedView && estimateData?.sharedByUser ? estimateData.sharedByUser : userState;

  // Hold computed rehab results for use in the RehabScope card
  const [computedRehab, setComputedRehab] = React.useState<{
    perCategoryCosts: Record<string, number>;
    subtotal: number;
    contingencyAmount: number;
    total: number;
  } | null>(null);



  // Log parameters and call rehabCalculatorService to compute costs, then log result
  React.useEffect(() => {
    const run = async () => {
      const selectedStrategy: 'rent' | 'flip' = (reportStrategy as any) || (sharedUnderwriteState?.activeStrategy as 'rent' | 'flip') || 'flip';
      // Read fresh snapshots from shared state every time
      const rentDC: Record<string, number> = ((sharedUnderwriteState as any)?.rent?.detailedCategories || {}) as Record<string, number>;
      const flipDC: Record<string, number> = ((sharedUnderwriteState as any)?.flip?.detailedCategories || {}) as Record<string, number>;
      const strategyData: any = selectedStrategy === 'rent' ? (sharedUnderwriteState as any)?.rent : (sharedUnderwriteState as any)?.flip;
      // Use a defensive clone to avoid accidental mutation and fallback to preset values if Redux is empty
      const selectedDC = (selectedStrategy === 'rent' ? rentDC : flipDC);
      const usePresets = Object.keys(selectedDC || {}).length === 0 && Object.keys(presetValues || {}).length > 0;
      const detailedCategories: Record<string, number> = ({ ...(usePresets ? presetValues : selectedDC) }) as Record<string, number>;
      const rentContingency = Number((sharedUnderwriteState as any)?.rent?.detailedContingency ?? 5);
      const rentMiscAmount = Number((sharedUnderwriteState as any)?.rent?.detailedMiscAmount ?? 0);
      const flipContingency = Number((sharedUnderwriteState as any)?.flip?.detailedContingency ?? 5);
      const flipMiscAmount = Number((sharedUnderwriteState as any)?.flip?.detailedMiscAmount ?? 0);

      const squareFootage = Number((addressData as any)?.square_footage) || 0;
      const afterRepairValue = Number(selectedStrategy === 'rent' ? (sharedUnderwriteState as any)?.rent?.afterRepairValue : (sharedUnderwriteState as any)?.flip?.afterRepairValue) || 0;
      // Use Redux contingency only if using Redux categories; otherwise default to 5%
      const source = usePresets ? 'presetValues' : (Object.keys(selectedDC || {}).length > 0 ? 'redux' : 'defaults');
      const contingency = source === 'redux' ? Number(strategyData?.detailedContingency ?? 5) : 5;
      const bathroomCount = Number((addressData as any)?.bathrooms ?? 1);
      const stateAbbr = (addressData as any)?.state_abbreviation || null;
      const county = (addressData as any)?.county || null;

      // Decide data source: Redux detailedCategories or fallback defaults (all zeros)
      const hasDetailed = Object.keys(detailedCategories || {}).length > 0;

      // Build rehab calculation request

      const request: RehabCalculationRequest = {
        afterRepairValue,
        squareFootage,
        bathrooms: hasDetailed ? Number(detailedCategories.bathrooms || 0) : 0,
        windows: hasDetailed ? Number(detailedCategories.windows || 0) : 0,
        electrical: hasDetailed ? Number(detailedCategories.electrical || 0) : 0,
        plumbing: hasDetailed ? Number(detailedCategories.plumbing || 0) : 0,
        interiorPaint: hasDetailed ? Number(detailedCategories.interiorPaint || 0) : 0,
        exteriorPaint: hasDetailed ? Number(detailedCategories.exteriorPaint || 0) : 0,
        exteriorSiding: hasDetailed ? Number(detailedCategories.exteriorSiding || 0) : 0,
        kitchen: hasDetailed ? Number(detailedCategories.kitchen || 0) : 0,
        roof: hasDetailed ? Number(detailedCategories.roof || 0) : 0,
        hvac: hasDetailed ? Number(detailedCategories.hvac || 0) : 0,
        flooring: hasDetailed ? Number(detailedCategories.flooring || 0) : 0,
        waterHeater: hasDetailed ? Number(detailedCategories.waterHeater || 0) : 0,
        contingency
      };


      // Fetch calculator data, then compute and log result
      if (stateAbbr && county) {
        try {
          const calculatorData = await rehabCalculatorService.getRehabCalculatorData(stateAbbr, county, squareFootage);
          if (calculatorData) {
            const result = rehabCalculatorService.calculateRehabCosts(request, calculatorData, bathroomCount);
            const backendToUi: Record<string, string> = {
              bathroom: 'bathrooms',
              windows: 'windows',
              electrical: 'electrical',
              plumbing: 'plumbing',
              interior_paint: 'interiorPaint',
              exterior_paint: 'exteriorPaint',
              exterior_siding: 'exteriorSiding',
              kitchen: 'kitchen',
              roof: 'roof',
              hvac: 'hvac',
              flooring: 'flooring',
              water_heater: 'waterHeater'
            };
            const perCategoryCosts: Record<string, number> = {};
            Object.keys(result.categoryBreakdown || {}).forEach((k) => {
              const uiKey = backendToUi[k] || k;
              perCategoryCosts[uiKey] = result.categoryBreakdown[k]?.cost || 0;
            });
            // Store for RehabScope consumption
            setComputedRehab({
              perCategoryCosts,
              subtotal: result.subtotal,
              contingencyAmount: result.contingencyAmount,
              total: result.total,
            });
            // If no detailed categories in Redux, we can use the computed perCategoryCosts as a preview
          }
        } catch (e) {
          // Failed to compute rehab costs
        }
      }
    };
    run();
  }, [sharedUnderwriteState, addressData, reportStrategy]);
  
  // Fetch market data from Redux store (no database calls needed!)
  const { chartData: marketChartData, marketStats, loading: marketLoading, error: marketError } = useMarketDataFromRedux(addressData?.zip_code || '');

  // Generate report data from frontend state
  const reportData = useMemo(() => {
    if (!property || !addressData) {
      return null;
    }

    // Strategy selection for rehab scope
    const selectedStrategy: 'rent' | 'flip' = reportStrategy || (sharedUnderwriteState?.activeStrategy as 'rent' | 'flip') || 'flip';
    const strategyData = selectedStrategy === 'rent' ? (sharedUnderwriteState?.rent || {}) : (sharedUnderwriteState?.flip || {});
    const flipData = sharedUnderwriteState?.flip || {};

    // Format currency helper
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value || 0);
    };

    // Use the existing calculateBuyerEstimatedPrice function for flip calculations
    // This ensures consistency with step 3 and avoids code duplication
    const flipCalculation = calculateBuyerEstimatedPrice(
      'flip',
      false, // Not used for flip calculation
      false, // Not used for flip calculation
      {
        afterRepairValue: 0, // Not used for flip calculation
        highRehab: 0 // Not used for flip calculation
      },
      {
        estimatedOffer: flipData?.estimatedOffer || 0,
        highRehab: flipData?.highRehab || 0,
        holdingCosts: flipData?.holdingCosts || 0
      }
    );
    
    const purchasePrice = flipCalculation.buyerEstimatedOffer;
    
    // Get flip data for other calculations
    const arv = flipData?.afterRepairValue || 0;
    const sellingCostsPercentage = flipData?.sellingCosts || 0;
    const holdingCostsPercentage = flipData?.holdingCosts || 0;
    const marginPercentage = flipData?.margin || 0;
    
    const rehabCosts = flipData?.highRehab || 0; // Flip tab Rehab cost current value
    
    // Calculate amounts for display purposes
    const sellingCostsAmount = (arv * sellingCostsPercentage) / 100;
    const holdingCostsAmount = (arv * holdingCostsPercentage) / 100;
    
    // Calculate net profit as ARV * Margin percentage
    const estimatedNetProfit = (arv * marginPercentage) / 100;
    
    // Calculate total closing/holding percentage
    const totalClosingHoldingPercentage = sellingCostsPercentage + holdingCostsPercentage;

    // Calculate rental values using actual rental tab data
    const monthlyRent = sharedUnderwriteState?.rent?.rent || 0;
    const expensePercentage = sharedUnderwriteState?.rent?.expense || 0; // Get actual expense percentage from rental tab
    const monthlyExpenses = (monthlyRent * expensePercentage) / 100; // Calculate using actual percentage
    const monthlyNetIncome = monthlyRent - monthlyExpenses;
    const annualNetIncome = monthlyNetIncome * 12;
    const capRate = sharedUnderwriteState?.rent?.capRate || 0; // Get actual cap rate from rental tab
    
    // Get rental-specific values for calculation
    const rentalRehabCosts = sharedUnderwriteState?.rent?.highRehab || 0; // Rental tab Rehab cost current value
    const rentalARV = sharedUnderwriteState?.rent?.afterRepairValue || 0; // Rental tab after repair value
    
    // Dynamic investment type based on property condition (same mapping as ConditionStep.tsx)
    const getInvestmentType = (condition: string): string => {
      switch (condition) {
        case 'Fixer':
          return 'Fix & Flip or BRRRR';
        case 'Outdated':
          return 'Fix & Flip or BRRRR';
        case 'Standard':
          return 'Buy & Hold';
        case 'Renovated':
          return 'Buy & Hold';
        default:
          return 'Flip or BRRRR';
      }
    };
    
    const investmentType = getInvestmentType(sharedAddressState?.condition || '');
    
    // Use the existing calculateBuyerEstimatedPrice function for rental calculations
    // This ensures consistency with step 3 and avoids code duplication
    const propertyCondition = sharedAddressState?.condition;
    const isFixerProperty = propertyCondition === 'Fixer' || propertyCondition === 'Outdated';
    const isStandardProperty = propertyCondition === 'Standard';
    
    const rentalCalculation = calculateBuyerEstimatedPrice(
      'rent',
      isFixerProperty,
      isStandardProperty,
      {
        afterRepairValue: rentalARV,
        highRehab: rentalRehabCosts
      },
      {
        estimatedOffer: 0, // Not used for rental calculation
        highRehab: 0, // Not used for rental calculation
        holdingCosts: sharedUnderwriteState?.flip?.holdingCosts || 0
      }
    );
    
    const rentalPurchasePrice = rentalCalculation.buyerEstimatedOffer;

    // Market chart data is now fetched from the database via useMarketData hook

    // Generate comparables data using smart filtering
    const rentValue = sharedUnderwriteState?.rent?.rent || 0;
    const arvValue = flipData?.afterRepairValue || 0;
    
    // Use smart filtering to select the best comparables
    let arvComps: any[], rentalComps: any[];
    
    // Check if we have stored comps from shared view
    if (isSharedView && estimateData?.displayedArvComps && estimateData?.displayedRentalComps) {
      // Use pre-stored comps from shared view
      arvComps = estimateData.displayedArvComps;
      rentalComps = estimateData.displayedRentalComps;
    } else {
      // Use the shared utility function for consistent comp selection
      const { arvComps: selectedArvComps, rentalComps: selectedRentalComps } = getDisplayedNeighborhoodComps(
        property?.allProperties || [],
        arvValue,
        rentValue,
        selectedNeighborhoodComps // Pass manual selection if available
      );
      
      arvComps = selectedArvComps;
      rentalComps = selectedRentalComps;
    }
    

    // Generate rehab scope data using detailed categories from selected strategy
    // Prefer live computedRehab if present; otherwise use Redux values
    const detailedCategories: Record<string, number> = (computedRehab?.perCategoryCosts || ((strategyData as any)?.detailedCategories || {})) as Record<string, number>;
    // Use Redux contingency/misc when available regardless of source of category costs; otherwise fallback
    const reduxContVal = Number((strategyData as any)?.detailedContingency);
    const contingencyPercent: number = Number.isFinite(reduxContVal) ? reduxContVal : 5;
    const reduxMiscVal = Number((strategyData as any)?.detailedMiscAmount);
    const miscAmount: number = Number.isFinite(reduxMiscVal) ? reduxMiscVal : 0;
    
    // Calculate total base cost (excluding contingency and misc)
    const baseTotal: number = Object.values(detailedCategories).reduce(
      (sum: number, cost: number) => sum + (Number(cost) || 0),
      0
    );
    const contingencyAmount: number = computedRehab?.contingencyAmount ?? (baseTotal * contingencyPercent) / 100;
    
    // Map the 12 detailed categories to 8 display rows as per the expected format
    const rehabItems = [
      // Row 1: Kitchen
      {
        name: 'Full Kitchen',
        cost: formatCurrency(detailedCategories.kitchen || 0)
      },
      // Row 2: Bathrooms
      {
        name: 'Bathrooms',
        cost: formatCurrency(detailedCategories.bathrooms || 0)
      },
      // Row 3: Flooring
      {
        name: 'Flooring',
        cost: formatCurrency(detailedCategories.flooring || 0)
      },
      // Row 4: HVAC System
      {
        name: 'HVAC System',
        cost: formatCurrency(detailedCategories.hvac || 0)
      },
      // Row 5: Roof
      {
        name: 'Roof',
        cost: formatCurrency(detailedCategories.roof || 0)
      },
      // Row 6: Paint
      {
        name: 'Paint',
        cost: formatCurrency((detailedCategories.interiorPaint || 0) + (detailedCategories.exteriorPaint || 0))
      },
      // Row 7: Electrical
      {
        name: 'Electrical',
        cost: formatCurrency((detailedCategories.electrical || 0) + (detailedCategories.plumbing || 0))
      },
      // Row 8: Contingency, Windows, Siding, Water Heater, Misc (Combined)
      {
        name: 'Contingency, Plumbing, Windows, Siding',
        cost: formatCurrency(contingencyAmount + (detailedCategories.windows || 0) + (detailedCategories.exteriorSiding || 0) + (detailedCategories.waterHeater || 0) + miscAmount)
      }
    ];

    return {
      reportTitle: 'Off-Market Opportunity',
      propertyAddress: (addressData as any)?.formattedAddress || `${addressData?.address}, ${addressData?.city}, ${addressData?.state_abbreviation} ${addressData?.zip_code}`,
      propertyDetails: {
        type: addressData?.property_type || 'Single Family',
        bedBath: `${addressData?.bedrooms || 0} / ${addressData?.bathrooms || 0}`,
        squareFootage: addressData?.square_footage?.toLocaleString() || '0',
        yearBuilt: addressData?.year_built?.toString() || 'N/A',
        condition: addressState?.condition || 'N/A',
        investmentType: investmentType
      },
      marketSnapshot: {
        zipCode: addressData?.zip_code || 'N/A',
        chartData: marketChartData
      },
      financialSummary: {
        purchasePrice: formatCurrency(purchasePrice),
        estimatedRehab: formatCurrency(rehabCosts),
        afterRepairValue: formatCurrency(arv),
        estimatedNetProfit: formatCurrency(estimatedNetProfit)
      },
      flipAnalysis: {
        afterRepairValue: formatCurrency(arv),
        purchasePrice: `(${formatCurrency(purchasePrice)})`,
        rehabCosts: `(${formatCurrency(rehabCosts)})`,
        closingHoldingCosts: `(${formatCurrency((arv * sellingCostsPercentage) / 100 + (arv * holdingCostsPercentage) / 100)})`,
        closingHoldingPercentage: totalClosingHoldingPercentage,
        netProfit: formatCurrency(estimatedNetProfit)
      },
      rentalAnalysis: {
        purchasePrice: formatCurrency(rentalPurchasePrice),
        estimatedRehab: formatCurrency(rentalRehabCosts),
        monthlyRent: formatCurrency(monthlyRent),
        monthlyExpenses: `(${formatCurrency(monthlyExpenses)})`,
        monthlyNetIncome: formatCurrency(monthlyNetIncome),
        annualNetIncome: formatCurrency(annualNetIncome),
        capRate,
        expensePercentage: expensePercentage.toString()
      },
      comparables: {
        arvComps,
        rentalComps
      },
      rehabScope: {
        items: rehabItems,
        total: formatCurrency(baseTotal + contingencyAmount + miscAmount)
      },
      footer: {
        contactTitle: 'Contact to Schedule Showing or Submit Offer',
        companyName: sharedUserState?.first_name && sharedUserState?.last_name ? `${sharedUserState.first_name} ${sharedUserState.last_name}` : '',
        phone: formatUSPhoneNumber(sharedUserState?.mobile_number),
        email: sharedUserState?.email || '',
        // Create a single formatted contact line for better PDF rendering
        contactInfo: [
          sharedUserState?.first_name && sharedUserState?.last_name ? `${sharedUserState.first_name} ${sharedUserState.last_name}` : '',
          formatUSPhoneNumber(sharedUserState?.mobile_number),
          sharedUserState?.email || ''
        ].filter(Boolean).join(' | ')
      }
    };
  }, [property, addressData, sharedUnderwriteState, sharedAddressState, sharedUserState, reportStrategy, computedRehab]);

  // Ref to the report container for printing
  const reportRef = React.useRef<HTMLDivElement | null>(null);

  // Fallback to print dialog if PDF generation fails
  const handlePrintFallback = () => {
    // Add enhanced styles for Azure deployment compatibility
    const printStyles = document.createElement('style');
    printStyles.id = 'azure-print-styles';
    printStyles.textContent = `
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
        }
        body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
        }
        .report-container {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0.3in !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          font-family: inherit !important;
        }
        [data-columns="2"] {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 8px !important;
        }
        .chakra-box {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          font-family: inherit !important;
        }
        [data-print-hide] {
          display: none !important;
        }
      }
    `;
    
    if (!document.head.querySelector('#azure-print-styles')) {
      document.head.appendChild(printStyles);
    }
    
    window.print();
  };

  // Handle download as PDF using html2pdf.js for better formatting and link preservation
  const handleDownloadPDF = async () => {
    const reportNode = reportRef.current;
    if (!reportNode) {
      alert('Report content not found. Please try again.');
      return;
    }

    try {
      // Dynamic import to avoid bundle size issues
      const { default: html2pdf } = await import('html2pdf.js');

      const filename = generatePDFFilename();

      // Create a clone of the report to avoid modifying the original
      const clonedNode = reportNode.cloneNode(true) as HTMLElement;
      
      // Remove download button section
      Array.from(clonedNode.querySelectorAll('[data-print-hide]')).forEach((el) => {
        el.parentElement?.removeChild(el);
      });

      // Apply inline styles for better PDF rendering
      const applyPDFStyles = (element: HTMLElement) => {
        if (!element || !element.style) return;
        
        // Base font styling
        element.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
        
        // Handle specific elements
        if (element.classList?.contains('chakra-heading') || element.tagName?.match(/^H[1-6]$/)) {
          element.style.pageBreakAfter = 'avoid';
          element.style.pageBreakInside = 'avoid';
          element.style.marginBottom = '8px';
        }
        
        if (element.classList?.contains('chakra-box')) {
          element.style.pageBreakInside = 'avoid';
          element.style.marginBottom = '8px';
          element.style.paddingTop = '8px';
          element.style.paddingBottom = '8px';
        }
        
        // Ensure links are preserved and styled
        if (element.tagName === 'A') {
          element.style.color = '#3182ce';
          element.style.textDecoration = 'underline';
          // Preserve href attribute for clickable links
          const href = element.getAttribute('href');
          if (href) {
            element.setAttribute('data-href', href);
          }
        }
        
        // Handle grids with better spacing
        if (element.hasAttribute?.('data-columns') && element.getAttribute('data-columns') === '2') {
          element.style.display = 'grid';
          element.style.gridTemplateColumns = '1fr 1fr';
          element.style.gap = '12px';
          element.style.alignItems = 'start';
        }
        
        // Compact spacing for better fit
        if (element.classList?.contains('chakra-vstack')) {
          element.style.gap = '6px';
          element.style.alignItems = 'stretch';
        }
        
        if (element.classList?.contains('chakra-simple-grid')) {
          element.style.gap = '10px';
        }
        
        // Add spacing for card content
        if (element.classList?.contains('chakra-stat') || element.classList?.contains('chakra-stat__group')) {
          element.style.marginBottom = '6px';
        }
        
        // Handle summary sections with background colors
        if (element.style.backgroundColor || element.classList?.contains('chakra-hstack')) {
          const bgColor = window.getComputedStyle(element).backgroundColor;
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            element.style.marginTop = '8px';
            element.style.paddingTop = '8px';
            element.style.paddingBottom = '8px';
            element.style.paddingLeft = '12px';
            element.style.paddingRight = '12px';
          }
        }
        
        // Improve spacing for table-like content
        if (element.tagName === 'TR' || element.classList?.contains('chakra-table__row')) {
          element.style.paddingTop = '3px';
          element.style.paddingBottom = '3px';
        }
        
        // Ensure proper font sizes - smaller for PDF
        if (element.classList?.contains('chakra-text')) {
          element.style.fontSize = '12px';
          element.style.lineHeight = '1.3';
        }
        
        // Make headings smaller with proper spacing
        if (element.classList?.contains('chakra-heading')) {
          const headingLevel = element.tagName;
          if (headingLevel === 'H1' || element.style.fontSize === '2xl' || element.textContent?.includes('Investment Scenarios')) {
            // Main section headings
            element.style.fontSize = '16px';
            element.style.marginTop = '12px';
            element.style.marginBottom = '10px';
          } else {
            // Card headings
            element.style.fontSize = '14px';
            element.style.marginTop = '6px';
            element.style.marginBottom = '8px';
          }
          element.style.lineHeight = '1.2';
          element.style.fontWeight = 'bold';
        }
        
        // Handle footer to prevent page break and make it more compact
        if (element.classList?.contains('page-break-avoid')) {
          element.style.pageBreakInside = 'avoid';
          element.style.pageBreakBefore = 'avoid';
          element.style.marginTop = '6px';
          element.style.paddingTop = '3px';
          element.style.fontSize = '11px';
          element.style.lineHeight = '1.2';
        }

        // Ensure text content is preserved for footer
        if (element.tagName === 'TEXT' && element.textContent) {
          element.style.whiteSpace = 'nowrap';
        }
        
        // Recursively apply to children
        if (element.children) {
          Array.from(element.children).forEach(child => {
            applyPDFStyles(child as HTMLElement);
          });
        }
      };
      
      // Apply the PDF styles
      applyPDFStyles(clonedNode);

      // Ensure footer text with pipes is preserved
      const footerTexts = clonedNode.querySelectorAll('.page-break-avoid Text, .page-break-avoid p, .page-break-avoid span');
      footerTexts.forEach((textElement) => {
        if (textElement.textContent && textElement.textContent.includes('|')) {
          (textElement as HTMLElement).style.whiteSpace = 'nowrap';
          (textElement as HTMLElement).style.display = 'inline';
        }
      });

      // Configuration for html2pdf with aggressive single-page fitting
      const opt = {
        margin: [6, 6, 6, 6], // Minimal margins to maximize content space
        filename: filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { 
          scale: 0.9, // Much smaller scale to force single page
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 850,
          windowHeight: 1000, // Much smaller height to force compression
          scrollX: 0,
          scrollY: 0,
          letterRendering: true,
          removeContainer: true
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true,
          precision: 2,
          hotfixes: ['px_scaling'] // Fix scaling issues
        },
        pagebreak: { 
          mode: 'avoid-all', // Aggressively avoid page breaks
          before: [],
          after: [],
          avoid: ['.page-break-avoid', '.chakra-box', 'tr', 'img', 'footer']
        },
        enableLinks: true // Enable clickable links in PDF
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(clonedNode).save();

    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to enhanced print dialog for Azure compatibility
      handlePrintFallback();
    }
  };

  // No data available
  if (!reportData) {
    return (
      <Box
        maxWidth="850px"
        margin="0 auto"
        background="white"
        boxShadow="0 6px 20px rgba(0,0,0,0.08)"
        borderRadius="12px"
        padding="48px"
        boxSizing="border-box"
        textAlign="center"
      >
        <Box fontSize="lg" color="gray.600">
          No property data available. Please complete step 3 first.
        </Box>
      </Box>
    );
  }

  return (
    <>
      {/* Print-specific CSS */}
      <style>
        {`
          @media print {
            [data-print-hide] {
              display: none !important;
            }
            body { 
              background: white !important; 
              margin: 0 !important;
              padding: 0 !important;
            }
            @page {
              margin: 0.3in;
              size: A4;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .chakra-button {
              display: none !important;
            }
            /* Compact header for print - further reduced */
            .report-header { padding-bottom: 4px !important; margin-bottom: 6px !important; border-bottom-width: 1px !important; }
            .report-logo { height: 25px !important; }
            .report-title { font-size: 18px !important; line-height: 1.05 !important; }
            .header-address { font-size: 10px !important; white-space: nowrap !important; }
            .external-link-icon { width: 10px !important; height: 10px !important; }
            /* Ensure report container prints cleanly */
            .report-container {
              box-shadow: none !important;
              margin: 0 !important;
              padding: 12px !important;
              max-width: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              height: auto !important;
              min-height: auto !important;
              page-break-before: auto !important;
              page-break-after: auto !important;
              page-break-inside: auto !important;
            }
            /* Hide any other UI elements that might appear */
            .chakra-modal__overlay,
            .chakra-modal__content {
              position: static !important;
              transform: none !important;
              box-shadow: none !important;
            }
            /* Preserve original card layout during printing */
            [data-columns="2"] {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
              align-items: start !important;
            }
            /* Ensure cards maintain their structure */
            .chakra-box {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            /* Preserve card styling during printing */
            .chakra-box[border] {
              border: 1px solid #e2e8f0 !important;
              border-radius: 6px !important;
              padding: 12px !important;
              margin-bottom: 8px !important;
            }
            /* Ensure proper spacing within cards */
            .chakra-vstack {
              gap: 8px !important;
            }
            .chakra-hstack {
              gap: 8px !important;
            }
            /* Preserve text alignment and styling */
            .chakra-heading,
            .chakra-text {
              color: inherit !important;
              font-weight: inherit !important;
              text-align: inherit !important;
            }
            /* Ensure proper margins and padding */
            .chakra-simple-grid > * {
              margin: 0 !important;
              padding: 0 !important;
            }
            .chakra-simple-grid {
              gap: 8px !important;
            }
            /* Prevent content duplication */
            .report-container {
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            /* Ensure single page layout */
            .report-container > * {
              page-break-inside: avoid !important;
            }
            /* Prevent any hidden elements from printing */
            [style*="display: none"],
            [style*="display:none"] {
              display: none !important;
            }
            /* Force single page printing */
            @page {
              size: auto;
              margin: 0.5in;
            }
            /* Ensure no duplicate content */
            .report-container {
              position: relative !important;
              z-index: 1 !important;
            }
            /* Hide any potential duplicate containers */
            .report-container + .report-container,
            .report-container ~ .report-container {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            /* Ensure summary sections maintain full width during printing */
            .chakra-hstack[background*="green"] {
              margin: 0 -24px -24px -24px !important;
              padding: 16px 24px !important;
              width: calc(100% + 48px) !important;
              position: relative !important;
              left: -24px !important;
              border-bottom-left-radius: 8px !important;
              border-bottom-right-radius: 8px !important;
            }
            /* Ensure flexbox layout is preserved during printing */
            .chakra-box[display*="flex"] {
              display: flex !important;
              flex-direction: column !important;
              height: auto !important;
            }
            .chakra-box[flex*="1"] {
              flex: 1 !important;
            }
            /* Ensure absolute positioning of summary sections is preserved */
            .chakra-box[position*="absolute"] {
              position: absolute !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              min-height: 60px !important;
              display: flex !important;
              align-items: center !important;
              padding: 24px !important;
            }
            /* Ensure summary section text has proper padding during printing */
            .chakra-box[position*="absolute"] .chakra-hstack {
              padding-left: 24px !important;
              padding-right: 24px !important;
            }
          }
        `}
      </style>
      
      {/* Action Buttons - Hidden in shared view */}
      {!isSharedView && (
        <Box
          maxWidth="850px"
          margin="0 auto 20px auto"
          textAlign="right"
          data-print-hide
        >
          <HStack spacing={3} justify="flex-end">
            <ShareReportButton
              reportStrategy={reportStrategy || 'flip'}
              presetValues={presetValues}
              selectedComps={selectedNeighborhoodComps}
              propertyAddress={(addressData as any)?.formattedAddress || `${addressData?.address || ''}, ${addressData?.city || ''}, ${addressData?.state_abbreviation || ''} ${addressData?.zip_code || ''}`.trim() || 'Property Report'}
              estimateData={{
                selectedAddress: addressState,
                addressState,
                property: propertyState?.properties?.[0],
                rentUnderwriteValues: underwriteState?.rent,
                flipUnderwriteValues: underwriteState?.flip,
                buyers: buyerState?.buyers || [],
                offerRangeLow: 0,
                offerRangeHigh: 0,
              }}
              size="md"
              colorScheme="green"
            />
            <Button
              leftIcon={<Icon as={FaDownload as React.ElementType} />}
              colorScheme="brand"
              onClick={handleDownloadPDF}
              marginTop={4}
            >
              Download PDF
            </Button>
          </HStack>
        </Box>
      )}
      
      {/* Report Container */}
      <Box
        maxWidth="850px"
        margin="0 auto"
        background="white"
        boxShadow="0 6px 20px rgba(0,0,0,0.08)"
        borderRadius="12px"
        padding="12px 28px 24px 28px"
        boxSizing="border-box"
        className="report-container"
        ref={reportRef}
        sx={{
          '@media print': {
            maxWidth: '100%',
            margin: '0',
            padding: '0.15in 0.25in 0.25in 0.25in',
            boxShadow: 'none',
            borderRadius: '0',
            pageBreakBefore: 'auto',
            pageBreakAfter: 'avoid',
            pageBreakInside: 'auto',
            height: 'auto',
            minHeight: 'auto',
            '& *': {
              pageBreakInside: 'auto',
              pageBreakBefore: 'auto',
              pageBreakAfter: 'auto'
            }
          }
        }}
      >
        {/* Report Content */}
        <VStack spacing={0.5} align="stretch">
          {/* Header */}
          <ReportHeader
            reportTitle={reportData.reportTitle}
            propertyAddress={reportData.propertyAddress}
          />
          
          {/* Top Section Grid */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={2} data-columns="2">
            <PropertyDetailsCard
              propertyType={reportData.propertyDetails.type}
              bedBath={reportData.propertyDetails.bedBath}
              squareFootage={reportData.propertyDetails.squareFootage}
              yearBuilt={reportData.propertyDetails.yearBuilt}
              condition={reportData.propertyDetails.condition}
              investmentType={reportData.propertyDetails.investmentType}
            />
            <MarketSnapshotCard
              zipCode={reportData.marketSnapshot.zipCode}
              chartData={reportData.marketSnapshot.chartData}
              loading={marketLoading}
              error={marketError}
              marketStats={marketStats}
            />
          </SimpleGrid>
          
          {/* Investment Scenarios Section */}
          <Box textAlign="center" marginBottom={0.5}>
            <Heading
              size="lg"
              fontSize="2xl"
              fontFamily="Poppins"
              color="brand.500"
              marginBottom={1}
            >
              Investment Scenarios
            </Heading>
            <Text
              fontSize="md"
              color="gray.600"
              fontFamily="Poppins"
            >
              Two potential strategies for this property are outlined below.
            </Text>
          </Box>
          
          {/* Analysis Grid */}          
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={2} data-columns="2">
            <FlipAnalysisCard
              purchasePrice={reportData.financialSummary.purchasePrice}
              estimatedRehab={reportData.financialSummary.estimatedRehab}
              afterRepairValue={reportData.financialSummary.afterRepairValue}
              closingHoldingCosts={reportData.flipAnalysis.closingHoldingCosts}
              closingHoldingPercentage={reportData.flipAnalysis.closingHoldingPercentage}
              estimatedNetProfit={reportData.financialSummary.estimatedNetProfit}
            />
            <RentalAnalysisCard
              purchasePrice={reportData.rentalAnalysis.purchasePrice}
              estimatedRehab={reportData.rentalAnalysis.estimatedRehab}
              monthlyRent={reportData.rentalAnalysis.monthlyRent}
              monthlyExpenses={reportData.rentalAnalysis.monthlyExpenses}
              monthlyNetIncome={reportData.rentalAnalysis.monthlyNetIncome}
              capRate={reportData.rentalAnalysis.capRate}
              expensePercentage={reportData.rentalAnalysis.expensePercentage}
            />
          </SimpleGrid>
          
          {/* Proof Section */}
          <Box marginTop={2}>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={2} data-columns="2">
            <ComparablesSection
              arvComps={reportData.comparables.arvComps}
              rentalComps={reportData.comparables.rentalComps}
            />
            <RehabScopeSection
              items={reportData.rehabScope.items}
              total={reportData.rehabScope.total}
            />
          </SimpleGrid>
          </Box>

          {/* Footer */}
          <Box className="page-break-avoid">
            <ReportFooter
              contactTitle={reportData.footer.contactTitle}
              companyName={reportData.footer.companyName}
              phone={reportData.footer.phone}
              email={reportData.footer.email}
              contactInfo={reportData.footer.contactInfo}
            />
          </Box>
        </VStack>
      </Box>
    </>
  );
};

export default InvestorReport;
