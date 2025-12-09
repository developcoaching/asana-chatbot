const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

/**
 * GoogleSheetsClient - Fetches P&L data from Google Sheets
 * Reads financial metrics from client P&L trackers
 */
class GoogleSheetsClient {
  constructor() {
    this.credentialsPath = path.join(__dirname, '..', 'google-credentials.json');
    this.auth = null;
    this.sheets = null;
    this.drive = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // Check for base64 encoded credentials in env (for Railway deployment)
      const base64Creds = process.env.GOOGLE_CREDENTIALS_BASE64;

      if (base64Creds) {
        // Decode base64 credentials and use directly
        const credentials = JSON.parse(Buffer.from(base64Creds, 'base64').toString('utf8'));
        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
          ],
        });
        console.log('✅ Google Sheets client initialized from env');
      } else if (fs.existsSync(this.credentialsPath)) {
        // Fall back to file-based credentials (local development)
        this.auth = new google.auth.GoogleAuth({
          keyFile: this.credentialsPath,
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets.readonly',
            'https://www.googleapis.com/auth/drive.readonly'
          ],
        });
        console.log('✅ Google Sheets client initialized from file');
      } else {
        console.warn('⚠️  No Google credentials found - P&L features disabled');
        return false;
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets client:', error.message);
      return false;
    }
  }

  /**
   * List all P&L spreadsheets accessible by the service account
   */
  async listClientSheets() {
    await this.initialize();

    try {
      const response = await this.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 100
      });

      const files = response.data.files || [];
      console.log(`📊 Found ${files.length} P&L spreadsheets`);

      return files.map(file => ({
        sheetId: file.id,
        name: file.name,
        // Extract client name from sheet name (e.g., "P&L tracker 2025- Kate & James Kiwi" -> "Kate & James Kiwi")
        clientName: this.extractClientName(file.name),
        modifiedTime: file.modifiedTime
      }));
    } catch (error) {
      console.error('Error listing sheets:', error.message);
      return [];
    }
  }

  /**
   * Extract client name from spreadsheet title
   */
  extractClientName(sheetName) {
    // Remove common prefixes
    let name = sheetName
      .replace(/P&L tracker\s*-?\s*/i, '')
      .replace(/2025\s*-?\s*/i, '')
      .replace(/2024\s*-?\s*/i, '')
      .trim();

    // Remove trailing year if present
    name = name.replace(/\s*2025\s*$/i, '').replace(/\s*2024\s*$/i, '').trim();

    return name || sheetName;
  }

  /**
   * Read P&L data from a specific spreadsheet
   * Returns structured financial metrics
   */
  async getClientPLData(sheetId) {
    await this.initialize();

    try {
      // Get spreadsheet metadata
      const metadata = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const sheetName = metadata.data.properties.title;
      const clientName = this.extractClientName(sheetName);

      // Find the "Actuals" tab (or first tab)
      const tabs = metadata.data.sheets.map(s => s.properties.title);
      const actualsTab = tabs.find(t => t.toLowerCase().includes('actual')) || tabs[0];

      // Read the data - get rows 1-25 which contain the summary metrics
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `'${actualsTab}'!A1:Z25`,
      });

      const rows = response.data.values || [];
      const metrics = this.parseFinancialMetrics(rows);

      return {
        sheetId,
        clientName,
        sheetName,
        lastUpdated: this.extractLastUpdated(rows),
        metrics,
        rawRows: rows.slice(0, 25) // Store first 25 rows for context
      };
    } catch (error) {
      console.error(`Error reading sheet ${sheetId}:`, error.message);
      return null;
    }
  }

  /**
   * Extract last updated date from sheet
   */
  extractLastUpdated(rows) {
    // Row 3 typically has "Last updated | Oct-25"
    const row3 = rows[2] || [];
    const lastUpdatedIdx = row3.findIndex(cell =>
      cell && cell.toLowerCase().includes('last updated')
    );
    if (lastUpdatedIdx >= 0 && row3[lastUpdatedIdx + 1]) {
      return row3[lastUpdatedIdx + 1];
    }
    return null;
  }

  /**
   * Parse financial metrics from P&L rows
   */
  parseFinancialMetrics(rows) {
    const metrics = {
      turnover: {},
      grossProfit: {},
      netProfit: {},
      monthlyRetainedProfit: {}
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const label = (row[0] || '').toLowerCase().trim();

      // Turnover
      if (label.includes('turnover')) {
        const actual = this.findActualRow(rows, i);
        const budget = this.findBudgetRow(rows, i);
        if (actual) {
          metrics.turnover.actual = this.cleanCurrency(actual[2]); // Total YTD
          metrics.turnover.projected = this.cleanCurrency(actual[3]);
        }
        if (budget) {
          metrics.turnover.budget = this.cleanCurrency(budget[2]);
          metrics.turnover.projectedBudget = this.cleanCurrency(budget[3]);
        }
        // Get variance
        const diff = this.findDiffRow(rows, i);
        if (diff) {
          metrics.turnover.variance = this.cleanCurrency(diff[2]);
          metrics.turnover.variancePercent = this.findVariancePercent(rows, i);
        }
      }

      // Gross Profit %
      if (label.includes('gross profit')) {
        const actual = this.findActualRow(rows, i);
        const budget = this.findBudgetRow(rows, i);
        if (actual) {
          metrics.grossProfit.actual = this.cleanPercent(actual[2]);
        }
        if (budget) {
          metrics.grossProfit.budget = this.cleanPercent(budget[2]);
        }
        const diff = this.findDiffRow(rows, i);
        if (diff) {
          metrics.grossProfit.variance = this.cleanPercent(diff[2]);
        }
      }

      // Net Profit %
      if (label.includes('net profit')) {
        const actual = this.findActualRow(rows, i);
        const budget = this.findBudgetRow(rows, i);
        if (actual) {
          metrics.netProfit.actual = this.cleanPercent(actual[2]);
        }
        if (budget) {
          metrics.netProfit.budget = this.cleanPercent(budget[2]);
        }
        const diff = this.findDiffRow(rows, i);
        if (diff) {
          metrics.netProfit.variance = this.cleanPercent(diff[2]);
        }
      }

      // Monthly retained profit
      if (label.includes('monthly retained') || label.includes('retained profit')) {
        const actual = this.findActualRow(rows, i);
        if (actual) {
          metrics.monthlyRetainedProfit.actual = this.cleanCurrency(actual[2]);
          metrics.monthlyRetainedProfit.projected = this.cleanCurrency(actual[3]);
        }
      }
    }

    return metrics;
  }

  findActualRow(rows, startIdx) {
    for (let i = startIdx; i < Math.min(startIdx + 5, rows.length); i++) {
      const row = rows[i];
      if (row && row[1] && row[1].toLowerCase().includes('actual')) {
        return row;
      }
    }
    return null;
  }

  findBudgetRow(rows, startIdx) {
    for (let i = startIdx; i < Math.min(startIdx + 5, rows.length); i++) {
      const row = rows[i];
      if (row && row[1] && row[1].toLowerCase().includes('budget')) {
        return row;
      }
    }
    return null;
  }

  findDiffRow(rows, startIdx) {
    for (let i = startIdx; i < Math.min(startIdx + 5, rows.length); i++) {
      const row = rows[i];
      if (row && row[1] && row[1].toLowerCase().includes('diff')) {
        return row;
      }
    }
    return null;
  }

  findVariancePercent(rows, startIdx) {
    for (let i = startIdx; i < Math.min(startIdx + 6, rows.length); i++) {
      const row = rows[i];
      if (row && row[1] && row[1].toLowerCase().includes('variance')) {
        return this.cleanPercent(row[2]);
      }
    }
    return null;
  }

  cleanCurrency(value) {
    if (!value) return null;
    // Remove currency symbols, commas, and convert to number
    const cleaned = value.toString().replace(/[£$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? value : num;
  }

  cleanPercent(value) {
    if (!value) return null;
    // Remove % sign and convert to number
    const cleaned = value.toString().replace(/%/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? value : num;
  }

  /**
   * Get all clients' P&L data
   */
  async getAllClientsPLData() {
    const sheets = await this.listClientSheets();
    const allData = [];

    for (const sheet of sheets) {
      console.log(`📊 Reading P&L for ${sheet.clientName}...`);
      const data = await this.getClientPLData(sheet.sheetId);
      if (data) {
        allData.push(data);
      }
    }

    return allData;
  }

  /**
   * Normalize a name for matching (remove punctuation, extra spaces, common words)
   */
  normalizeName(name) {
    return name
      .toLowerCase()
      .replace(/[&\-_,.']/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')         // Collapse multiple spaces
      .trim();
  }

  /**
   * Find a client's P&L by name (fuzzy match)
   */
  async getClientPLByName(clientName) {
    const sheets = await this.listClientSheets();

    // Normalize search name
    const searchNormalized = this.normalizeName(clientName);
    const searchWords = searchNormalized.split(' ').filter(w => w.length > 1);

    // Find best match using word overlap
    let bestMatch = null;
    let bestScore = 0;

    for (const sheet of sheets) {
      const sheetNormalized = this.normalizeName(sheet.clientName);
      const sheetWords = sheetNormalized.split(' ').filter(w => w.length > 1);

      // Count matching words
      const matchingWords = searchWords.filter(w =>
        sheetWords.some(sw => sw.includes(w) || w.includes(sw))
      );

      const score = matchingWords.length / Math.max(searchWords.length, 1);

      if (score > bestScore && score >= 0.3) {  // At least 30% word match
        bestScore = score;
        bestMatch = sheet;
      }
    }

    if (bestMatch) {
      console.log(`✅ P&L match: "${clientName}" → "${bestMatch.clientName}" (score: ${bestScore.toFixed(2)})`);
      return await this.getClientPLData(bestMatch.sheetId);
    }

    console.log(`⚠️  No P&L match for "${clientName}"`);
    return null;
  }

  /**
   * Format P&L data for AI context
   */
  formatPLForAI(plData) {
    if (!plData) return 'No P&L data available for this client.';

    const { clientName, lastUpdated, metrics } = plData;
    let context = `**${clientName} - P&L Summary (${lastUpdated || 'Latest'})**\n\n`;

    // Turnover
    if (metrics.turnover.actual) {
      context += `**Turnover:**\n`;
      context += `- YTD Actual: £${metrics.turnover.actual?.toLocaleString() || 'N/A'}\n`;
      context += `- YTD Budget: £${metrics.turnover.budget?.toLocaleString() || 'N/A'}\n`;
      context += `- Variance: £${metrics.turnover.variance?.toLocaleString() || 'N/A'} (${metrics.turnover.variancePercent || 'N/A'}%)\n`;
      context += `- Projected: £${metrics.turnover.projected?.toLocaleString() || 'N/A'}\n\n`;
    }

    // Gross Profit
    if (metrics.grossProfit.actual !== undefined) {
      context += `**Gross Profit %:**\n`;
      context += `- Actual: ${metrics.grossProfit.actual}%\n`;
      context += `- Budget: ${metrics.grossProfit.budget}%\n`;
      context += `- Variance: ${metrics.grossProfit.variance}%\n\n`;
    }

    // Net Profit
    if (metrics.netProfit.actual !== undefined) {
      context += `**Net Profit %:**\n`;
      context += `- Actual: ${metrics.netProfit.actual}%\n`;
      context += `- Budget: ${metrics.netProfit.budget}%\n`;
      context += `- Variance: ${metrics.netProfit.variance}%\n\n`;
    }

    // Monthly Retained Profit
    if (metrics.monthlyRetainedProfit.actual) {
      context += `**Monthly Retained Profit:**\n`;
      context += `- YTD: £${metrics.monthlyRetainedProfit.actual?.toLocaleString() || 'N/A'}\n`;
      context += `- Projected: £${metrics.monthlyRetainedProfit.projected?.toLocaleString() || 'N/A'}\n`;
    }

    return context;
  }
}

module.exports = GoogleSheetsClient;
