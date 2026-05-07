/**
 * StockPulse Seed Script
 * Run: npm run seed (from backend directory)
 *
 * This script:
 * 1. Inserts all 11 GICS sectors
 * 2. Fetches S&P 500 constituents and inserts stocks + basic profiles
 *
 * Note: Historical price ingestion is handled by ingest.js separately
 * to avoid overwhelming the API rate limit in one session.
 */

import pool from '../config/db.js';
import { getStockProfile, sleep } from '../services/twelveData.js';

// Full S&P 500 constituent list with sector mapping
// Source: Standard & Poor's GICS classification
const SP500_STOCKS = [
  // Information Technology
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Information Technology', exchange: 'NYSE' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Information Technology', exchange: 'NYSE' },
  { symbol: 'ACN', name: 'Accenture plc', sector: 'Information Technology', exchange: 'NYSE' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'QCOM', name: 'Qualcomm Incorporated', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'IBM', name: 'International Business Machines', sector: 'Information Technology', exchange: 'NYSE' },
  { symbol: 'TXN', name: 'Texas Instruments Incorporated', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'INTU', name: 'Intuit Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Information Technology', exchange: 'NYSE' },
  { symbol: 'AMAT', name: 'Applied Materials Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'MU', name: 'Micron Technology Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'LRCX', name: 'Lam Research Corporation', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'ADI', name: 'Analog Devices Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'KLAC', name: 'KLA Corporation', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'SNPS', name: 'Synopsys Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'CDNS', name: 'Cadence Design Systems Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'PANW', name: 'Palo Alto Networks Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'FTNT', name: 'Fortinet Inc.', sector: 'Information Technology', exchange: 'NASDAQ' },
  { symbol: 'DELL', name: 'Dell Technologies Inc.', sector: 'Information Technology', exchange: 'NYSE' },
  { symbol: 'HPQ', name: 'HP Inc.', sector: 'Information Technology', exchange: 'NYSE' },

  // Financials
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'MA', name: 'Mastercard Incorporated', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'BAC', name: 'Bank of America Corporation', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'GS', name: 'The Goldman Sachs Group Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'SPGI', name: 'S&P Global Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'BLK', name: 'BlackRock Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'C', name: 'Citigroup Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'AXP', name: 'American Express Company', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'CB', name: 'Chubb Limited', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'SCHW', name: 'The Charles Schwab Corporation', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'MMC', name: 'Marsh & McLennan Companies Inc.', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'PGR', name: 'The Progressive Corporation', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'USB', name: 'U.S. Bancorp', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'PNC', name: 'The PNC Financial Services Group', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'TFC', name: 'Truist Financial Corporation', sector: 'Financials', exchange: 'NYSE' },
  { symbol: 'COF', name: 'Capital One Financial Corporation', sector: 'Financials', exchange: 'NYSE' },

  // Health Care
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'ABT', name: 'Abbott Laboratories', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Health Care', exchange: 'NASDAQ' },
  { symbol: 'DHR', name: 'Danaher Corporation', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'SYK', name: 'Stryker Corporation', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'BSX', name: 'Boston Scientific Corporation', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'ISRG', name: 'Intuitive Surgical Inc.', sector: 'Health Care', exchange: 'NASDAQ' },
  { symbol: 'CVS', name: 'CVS Health Corporation', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'MDT', name: 'Medtronic plc', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'GILD', name: 'Gilead Sciences Inc.', sector: 'Health Care', exchange: 'NASDAQ' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb Company', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'ELV', name: 'Elevance Health Inc.', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'CI', name: 'The Cigna Group', sector: 'Health Care', exchange: 'NYSE' },
  { symbol: 'HUM', name: 'Humana Inc.', sector: 'Health Care', exchange: 'NYSE' },

  // Consumer Discretionary
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ' },
  { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'NKE', name: 'NIKE Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'SBUX', name: 'Starbucks Corporation', sector: 'Consumer Discretionary', exchange: 'NASDAQ' },
  { symbol: 'LOW', name: "Lowe's Companies Inc.", sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'TJX', name: 'The TJX Companies Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'BKNG', name: 'Booking Holdings Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ' },
  { symbol: 'CMG', name: 'Chipotle Mexican Grill Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'ORLY', name: "O'Reilly Automotive Inc.", sector: 'Consumer Discretionary', exchange: 'NASDAQ' },
  { symbol: 'GM', name: 'General Motors Company', sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'F', name: 'Ford Motor Company', sector: 'Consumer Discretionary', exchange: 'NYSE' },
  { symbol: 'ABNB', name: 'Airbnb Inc.', sector: 'Consumer Discretionary', exchange: 'NASDAQ' },
  { symbol: 'YUM', name: 'Yum! Brands Inc.', sector: 'Consumer Discretionary', exchange: 'NYSE' },

  // Communication Services
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'DIS', name: 'The Walt Disney Company', sector: 'Communication Services', exchange: 'NYSE' },
  { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'T', name: 'AT&T Inc.', sector: 'Communication Services', exchange: 'NYSE' },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', sector: 'Communication Services', exchange: 'NYSE' },
  { symbol: 'TMUS', name: 'T-Mobile US Inc.', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'EA', name: 'Electronic Arts Inc.', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'TTWO', name: 'Take-Two Interactive Software', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'WBD', name: 'Warner Bros. Discovery Inc.', sector: 'Communication Services', exchange: 'NASDAQ' },
  { symbol: 'OMC', name: 'Omnicom Group Inc.', sector: 'Communication Services', exchange: 'NYSE' },
  { symbol: 'IPG', name: 'The Interpublic Group of Companies', sector: 'Communication Services', exchange: 'NYSE' },

  // Consumer Staples
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'PG', name: 'The Procter & Gamble Company', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Consumer Staples', exchange: 'NASDAQ' },
  { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Staples', exchange: 'NASDAQ' },
  { symbol: 'PM', name: 'Philip Morris International Inc.', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'MDLZ', name: 'Mondelez International Inc.', sector: 'Consumer Staples', exchange: 'NASDAQ' },
  { symbol: 'CL', name: 'Colgate-Palmolive Company', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'MO', name: 'Altria Group Inc.', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'KHC', name: 'The Kraft Heinz Company', sector: 'Consumer Staples', exchange: 'NASDAQ' },
  { symbol: 'GIS', name: 'General Mills Inc.', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'KMB', name: 'Kimberly-Clark Corporation', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'SYY', name: 'Sysco Corporation', sector: 'Consumer Staples', exchange: 'NYSE' },
  { symbol: 'STZ', name: 'Constellation Brands Inc.', sector: 'Consumer Staples', exchange: 'NYSE' },

  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'EOG', name: 'EOG Resources Inc.', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'SLB', name: 'Schlumberger Limited', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'MPC', name: 'Marathon Petroleum Corporation', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'PSX', name: 'Phillips 66', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'VLO', name: 'Valero Energy Corporation', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'PXD', name: 'Pioneer Natural Resources Company', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'OXY', name: 'Occidental Petroleum Corporation', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'HAL', name: 'Halliburton Company', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'DVN', name: 'Devon Energy Corporation', sector: 'Energy', exchange: 'NYSE' },
  { symbol: 'BKR', name: 'Baker Hughes Company', sector: 'Energy', exchange: 'NASDAQ' },

  // Industrials
  { symbol: 'GE', name: 'GE Aerospace', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'RTX', name: 'RTX Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'HON', name: 'Honeywell International Inc.', sector: 'Industrials', exchange: 'NASDAQ' },
  { symbol: 'UPS', name: 'United Parcel Service Inc.', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'BA', name: 'The Boeing Company', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'LMT', name: 'Lockheed Martin Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'DE', name: 'Deere & Company', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'GD', name: 'General Dynamics Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'FDX', name: 'FedEx Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'NOC', name: 'Northrop Grumman Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'EMR', name: 'Emerson Electric Co.', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'ETN', name: 'Eaton Corporation plc', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'ITW', name: 'Illinois Tool Works Inc.', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'CSX', name: 'CSX Corporation', sector: 'Industrials', exchange: 'NASDAQ' },
  { symbol: 'UNP', name: 'Union Pacific Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'NSC', name: 'Norfolk Southern Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'MMM', name: '3M Company', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'PH', name: 'Parker-Hannifin Corporation', sector: 'Industrials', exchange: 'NYSE' },
  { symbol: 'WM', name: 'Waste Management Inc.', sector: 'Industrials', exchange: 'NYSE' },

  // Materials
  { symbol: 'LIN', name: 'Linde plc', sector: 'Materials', exchange: 'NASDAQ' },
  { symbol: 'APD', name: 'Air Products and Chemicals Inc.', sector: 'Materials', exchange: 'NASDAQ' },
  { symbol: 'SHW', name: 'The Sherwin-Williams Company', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'FCX', name: 'Freeport-McMoRan Inc.', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'NEM', name: 'Newmont Corporation', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'NUE', name: 'Nucor Corporation', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'PPG', name: 'PPG Industries Inc.', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'ECL', name: 'Ecolab Inc.', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'DOW', name: 'Dow Inc.', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'DD', name: 'DuPont de Nemours Inc.', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'ALB', name: 'Albemarle Corporation', sector: 'Materials', exchange: 'NYSE' },
  { symbol: 'CF', name: 'CF Industries Holdings Inc.', sector: 'Materials', exchange: 'NYSE' },

  // Real Estate
  { symbol: 'PLD', name: 'Prologis Inc.', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'AMT', name: 'American Tower Corporation', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'EQIX', name: 'Equinix Inc.', sector: 'Real Estate', exchange: 'NASDAQ' },
  { symbol: 'CCI', name: 'Crown Castle Inc.', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'PSA', name: 'Public Storage', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'O', name: 'Realty Income Corporation', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'DLR', name: 'Digital Realty Trust Inc.', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'WELL', name: 'Welltower Inc.', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'AVB', name: 'AvalonBay Communities Inc.', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'EQR', name: 'Equity Residential', sector: 'Real Estate', exchange: 'NYSE' },
  { symbol: 'SPG', name: 'Simon Property Group Inc.', sector: 'Real Estate', exchange: 'NYSE' },

  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'DUK', name: 'Duke Energy Corporation', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'SO', name: 'The Southern Company', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'D', name: 'Dominion Energy Inc.', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'SRE', name: 'Sempra', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'AEP', name: 'American Electric Power Company', sector: 'Utilities', exchange: 'NASDAQ' },
  { symbol: 'EXC', name: 'Exelon Corporation', sector: 'Utilities', exchange: 'NASDAQ' },
  { symbol: 'XEL', name: 'Xcel Energy Inc.', sector: 'Utilities', exchange: 'NASDAQ' },
  { symbol: 'PEG', name: 'Public Service Enterprise Group', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'WEC', name: 'WEC Energy Group Inc.', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'ES', name: 'Eversource Energy', sector: 'Utilities', exchange: 'NYSE' },
  { symbol: 'AWK', name: 'American Water Works Company', sector: 'Utilities', exchange: 'NYSE' },
];

const SECTORS = [
  { name: 'Information Technology', description: 'Companies in software, hardware, semiconductors, and IT services.' },
  { name: 'Financials', description: 'Banks, insurance companies, investment firms, and financial services.' },
  { name: 'Health Care', description: 'Pharmaceuticals, biotechnology, medical devices, and healthcare providers.' },
  { name: 'Consumer Discretionary', description: 'Non-essential goods and services: retail, autos, entertainment.' },
  { name: 'Communication Services', description: 'Telecom, media, entertainment, and internet companies.' },
  { name: 'Consumer Staples', description: 'Essential products: food, beverages, household, and personal care.' },
  { name: 'Energy', description: 'Oil, gas, coal, and renewable energy companies.' },
  { name: 'Industrials', description: 'Manufacturing, aerospace, defense, logistics, and transportation.' },
  { name: 'Materials', description: 'Chemicals, construction materials, metals, mining, and paper.' },
  { name: 'Real Estate', description: 'Real estate investment trusts (REITs) and real estate management.' },
  { name: 'Utilities', description: 'Electric, gas, and water utilities.' },
];

async function seed() {
  console.log('🌱 Starting StockPulse seed...\n');

  try {
    // 1. Insert sectors
    console.log('📂 Inserting sectors...');
    const sectorMap = {};
    for (const sector of SECTORS) {
      const result = await pool.query(
        `INSERT INTO sectors (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING sector_id, name`,
        [sector.name, sector.description]
      );
      sectorMap[result.rows[0].name] = result.rows[0].sector_id;
      console.log(`  ✓ ${sector.name}`);
    }

    // 2. Insert stocks
    console.log('\n📈 Inserting stocks...');
    let inserted = 0;
    let skipped = 0;

    for (const stock of SP500_STOCKS) {
      const sectorId = sectorMap[stock.sector];
      if (!sectorId) {
        console.warn(`  ⚠ Unknown sector for ${stock.symbol}: ${stock.sector}`);
        continue;
      }

      const result = await pool.query(
        `INSERT INTO stocks (symbol, name, sector_id, exchange)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (symbol) DO UPDATE
           SET name = EXCLUDED.name,
               sector_id = EXCLUDED.sector_id,
               exchange = EXCLUDED.exchange
         RETURNING stock_id`,
        [stock.symbol, stock.name, sectorId, stock.exchange]
      );

      if (result.rows.length > 0) inserted++;
      else skipped++;
    }

    console.log(`  ✓ ${inserted} stocks inserted/updated, ${skipped} skipped`);
    console.log(`\n✅ Seed complete!`);
    console.log(`\nNext step: Run 'npm run ingest' to fetch historical price data.`);
    console.log('⚠️  Ingestion will take several hours due to API rate limits. Run it overnight.');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
