import fs from 'fs/promises';
import path from 'path';

async function generateCleanZipCodeSummary() {
  try {
    const csvPath = path.resolve(process.cwd(), 'reports', 'buyer_caprate_resale_rental_202508261612.csv');
    console.log(`Reading CSV from: ${csvPath}`);
    
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').slice(1); // Skip header
    
    console.log(`Processing ${lines.length} data rows...`);
    
    const zipCodeData = new Map<string, { capRates: number[], state: string }>();
    let totalRows = 0;
    let excludedOutliers = 0;
    let cappedRows = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      totalRows++;
      
      // Parse CSV line (handle quoted values properly)
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim()); // Add last column
      
      const zip = columns[4]; // Column E: Zip
      const state = columns[3]; // Column D: State
      const capRateStr = columns[14]; // Column O: Cap Rate
      
      if (zip && capRateStr && capRateStr !== '""') {
        // Remove quotes and % symbol
        const cleanCapRate = capRateStr.replace(/"/g, '').replace('%', '');
        const capRate = parseFloat(cleanCapRate);
        
        if (!isNaN(capRate)) {
          let processedCapRate: number | null = null;
          
          if (capRate > 10) {
            excludedOutliers++;
          } else {
            if (capRate < 5) {
              processedCapRate = 5;
              cappedRows++;
            } else if (capRate > 8) {
              processedCapRate = 8;
              cappedRows++;
            } else {
              processedCapRate = capRate;
            }
            
            if (processedCapRate !== null) {
              if (!zipCodeData.has(zip)) {
                zipCodeData.set(zip, { capRates: [], state });
              }
              zipCodeData.get(zip)!.capRates.push(processedCapRate);
            }
          }
        }
      }
    }
    
    console.log(`\nProcessing Summary:`);
    console.log(`Total rows processed: ${totalRows}`);
    console.log(`Outliers excluded (>10%): ${excludedOutliers}`);
    console.log(`Values capped (5-8% range): ${cappedRows}`);
    console.log(`Valid cap rates processed: ${totalRows - excludedOutliers}`);
    
    // Calculate summary statistics for each zip code
    const summary = Array.from(zipCodeData.entries()).map(([zip, data]) => {
      const { capRates, state } = data;
      const sortedRates = [...capRates].sort((a, b) => a - b);
      
      return {
        zip_code: zip,
        state: state,
        average_cap_rate: Number((capRates.reduce((sum, rate) => sum + rate, 0) / capRates.length).toFixed(2)),
        median_cap_rate: Number(calculateMedian(capRates).toFixed(2)),
        min_cap_rate: Number(sortedRates[0].toFixed(2)),
        max_cap_rate: Number(sortedRates[sortedRates.length - 1].toFixed(2)),
        property_count: capRates.length
      };
    });
    
    // Sort by average cap rate (descending)
    summary.sort((a, b) => b.average_cap_rate - a.average_cap_rate);
    
    console.log(`\nZip codes processed: ${summary.length}`);
    
    // Calculate detailed statistics
    const totalProperties = summary.reduce((sum, item) => sum + item.property_count, 0);
    const avgPropertiesPerZip = (totalProperties / summary.length).toFixed(1);
    
    // Count outliers and capped values by zip code
    let totalOutliersByZip = 0;
    let totalMinCapped = 0;
    let totalMaxCapped = 0;
    let totalUncapped = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim());
      
      const capRateStr = columns[14];
      
      if (capRateStr && capRateStr !== '""') {
        const cleanCapRate = capRateStr.replace(/"/g, '').replace('%', '');
        const capRate = parseFloat(cleanCapRate);
        
        if (!isNaN(capRate)) {
          if (capRate > 10) {
            totalOutliersByZip++;
          } else if (capRate < 5) {
            totalMinCapped++;
          } else if (capRate > 8) {
            totalMaxCapped++;
          } else {
            totalUncapped++;
          }
        }
      }
    }
    
    console.log(`\nDetailed Statistics:`);
    console.log(`===================`);
    console.log(`Total properties across all zip codes: ${totalProperties}`);
    console.log(`Average properties per zip code: ${avgPropertiesPerZip}`);
    console.log(`Zip codes with 1 property: ${summary.filter(item => item.property_count === 1).length}`);
    console.log(`Zip codes with 2-5 properties: ${summary.filter(item => item.property_count >= 2 && item.property_count <= 5).length}`);
    console.log(`Zip codes with 6-10 properties: ${summary.filter(item => item.property_count >= 6 && item.property_count <= 10).length}`);
    console.log(`Zip codes with 11+ properties: ${summary.filter(item => item.property_count >= 11).length}`);
    
    console.log(`\nCap Rate Processing Details:`);
    console.log(`============================`);
    console.log(`Total outliers (>10%): ${totalOutliersByZip}`);
    console.log(`Total min-capped (<5%): ${totalMinCapped}`);
    console.log(`Total max-capped (>8%): ${totalMaxCapped}`);
    console.log(`Total uncapped (5-8%): ${totalUncapped}`);
    console.log(`Total processed: ${totalOutliersByZip + totalMinCapped + totalMaxCapped + totalUncapped}`);
    
    // Cap rate distribution analysis
    const capRateRanges = {
      '5.0%': 0,
      '5.1-6.0%': 0,
      '6.1-7.0%': 0,
      '7.1-8.0%': 0
    };
    
    summary.forEach(item => {
      const rate = item.average_cap_rate;
      if (rate === 5.0) capRateRanges['5.0%']++;
      else if (rate >= 5.1 && rate <= 6.0) capRateRanges['5.1-6.0%']++;
      else if (rate >= 6.1 && rate <= 7.0) capRateRanges['6.1-7.0%']++;
      else if (rate >= 7.1 && rate <= 8.0) capRateRanges['7.1-8.0%']++;
    });
    
    console.log(`\nCap Rate Distribution by Zip Code:`);
    console.log(`===================================`);
    Object.entries(capRateRanges).forEach(([range, count]) => {
      const percentage = ((count / summary.length) * 100).toFixed(1);
      console.log(`${range.padEnd(10)}: ${count.toString().padStart(3)} zip codes (${percentage}%)`);
    });
    
    // Top and bottom performers
    const topPerformers = summary.slice(0, 10);
    const bottomPerformers = summary.slice(-10).reverse();
    
    console.log(`\nTop 10 Zip Codes by Average Cap Rate:`);
    console.log(`=======================================`);
    console.log(`Zip Code\tState\tAvg Cap Rate\tMedian\tMin\tMax\tProperties`);
    console.log(`--------\t-----\t------------\t------\t---\t---\t----------`);
    
    topPerformers.forEach(item => {
      console.log(`${item.zip_code.padEnd(10)}\t${item.state.padEnd(5)}\t${item.average_cap_rate.toString().padStart(12)}%\t${item.median_cap_rate.toString().padStart(6)}%\t${item.min_cap_rate.toString().padStart(3)}%\t${item.max_cap_rate.toString().padStart(3)}%\t${item.property_count.toString().padStart(10)}`);
    });
    
    console.log(`\nBottom 10 Zip Codes by Average Cap Rate:`);
    console.log(`==========================================`);
    console.log(`Zip Code\tState\tAvg Cap Rate\tMedian\tMin\tMax\tProperties`);
    console.log(`--------\t-----\t------------\t------\t---\t---\t----------`);
    
    bottomPerformers.forEach(item => {
      console.log(`${item.zip_code.padEnd(10)}\t${item.state.padEnd(5)}\t${item.average_cap_rate.toString().padStart(12)}%\t${item.median_cap_rate.toString().padStart(6)}%\t${item.min_cap_rate.toString().padStart(3)}%\t${item.max_cap_rate.toString().padStart(3)}%\t${item.property_count.toString().padStart(10)}`);
    });
    
    // Property count distribution
    const propertyCountDistribution = summary.reduce((acc, item) => {
      const count = item.property_count;
      if (count === 1) acc['1']++;
      else if (count <= 5) acc['2-5']++;
      else if (count <= 10) acc['6-10']++;
      else if (count <= 20) acc['11-20']++;
      else acc['21+']++;
      return acc;
    }, { '1': 0, '2-5': 0, '6-10': 0, '11-20': 0, '21+': 0 });
    
    console.log(`\nProperty Count Distribution:`);
    console.log(`============================`);
    Object.entries(propertyCountDistribution).forEach(([range, count]) => {
      const percentage = ((count / summary.length) * 100).toFixed(1);
      console.log(`${range.padEnd(6)} properties: ${count.toString().padStart(3)} zip codes (${percentage}%)`);
    });
    
    // State summary
    const stateSummary = summary.reduce((acc, item) => {
      if (!acc[item.state]) {
        acc[item.state] = { zipCount: 0, totalProperties: 0, avgCapRate: 0 };
      }
      acc[item.state].zipCount++;
      acc[item.state].totalProperties += item.property_count;
      acc[item.state].avgCapRate += item.average_cap_rate;
      return acc;
    }, {} as Record<string, { zipCount: number, totalProperties: number, avgCapRate: number }>);
    
    console.log(`\nState Summary:`);
    console.log(`==============`);
    console.log(`State\tZip Codes\tProperties\tAvg Cap Rate`);
    console.log(`-----\t---------\t----------\t------------`);
    
    Object.entries(stateSummary).forEach(([state, data]) => {
      const avgCapRate = (data.avgCapRate / data.zipCount).toFixed(2);
      console.log(`${state.padEnd(5)}\t${data.zipCount.toString().padStart(9)}\t${data.totalProperties.toString().padStart(10)}\t${avgCapRate.toString().padStart(12)}%`);
    });
    
    // Generate clean CSV output with database-friendly column names
    const outputPath = path.resolve(process.cwd(), 'reports', 'zip_code_cap_rate_clean.csv');
    const csvOutput = ['zip_code,state,average_cap_rate,median_cap_rate,min_cap_rate,max_cap_rate,property_count\n'];
    
    for (const item of summary) {
      csvOutput.push(`${item.zip_code},${item.state},${item.average_cap_rate},${item.median_cap_rate},${item.min_cap_rate},${item.max_cap_rate},${item.property_count}\n`);
    }
    
    await fs.writeFile(outputPath, csvOutput.join(''));
    console.log(`\nClean CSV written to: ${outputPath}`);
    
    console.log(`\nSummary: Processed ${summary.length} zip codes with ${totalProperties} total properties.`);
    console.log(`Cap rates range from ${summary[summary.length - 1]?.average_cap_rate || 0}% to ${summary[0]?.average_cap_rate || 0}% after outlier processing.`);
    
  } catch (error) {
    console.error('Error processing CSV:', error);
    process.exit(1);
  }
}

function calculateMedian(numbers: number[]): number {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

// Execute the script
generateCleanZipCodeSummary().catch(console.error);
