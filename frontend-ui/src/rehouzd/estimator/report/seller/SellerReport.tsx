import React, { useMemo, useState, useEffect } from "react";
import { Box, SimpleGrid, VStack, Heading, Text } from "@chakra-ui/react";
import { calculateBuyerEstimatedPrice } from "../../utils/calculateBuyerEstimatedPrice";
import { getDisplayedInvestorComps } from "./utils/getDisplayedInvestorComps";
import { useAppSelector } from "../../store/hooks";
import rehabCalculatorService, {
  RehabCalculationRequest,
} from "../../services/rehabCalculatorService";
import type { Buyer } from "../../store/buyerSlice";
import { extractZipCode } from "../../utils/buyerAnalytics";

// Import seller report components
import SellerReportHeader from "./components/SellerReportHeader";
import CashOfferCard from "./components/CashOfferCard";
import SpeedComparisonCard from "./components/SpeedComparisonCard";
import PriceBreakdownCard from "./components/PriceBreakdownCard";
import InvestorCompsCard from "./components/InvestorCompsCard";
import RepairsEstimateCard from "./components/RepairsEstimateCard";
import TakeHomeCard from "./components/TakeHomeCard";
import FeaturesCard from "./components/FeaturesCard";
import SellerReportFooter from "./components/SellerReportFooter";
import ShareSellerReportButton from "./components/ShareSellerReportButton";

interface SellerReportProps {
  reportStrategy?: "rent" | "flip";
  presetValues?: Record<string, number>;
  selectedComps?: string[];
  estimateData?: any;
  isSharedView?: boolean;
}

