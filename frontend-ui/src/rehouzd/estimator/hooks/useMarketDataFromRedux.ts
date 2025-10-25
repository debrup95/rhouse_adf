import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index';
import { extractZipCode } from '../utils/buyerAnalytics';

export interface MarketChartData {
  month: string;
  height: string;
  count: number;
}

export interface MarketStats {
  totalInvestorPurchases: number;
  averagePrice: number;
  medianPrice: number;
  activeInvestors: number;
}

export const useMarketDataFromRedux = (zipCode: string) => {
  // Get buyer data from Redux store
  const buyers = useSelector((state: RootState) => state.buyers.buyers);

  const { chartData, marketStats } = useMemo(() => {
    if (!zipCode || !buyers || buyers.length === 0) {
      return {
        chartData: [
          { month: 'May', height: '20%', count: 0 },
          { month: 'June', height: '20%', count: 0 },
          { month: 'July', height: '20%', count: 0 }
        ],
        marketStats: {
          totalInvestorPurchases: 0,
          averagePrice: 0,
          medianPrice: 0,
          activeInvestors: 0
        }
      };
    }

    // Collect all purchases for the specified zip code
    const allPurchases: Array<{
      date: string;
      price: number;
      investor: string;
    }> = [];

    buyers.forEach(buyer => {
      if (buyer.purchase_history && buyer.purchase_history.length > 0) {
        buyer.purchase_history.forEach(purchase => {
          const purchaseZip = extractZipCode(purchase);
          
          if (purchaseZip === zipCode) {
            // Get sale date
            const saleDate = purchase.date;
            
            // Get sale price
            let salePrice = 0;
            if (typeof purchase.price === 'number') {
              salePrice = purchase.price;
            } else if (typeof purchase.price === 'string') {
              salePrice = parseFloat(purchase.price.replace(/[^0-9.-]+/g, '') || '0');
            }

            if (saleDate && salePrice > 0) {
              allPurchases.push({
                date: saleDate,
                price: salePrice,
                investor: buyer.name
              });
            }
          }
        });
      }
    });

    // Calculate date ranges for the last 3 months
    // Current date: Sept 3rd
    // May: May 4th to June 3rd
    // June: June 4th to July 3rd  
    // July: July 4th to Aug 3rd
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Define the 3 month periods
    const mayStart = new Date(currentYear, 4, 4); // May 4th (month is 0-indexed)
    const mayEnd = new Date(currentYear, 5, 3);    // June 3rd
    
    const juneStart = new Date(currentYear, 5, 4); // June 4th
    const juneEnd = new Date(currentYear, 6, 3);   // July 3rd
    
    const julyStart = new Date(currentYear, 6, 4); // July 4th
    const julyEnd = new Date(currentYear, 7, 3);   // Aug 3rd

    // Count purchases for each month period
    let mayCount = 0;
    let juneCount = 0;
    let julyCount = 0;

    allPurchases.forEach(purchase => {
      const purchaseDate = new Date(purchase.date);
      
      if (purchaseDate >= mayStart && purchaseDate <= mayEnd) {
        mayCount++;
      } else if (purchaseDate >= juneStart && purchaseDate <= juneEnd) {
        juneCount++;
      } else if (purchaseDate >= julyStart && purchaseDate <= julyEnd) {
        julyCount++;
      }
    });

    // Find maximum count for percentage calculation
    const maxCount = Math.max(mayCount, juneCount, julyCount);

    // Generate chart data
    const chartData: MarketChartData[] = [
      {
        month: 'May',
        height: maxCount > 0 ? `${Math.max(20, (mayCount / maxCount) * 100)}%` : '20%',
        count: mayCount
      },
      {
        month: 'June', 
        height: maxCount > 0 ? `${Math.max(20, (juneCount / maxCount) * 100)}%` : '20%',
        count: juneCount
      },
      {
        month: 'July',
        height: maxCount > 0 ? `${Math.max(20, (julyCount / maxCount) * 100)}%` : '20%',
        count: julyCount
      }
    ];

    // Calculate market statistics for the 3-month period
    const threeMonthPurchases = allPurchases.filter(purchase => {
      const purchaseDate = new Date(purchase.date);
      return purchaseDate >= mayStart && purchaseDate <= julyEnd;
    });

    const prices = threeMonthPurchases.map(p => p.price).filter(p => p > 0);
    const uniqueInvestors = new Set(threeMonthPurchases.map(p => p.investor));
    
    const averagePrice = prices.length > 0 
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
      : 0;
    
    const medianPrice = prices.length > 0 
      ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
      : 0;

    const marketStats: MarketStats = {
      totalInvestorPurchases: threeMonthPurchases.length,
      averagePrice: Math.round(averagePrice),
      medianPrice: Math.round(medianPrice),
      activeInvestors: uniqueInvestors.size
    };

    return { chartData, marketStats };

  }, [zipCode, buyers]);

  return {
    chartData,
    marketStats,
    loading: false, // No loading since data is already in Redux
    error: null     // No error since we're using cached data
  };
};