const SellerReport: React.FC<SellerReportProps> = ({
  reportStrategy,
  presetValues = {},
  selectedComps,
  estimateData,
  isSharedView = false,
}) => {
  // State for computed rehab costs (similar to Investor Report)
  const [computedRehab, setComputedRehab] = useState<{
    perCategoryCosts: Record<string, number>;
    subtotal: number;
    contingencyAmount: number;
    total: number;
  } | null>(null);

  // Get data from Redux store (step 3 data) or from shared estimate data - matching Investor Report
  const propertyState = useAppSelector((state) => state.property);
  const underwriteState = useAppSelector((state) => state.underwrite);
  const userState = useAppSelector((state) => state.user);
  const addressState = useAppSelector((state) => state.address);
  const buyerState = useAppSelector((state) => state.buyers);



  // Get buyers data from Redux or shared estimate data
  const buyers = React.useMemo(() => {
    if (isSharedView && estimateData?.buyers) {
      return estimateData.buyers;
    }
    
    return (buyerState && buyerState.buyers) ? buyerState.buyers : [];
  }, [isSharedView, estimateData, buyerState]);

  // Get targetProfit from Redux store
  const reduxTargetProfit = useAppSelector((state) => state.underwrite?.buyerEstimatedPrice?.targetProfit) || 0;
  
  // Get targetProfit from Redux store or shared estimate data
  const targetProfit = React.useMemo(() => {
    if (isSharedView && estimateData?.targetProfit !== undefined) {
      return estimateData.targetProfit;
    }
    return reduxTargetProfit;
  }, [isSharedView, estimateData, reduxTargetProfit]);

  // Get displayed comps from shared estimate data (optimized storage)
  const displayedComps = React.useMemo(() => {
    if (isSharedView && estimateData?.displayedInvestorComps) {
      return estimateData.displayedInvestorComps;
    }
    return null;
  }, [isSharedView, estimateData]);

  // Construct estimateData for sharing when not in shared view
  const sharingEstimateData = React.useMemo(() => {
    if (isSharedView) {
      return estimateData;
    }
    
    // For normal view, construct estimateData from Redux state
    return {
      selectedAddress: addressState,
      addressState,
      property: propertyState?.properties?.[0],
      rentUnderwriteValues: underwriteState?.rent,
      flipUnderwriteValues: underwriteState?.flip,
      buyers: buyerState?.buyers || [],
      offerRangeLow: 0,
      offerRangeHigh: 0,
      targetProfit: targetProfit, // Include targetProfit for consistent calculations
    };
  }, [isSharedView, estimateData, addressState, propertyState, underwriteState, buyerState, targetProfit]);

  // Use shared estimate data when in shared view, otherwise use Redux state
  const property =
    isSharedView && estimateData
      ? estimateData.property
      : propertyState.properties[0];
  const addressData =
    isSharedView && estimateData
      ? estimateData.property?.addressData?.items?.[0]
      : property?.addressData?.items?.[0];
  const sharedUnderwriteState =
    isSharedView && estimateData
      ? {
          rent: estimateData.rent_underwrite_values,
          flip: estimateData.flip_underwrite_values,
          activeStrategy:
            reportStrategy || estimateData.active_investment_strategy || "flip",
        }
      : underwriteState;
  const sharedAddressState =
    isSharedView && estimateData ? estimateData.addressState : addressState;

  // Calculate buyer estimated price and maxAllowableOffer once for the entire component
  const buyerEstimatedPrice = React.useMemo(() => {
    const selectedStrategy = reportStrategy || "flip";
    const propertyCondition = sharedAddressState?.condition;
    const isFixerProperty =
      propertyCondition === "Fixer" || propertyCondition === "Outdated";
    const isStandardProperty = propertyCondition === "Standard";

    if (selectedStrategy === "flip") {
      const flipData = sharedUnderwriteState?.flip || {};
      const result = calculateBuyerEstimatedPrice(
        "flip",
        false,
        false,
        {
          afterRepairValue: 0,
          highRehab: 0,
        },
        {
          estimatedOffer: flipData?.estimatedOffer || 0,
          highRehab: flipData?.highRehab || 0,
          holdingCosts: flipData?.holdingCosts || 0,
        }
      );
      return result.buyerEstimatedOffer || 0;
    } else {
      const rentalData = sharedUnderwriteState?.rent || {};
      const rentalARV = rentalData?.afterRepairValue || 0;
      const rentalRehabCosts = rentalData?.highRehab || 0;

      const result = calculateBuyerEstimatedPrice(
        "rent",
        isFixerProperty,
        isStandardProperty,
        {
          afterRepairValue: rentalARV,
          highRehab: rentalRehabCosts,
        },
        {
          estimatedOffer: 0,
          highRehab: 0,
          holdingCosts: sharedUnderwriteState?.flip?.holdingCosts || 0,
        }
      );
      return result.buyerEstimatedOffer || 0;
    }
  }, [reportStrategy, sharedUnderwriteState, sharedAddressState]);

  const maxAllowableOffer = Math.max(0, buyerEstimatedPrice - targetProfit);

  // Generate dynamic data for TakeHomeCard
  const takeHomeData = useMemo(() => {
    const strategyData =
      (reportStrategy === "rent"
        ? sharedUnderwriteState?.rent
        : sharedUnderwriteState?.flip) || {};

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value || 0);
    };

    const cashPath = {
      offer: Math.round(maxAllowableOffer), // Use global maxAllowableOffer, rounded
    };

    // Calculate retail values using same logic as PriceBreakdownCard
    const selectedStrategy = reportStrategy || "flip";
    let arv, repairs, holding, saleCosts, net;
    
    if (selectedStrategy === "rent") {
      // Rent strategy calculations
      const rentData = sharedUnderwriteState?.rent || {};
      arv = rentData?.afterRepairValue || 0;
      repairs = rentData?.highRehab || 0;
      holding = Math.round(arv * 0.04); // 4% of ARV
      saleCosts = Math.round(arv * 0.07); // 7% of ARV
      net = arv - repairs - holding - saleCosts;
    } else {
      // Flip strategy calculations
      const flipData = sharedUnderwriteState?.flip || {};
      arv = flipData?.afterRepairValue || 0;
      repairs = flipData?.highRehab || 0;
      const sellingCosts = flipData?.sellingCosts || 0;
      const holdingCosts = flipData?.holdingCosts || 0;
      holding = Math.round(arv * (holdingCosts / 100));
      saleCosts = Math.round(arv * (sellingCosts / 100));
      net = arv - repairs - holding - saleCosts;
    }

    const retail = {
      net: Math.round(net),
      sale: Math.round(arv),
      rehab: Math.round(repairs),
      holding: Math.round(holding),
      commission: Math.round(saleCosts),
      close: 0, // Not used in new calculation
    };

    return { cashPath, retail };
  }, [reportStrategy, sharedUnderwriteState, maxAllowableOffer]);

  // Compute rehab costs using rehabCalculatorService (similar to Investor Report)
  useEffect(() => {
    const run = async () => {
      const selectedStrategy: "rent" | "flip" =
        (reportStrategy as any) ||
        (sharedUnderwriteState?.activeStrategy as "rent" | "flip") ||
        "flip";

      // Get detailed categories with fallback logic
      const rentDC: Record<string, number> = ((sharedUnderwriteState as any)
        ?.rent?.detailedCategories || {}) as Record<string, number>;
      const flipDC: Record<string, number> = ((sharedUnderwriteState as any)
        ?.flip?.detailedCategories || {}) as Record<string, number>;
      const strategyData: any =
        selectedStrategy === "rent"
          ? (sharedUnderwriteState as any)?.rent
          : (sharedUnderwriteState as any)?.flip;
      const selectedDC = selectedStrategy === "rent" ? rentDC : flipDC;
      
      // Step 1: Get slider values (priority: Redux -> presetValues -> defaults)
      const hasReduxStrategyData = Object.keys(selectedDC || {}).length > 0;
      const hasPresetValues = Object.keys(presetValues || {}).length > 0;
      
      let sliderValues: Record<string, number>;
      if (hasReduxStrategyData) {
        sliderValues = selectedDC;
      } else if (hasPresetValues) {
        sliderValues = presetValues;
      } else {
        sliderValues = {};
      }

      const squareFootage = Number((addressData as any)?.square_footage) || 0;
      const afterRepairValue =
        Number(
          selectedStrategy === "rent"
            ? (sharedUnderwriteState as any)?.rent?.afterRepairValue
            : (sharedUnderwriteState as any)?.flip?.afterRepairValue
        ) || 0;
      // Determine source for contingency calculation
      const source = hasReduxStrategyData
        ? "redux"
        : hasPresetValues
        ? "presetValues"
        : "defaults";
      const contingency =
        source === "redux" ? Number(strategyData?.detailedContingency ?? 5) : 5;
      const bathroomCount = Number((addressData as any)?.bathrooms ?? 1);
      const stateAbbr = (addressData as any)?.state_abbreviation || null;
      const county = (addressData as any)?.county || null;

      // Step 2: Use slider values to calculate actual prices
      const request: RehabCalculationRequest = {
        afterRepairValue,
        squareFootage,
        bathrooms: sliderValues.bathrooms || 0,
        windows: sliderValues.windows || 0,
        electrical: sliderValues.electrical || 0,
        plumbing: sliderValues.plumbing || 0,
        interiorPaint: sliderValues.interiorPaint || 0,
        exteriorPaint: sliderValues.exteriorPaint || 0,
        exteriorSiding: sliderValues.exteriorSiding || 0,
        kitchen: sliderValues.kitchen || 0,
        roof: sliderValues.roof || 0,
        hvac: sliderValues.hvac || 0,
        flooring: sliderValues.flooring || 0,
        waterHeater: sliderValues.waterHeater || 0,
        contingency,
      };

      // Fetch calculator data and compute costs
      if (stateAbbr && county) {
        try {
          const calculatorData =
            await rehabCalculatorService.getRehabCalculatorData(
              stateAbbr,
              county,
              squareFootage
            );
          if (calculatorData) {
            const result = rehabCalculatorService.calculateRehabCosts(
              request,
              calculatorData,
              bathroomCount
            );
            const backendToUi: Record<string, string> = {
              bathroom: "bathrooms",
              windows: "windows",
              electrical: "electrical",
              plumbing: "plumbing",
              interior_paint: "interiorPaint",
              exterior_paint: "exteriorPaint",
              exterior_siding: "exteriorSiding",
              kitchen: "kitchen",
              roof: "roof",
              hvac: "hvac",
              flooring: "flooring",
              water_heater: "waterHeater",
            };
            const perCategoryCosts: Record<string, number> = {};
            Object.keys(result.categoryBreakdown || {}).forEach((k) => {
              const uiKey = backendToUi[k] || k;
              perCategoryCosts[uiKey] = result.categoryBreakdown[k]?.cost || 0;
            });
            setComputedRehab({
              perCategoryCosts,
              subtotal: result.subtotal,
              contingencyAmount: result.contingencyAmount,
              total: result.total,
            });
          }
        } catch (e) {
          // Failed to compute rehab costs
        }
      }
    };
    run();
  }, [sharedUnderwriteState, addressData, reportStrategy, presetValues]);


  // Generate PDF filename with property address
  const generatePDFFilename = (): string => {
    const baseName = "Rehouzd-Seller-Report";

    // Get property address from estimateData
    let propertyAddress = "";

    if (estimateData?.property?.addressData?.items?.[0]) {
      const propertyData = estimateData.property.addressData.items[0];
      // Try formattedAddress first, then construct from individual fields
      propertyAddress =
        propertyData?.formattedAddress ||
        `${propertyData?.address || ""}, ${propertyData?.city || ""}`.trim();

      if (propertyAddress) {
        // Sanitize the address for filename use
        propertyAddress = propertyAddress
          .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
          .replace(/\s+/g, "-") // Replace spaces with hyphens
          .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
          .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
          .toLowerCase()
          .substring(0, 50); // Limit length to prevent overly long filenames

        return `${baseName}-${propertyAddress}.pdf`;
      }
    }

    // Fallback to default name if no address available
    return `${baseName}.pdf`;
  };

  // Generate report data using strategy data when available
  const reportData = useMemo(() => {
    // Get strategy data based on selected strategy - using Redux state like Investor Report
    const selectedStrategy = reportStrategy || "flip";
    const strategyData =
      selectedStrategy === "rent"
        ? sharedUnderwriteState?.rent
        : sharedUnderwriteState?.flip;

    // Get property data from Redux state
    const propertyData = addressData;

    // Format currency helper
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value || 0);
    };

    // Use global buyerEstimatedPrice and maxAllowableOffer (calculated once at component level)

    return {
      reportTitle: "Your Cash Offer",
      propertyAddress:
        propertyData?.formattedAddress ||
        `${propertyData?.address || "6884 Ensign Rd"}, ${
          propertyData?.city || "Millington"
        }, ${propertyData?.state_abbreviation || "TN"} ${
          propertyData?.zip_code || "38053"
        }`,
      propertyDetails: {
        bedBath: `${propertyData?.bedrooms || 3}bd / ${
          propertyData?.bathrooms || 1
        }ba`,
        squareFootage: `${
          propertyData?.square_footage?.toLocaleString() || "1,515"
        } sqft`,
      },
      cashOffer: {
        price: formatCurrency(maxAllowableOffer),
        features: ["21 Days", "As-Is", "No Showings"],
      },
      speedComparison: {
        cashClose: "21d",
        listAndWait: "180d",
        holdingCostPerMonth: Math.round(maxAllowableOffer * 0.01),
      },
      priceBreakdown: (() => {
        // Use the single maxAllowableOffer calculation
        
        if (selectedStrategy === "rent") {
          // Rent strategy calculations
          const rentData = sharedUnderwriteState?.rent || {};
          const arv = rentData?.afterRepairValue || 0;
          const repairs = rentData?.highRehab || 0;
          const resale = Math.round(arv * 0.07); // 7%
          const holding = Math.round(arv * 0.04); // 4%
          const requiredReturn = Math.round(Math.max(0, arv - (maxAllowableOffer + repairs + resale + holding)));
          
          return {
            categories: [
              {
                key: "Purchase",
                value: Math.round(maxAllowableOffer),
                details: "",
                color: "#064e3b",
              },
              {
                key: "Repairs",
                value: Math.round(repairs),
                details: "",
                color: "#0f766e",
              },
              {
                key: "Resale",
                value: resale,
                details: "Agent commissions • Title • Taxes",
                color: "#10b981",
              },
              {
                key: "Holding",
                value: holding,
                details: "Purchase title work • Taxes, Insurance, Utilities • Loan costs",
                color: "#34d399",
              },
              {
                key: "Risk and Return",
                value: requiredReturn,
                details: "Covers risk, vacancy, profit target",
                color: "#6ee7b7",
              },
            ],
            total: Math.round(arv),
          };
        } else {
          // Flip strategy calculations
          const flipData = sharedUnderwriteState?.flip || {};
          const arv = flipData?.afterRepairValue || 0;
          const repairs = flipData?.highRehab || 0;
          const sellingCosts = flipData?.sellingCosts || 0;
          const holdingCosts = flipData?.holdingCosts || 0;
          const resale = Math.round(arv * (sellingCosts / 100));
          const holding = Math.round(arv * (holdingCosts / 100));
          const requiredReturn = Math.round(Math.max(0, arv - (maxAllowableOffer + repairs + resale + holding)));
          
          return {
            categories: [
              {
                key: "Purchase",
                value: Math.round(maxAllowableOffer),
                details: "",
                color: "#064e3b",
              },
              {
                key: "Repairs",
                value: Math.round(repairs),
                details: "",
                color: "#0f766e",
              },
              {
                key: "Resale",
                value: resale,
                details: "Agent commissions • Title • Taxes",
                color: "#10b981",
              },
              {
                key: "Holding",
                value: holding,
                details: "Purchase title work • Taxes, Insurance, Utilities • Loan costs",
                color: "#34d399",
              },
              {
                key: "Risk and Return",
                value: requiredReturn,
                details: "Covers risk, vacancy, profit target",
                color: "#6ee7b7",
              },
            ],
            total: Math.round(arv),
          };
        }
      })(),
      investorComps: (() => {
        // If we have pre-calculated displayed comps (from shared view), use them
        if (displayedComps && Array.isArray(displayedComps) && displayedComps.length > 0) {
          return displayedComps.map((comp: any) => ({
            address: comp.address,
            price: formatCurrency(comp.price),
            date: comp.date,
            specs: comp.specs
          }));
        }

        // Otherwise, use the shared utility function to get investor comps
        const comps = getDisplayedInvestorComps(
          buyers,
          addressData,
          buyerEstimatedPrice,
          selectedComps
        );

        // Format the comps for display
        return comps.map((comp) => ({
          address: comp.address,
          price: formatCurrency(comp.price),
          date: comp.date,
          specs: comp.specs
        }));
      })(),
      repairsEstimate: (() => {
        // Generate rehab scope data using detailed categories - use dynamic strategy (rent/flip)
        // Priority: computedRehab -> Redux strategy data -> presetValues -> defaults

        // Get strategy data based on selected strategy
        const selectedStrategy = reportStrategy || "flip";
        const rentDC: Record<string, number> = ((sharedUnderwriteState as any)
          ?.rent?.detailedCategories || {}) as Record<string, number>;
        const flipDC: Record<string, number> = ((sharedUnderwriteState as any)
          ?.flip?.detailedCategories || {}) as Record<string, number>;
        const strategyDC = selectedStrategy === "rent" ? rentDC : flipDC;
        const strategyData: any = selectedStrategy === "rent" 
          ? (sharedUnderwriteState as any)?.rent 
          : (sharedUnderwriteState as any)?.flip;

        // Check if Redux has strategy data
        const hasReduxStrategyData = Object.keys(strategyDC || {}).length > 0;
        const hasPresetValues = Object.keys(presetValues || {}).length > 0;

        // Step 1: Get slider values (priority: Redux -> presetValues -> defaults)
        let sliderValues: Record<string, number>;
        let source: string;
        
        if (hasReduxStrategyData) {
          sliderValues = strategyDC;
          source = "redux";
        } else if (hasPresetValues) {
          sliderValues = presetValues;
          source = "presetValues";
        } else {
          sliderValues = {};
          source = "defaults";
        }
        
        // Step 2: Use calculated prices from rehabCalculatorService if available, otherwise use slider values
        let detailedCategories: Record<string, number>;
        if (computedRehab?.perCategoryCosts) {
          // Use calculated prices from rehabCalculatorService
          detailedCategories = computedRehab.perCategoryCosts;
        } else {
          // Use slider values (will be calculated by rehabCalculatorService in useEffect)
          detailedCategories = sliderValues;
        }

        // Get contingency and misc from the determined source (not computedRehab)
        const contingencyPercent: number = (() => {
          if (source === "redux") {
            return Number(strategyData?.detailedContingency ?? 5);
          } else if (source === "presetValues") {
            return 10; // Default for presetValues (from condition step)
          } else {
            return 10; // Default fallback
          }
        })();

        const miscAmount: number = (() => {
          // Get misc amount from the determined source
          if (source === "redux") {
            return Number(strategyData?.detailedMiscAmount ?? 0);
          } else if (source === "presetValues") {
            return Number(presetValues?.misc || 0);
          } else {
            return 0; // Default fallback
          }
        })();

        // Calculate base total from detailed categories (excluding contingency and misc)
        const baseTotal: number = Object.values(detailedCategories).reduce(
          (sum: number, cost: number) => sum + (Number(cost) || 0),
          0
        );

        // Calculate contingency amount using the determined percentage
        const contingencyAmount: number = (baseTotal * contingencyPercent) / 100;

        // Calculate final total as sum of all displayed categories
        const totalCost: number = baseTotal + contingencyAmount + miscAmount;

        // Map the 12 detailed categories to display format, filtering out zero values
        const categoryColors = [
          "#064E3B",
          "#065F46",
          "#047857",
          "#059669",
          "#10B981",
          "#34D399",
          "#6EE7B7",
          "#A7F3D0",
          "#D1FAE5",
          "#E6FFFA",
          "#CCFBF1",
          "#99F6E4",
        ];

        const allCategories = [
          {
            key: "kitchen",
            name: "Kitchen",
            cost: detailedCategories.kitchen || 0,
          },
          {
            key: "bathrooms",
            name: "Bathrooms",
            cost: detailedCategories.bathrooms || 0,
          },
          {
            key: "flooring",
            name: "Flooring",
            cost: detailedCategories.flooring || 0,
          },
          {
            key: "hvac",
            name: "HVAC System",
            cost: detailedCategories.hvac || 0,
          },
          { key: "roof", name: "Roof", cost: detailedCategories.roof || 0 },
          {
            key: "paint",
            name: "Paint",
            cost:
              (detailedCategories.interiorPaint || 0) +
              (detailedCategories.exteriorPaint || 0),
          },
          {
            key: "electrical",
            name: "Electrical",
            cost: detailedCategories.electrical || 0,
          },
          {
            key: "plumbing",
            name: "Plumbing",
            cost: detailedCategories.plumbing || 0,
          },
          {
            key: "windows",
            name: "Windows",
            cost: detailedCategories.windows || 0,
          },
          {
            key: "exteriorSiding",
            name: "Exterior Siding",
            cost: detailedCategories.exteriorSiding || 0,
          },
          {
            key: "waterHeater",
            name: "Water Heater",
            cost: detailedCategories.waterHeater || 0,
          },
          { key: "contingency", name: "Contingency", cost: contingencyAmount || 0 },
          { key: "misc", name: "Misc", cost: miscAmount || 0 },
        ];

        const categories = allCategories
          .filter((category) => category.cost > 0) // Filter out zero values
          .map((category, index) => ({
            name: category.name,
            amount: formatCurrency(category.cost),
            color: categoryColors[index % categoryColors.length],
          }));

        return {
          total: formatCurrency(totalCost),
          categories,
        };
      })(),
      takeHome: {
        cashNow: {
          amount: formatCurrency(
            (strategyData?.estimatedOffer || 97995) * 0.98
          ), // 2% closing costs
          offer: formatCurrency(strategyData?.estimatedOffer || 97995),
          closingCosts: formatCurrency(
            -(strategyData?.estimatedOffer || 97995) * 0.02
          ),
          note: "Close ~2%",
        },
        retailAfterRehab: {
          amount: formatCurrency(
            (strategyData?.afterRepairValue || 220000) -
              (strategyData?.highRehab || 73605) -
              17600 -
              2550
          ),
          sale: formatCurrency(strategyData?.afterRepairValue || 220000),
          fees: formatCurrency(-17600),
          repairs: formatCurrency(strategyData?.highRehab || 73605),
          timeAtRisk: "180 days",
          chanceToHitARV: "65%",
          holding: formatCurrency(-2550),
        },
      },
      footerFeatures: [
        "No Showings",
        "No Repairs",
        "Flexible Move",
        "Cash In Bank Account",
      ],
    };
  }, [
    reportStrategy,
    sharedUnderwriteState,
    sharedAddressState,
    addressData,
    computedRehab,
    buyers,
    buyerEstimatedPrice,
    maxAllowableOffer,
  ]);

  // Ref to the report container for printing
  const reportRef = React.useRef<HTMLDivElement | null>(null);

  // Handle download as PDF using html2pdf.js
  const handleDownloadPDF = async () => {
    const reportNode = reportRef.current;
    if (!reportNode) {
      alert("Report content not found. Please try again.");
      return;
    }

    try {
      // Dynamic import to avoid bundle size issues
      const { default: html2pdf } = await import('html2pdf.js');

      const filename = generatePDFFilename();

      // Create a clone of the report to avoid modifying the original
      const clonedNode = reportNode.cloneNode(true) as HTMLElement;

      // Remove download button section
      Array.from(clonedNode.querySelectorAll("[data-print-hide]")).forEach(
        (el) => {
          el.parentElement?.removeChild(el);
        }
      );

      // Configuration for html2pdf
      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: "jpeg", quality: 0.92 },
        html2canvas: {
          scale: 0.9,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 850,
          windowHeight: 1000,
          scrollX: 0,
          scrollY: 0,
          letterRendering: true,
          removeContainer: true,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
          precision: 2,
          hotfixes: ["px_scaling"],
        },
        pagebreak: {
          mode: "avoid-all",
          before: [],
          after: [],
          avoid: [".page-break-avoid", ".chakra-box", "tr", "img", "footer"],
        },
        enableLinks: true,
      };

      // Generate and download PDF
      await html2pdf().set(opt).from(clonedNode).save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      // Fallback to print dialog
      window.print();
    }
  };

  return (
    <>
      {/* Print-specific CSS */}
      <style>
        {`
          @media print {
            /* Force stable two-column layout for TakeHome and similar grids */
            [data-print-two-col="true"] {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
              align-items: start !important;
            }

            /* Keep repairs card layout side-by-side */
            [data-print-row="true"] {
              display: flex !important;
              flex-direction: row !important;
              align-items: flex-start !important;
              gap: 8px !important;
            }

            /* Avoid breaks in flex/grid stacks */
            .chakra-vstack, .chakra-hstack, .chakra-grid, .chakra-flex {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }

            /* Ensure SVG donuts render crisp and stay inline */
            svg { display: block; }

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
            .report-container {
              box-shadow: none !important;
              margin: 0 !important;
              padding: 12px !important;
              max-width: none !important;
              border-radius: 0 !important;
              overflow: visible !important;
              height: auto !important;
              min-height: auto !important;
            }
            [data-columns="2"] {
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              gap: 8px !important;
              align-items: start !important;
            }
            .chakra-box {
              break-inside: auto !important;
              page-break-inside: auto !important;
            }
            .chakra-box[border] {
              border: 1px solid #e2e8f0 !important;
              border-radius: 6px !important;
              padding: 12px !important;
              margin-bottom: 8px !important;
            }
            .chakra-vstack {
              gap: 8px !important;
            }
            .chakra-hstack {
              gap: 8px !important;
            }
            .chakra-simple-grid {
              gap: 8px !important;
            }
            .report-container {
              page-break-after: avoid !important;
              page-break-before: avoid !important;
            }
            .report-container > * {
              page-break-inside: avoid !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}
      </style>

      {/* Report Container */}
      <Box
        maxWidth="850px"
        margin="0 auto"
        marginTop={4}
        background="white"
        boxShadow="0 6px 20px rgba(0,0,0,0.08)"
        borderRadius="12px"
        padding="12px 28px 24px 28px"
        boxSizing="border-box"
        className="report-container"
        ref={reportRef}
        sx={{
          "@media print": {
            maxWidth: "100%",
            margin: "0",
            padding: "0.15in 0.25in 0.25in 0.25in",
            boxShadow: "none",
            borderRadius: "0",
            pageBreakBefore: "auto",
            pageBreakAfter: "avoid",
            pageBreakInside: "auto",
            height: "auto",
            minHeight: "auto",
            "& *": {
              pageBreakInside: "auto",
              pageBreakBefore: "auto",
              pageBreakAfter: "auto",
            },
          },
        }}
      >
        {/* Report Content */}
        <VStack spacing={1} align="stretch">
          {/* Header */}
          <SellerReportHeader
            reportTitle={reportData.reportTitle}
            propertyAddress={reportData.propertyAddress}
            propertyDetails={reportData.propertyDetails}
            onPrintPDF={handleDownloadPDF}
            isSharedView={isSharedView}
            reportStrategy={reportStrategy}
            presetValues={presetValues}
            selectedComps={selectedComps}
            estimateData={sharingEstimateData}
          />

          {/* Top Section Grid */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={1} data-columns="2">
            <CashOfferCard
              price={reportData.cashOffer.price}
              features={reportData.cashOffer.features}
            />
            <SpeedComparisonCard
              cashClose={reportData.speedComparison.cashClose}
              listAndWait={reportData.speedComparison.listAndWait}
              holdingCostPerMonth={reportData.speedComparison.holdingCostPerMonth}
            />
          </SimpleGrid>

          {/* Price Breakdown Section */}
          <Box marginTop={1}>
            <PriceBreakdownCard
              categories={reportData.priceBreakdown.categories}
              total={reportData.priceBreakdown.total}
            />
          </Box>

          {/* Bottom Section Grid */}
          <Box marginTop={1}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={1} data-columns="2">
              <InvestorCompsCard comps={reportData.investorComps} />
              <RepairsEstimateCard
                total={reportData.repairsEstimate.total}
                categories={reportData.repairsEstimate.categories}
              />
            </SimpleGrid>
          </Box>

          {/* Take Home Section */}
          <Box marginTop={1}>
            {/* <SimpleGrid columns={{ base: 1, md: 2 }} gap={1} data-columns="2"> */}
            <TakeHomeCard
              cashPath={takeHomeData.cashPath}
              retail={takeHomeData.retail}
            />
            {/* </SimpleGrid> */}
          </Box>

          {/* Features Section */}
          <Box marginTop={1}>
            <FeaturesCard features={reportData.footerFeatures} />
          </Box>

          {/* Footer */}
          <Box className="page-break-avoid" marginTop={4}>
            <SellerReportFooter 
              isSharedView={isSharedView}
              reportStrategy={reportStrategy}
              presetValues={presetValues}
              selectedComps={selectedComps}
              propertyAddress={reportData.propertyAddress}
              estimateData={sharingEstimateData}
              onPrintPDF={handleDownloadPDF}
            />
          </Box>
        </VStack>
      </Box>
    </>
  );
};

export default SellerReport;
