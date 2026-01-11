/**
 * Google Apps Script for Wedding RSVP Form
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets and create a new spreadsheet
 * 2. Create a sheet named "RSVP" (or change SHEET_NAME below)
 * 3. Go to Extensions > Apps Script
 * 4. Delete any existing code and paste this entire file
 * 5. Click on Deploy > New deployment
 * 6. Select type: Web app
 * 7. Set "Execute as": Me
 * 8. Set "Who has access": Anyone
 * 9. Click Deploy
 * 10. Copy the Web App URL and paste it in your HTML file
 */

const SHEET_NAME = 'rsvp'; // Change this if your sheet has a different name
const RATE_LIMIT_SHEET = 'RateLimiting'; // Sheet to track submission rates

// Configuration
const MAX_SUBMISSIONS_PER_PHONE = 3; // Max submissions per phone number
const RATE_LIMIT_WINDOW_HOURS = 24; // Time window for rate limiting
const MAX_STRING_LENGTH = 500; // Max length for text fields
const MAX_PHONE_LENGTH = 20;
const MAX_NAME_LENGTH = 100;

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);

    // Validate and sanitize input data
    const validationError = validateInput(data);
    if (validationError) {
      return createErrorResponse(validationError);
    }

    // Check rate limiting
    const rateLimitError = checkRateLimit(data.phone);
    if (rateLimitError) {
      return createErrorResponse(rateLimitError);
    }

    // Get the specific sheet by name instead of active sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // Create the sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    // Sanitize all data before storing
    const sanitizedData = sanitizeData(data);

    // Check if this is the first row (add headers)
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Full Name',
        'Phone',
        'Friend Of',
        'Has Plus One',
        'Plus One Name',
        'Your Church',
        'Your Reception',
        'Plus One Church',
        'Plus One Reception',
        'Church Guest Count',
        'Reception Guest Count',
        'Your Lunch Dietary',
        'Plus One Lunch Dietary',
        'Your Dinner Dietary',
        'Plus One Dinner Dietary',
        'Song Request',
        'Message'
      ];
      sheet.appendRow(headers);

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#F4C7D4');
      headerRange.setFontColor('#2D1E24');
      
      // Freeze the header row
      sheet.setFrozenRows(1);
    }

    // Append the data as a new row
    const row = [
      sanitizedData.timestamp || '',
      sanitizedData.fullName || '',
      sanitizedData.phone || '',
      sanitizedData.friendOf || '',
      sanitizedData.hasPlusOne || '',
      sanitizedData.plusOneName || '',
      sanitizedData.yourChurch || '',
      sanitizedData.yourReception || '',
      sanitizedData.plusOneChurch || '',
      sanitizedData.plusOneReception || '',
      sanitizedData.churchGuestCount || '',
      sanitizedData.receptionGuestCount || '',
      sanitizedData.yourLunchDietary || '',
      sanitizedData.plusOneLunchDietary || '',
      sanitizedData.yourDinnerDietary || '',
      sanitizedData.plusOneDinnerDietary || '',
      sanitizedData.song || '',
      sanitizedData.message || ''
    ];

    sheet.appendRow(row);

    // Auto-resize columns for better readability
    sheet.autoResizeColumns(1, row.length);

    // Record this submission for rate limiting
    recordSubmission(sanitizedData.phone);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'RSVP submitted successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log the error for debugging
    Logger.log('Error: ' + error.toString());

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Failed to submit RSVP. Please try again.'
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function validateInput(data) {
  // Check required fields exist
  if (!data.fullName || !data.phone || !data.friendOf) {
    return 'Missing required fields';
  }

  // Validate name length
  if (data.fullName.length > MAX_NAME_LENGTH) {
    return 'Name is too long';
  }

  // Validate phone length
  if (data.phone.length > MAX_PHONE_LENGTH) {
    return 'Phone number is too long';
  }

  // Validate phone contains only numbers, spaces, +, -, ()
  if (!/^[0-9\s\+\-\(\)]+$/.test(data.phone)) {
    return 'Invalid phone number format';
  }

  // Validate friendOf is either "Bride" or "Groom"
  if (data.friendOf !== 'Bride' && data.friendOf !== 'Groom') {
    return 'Invalid friend selection';
  }

  // Validate text field lengths
  const textFields = ['plusOneName', 'yourLunchDietary', 'plusOneLunchDietary',
                      'yourDinnerDietary', 'plusOneDinnerDietary', 'song', 'message'];

  for (const field of textFields) {
    if (data[field] && data[field].length > MAX_STRING_LENGTH) {
      return `${field} is too long (max ${MAX_STRING_LENGTH} characters)`;
    }
  }

  // Validate boolean fields
  const boolFields = ['hasPlusOne', 'yourChurch', 'yourReception',
                      'plusOneChurch', 'plusOneReception'];

  for (const field of boolFields) {
    if (data[field] && data[field] !== 'Yes' && data[field] !== 'No' && data[field] !== 'N/A') {
      return `Invalid value for ${field}`;
    }
  }

  return null; // No errors
}

function sanitizeData(data) {
  const sanitized = {};

  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      let value = data[key];

      // Convert to string and trim
      if (typeof value === 'string') {
        value = value.trim();

        // Remove any potential formula injection characters at the start
        // Prevents =, +, -, @ at the beginning which could be Excel formulas
        if (value.length > 0 && /^[=+\-@]/.test(value)) {
          value = "'" + value; // Prefix with single quote to treat as text
        }

        // Limit length
        if (value.length > MAX_STRING_LENGTH) {
          value = value.substring(0, MAX_STRING_LENGTH);
        }
      }

      sanitized[key] = value;
    }
  }

  return sanitized;
}

// ============================================
// RATE LIMITING FUNCTIONS
// ============================================

function checkRateLimit(phone) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let rateLimitSheet = spreadsheet.getSheetByName(RATE_LIMIT_SHEET);

  // Create rate limit sheet if it doesn't exist
  if (!rateLimitSheet) {
    rateLimitSheet = spreadsheet.insertSheet(RATE_LIMIT_SHEET);
    rateLimitSheet.appendRow(['Phone', 'Timestamp', 'Count']);
    rateLimitSheet.hideSheet(); // Hide from normal view
  }

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000));

  // Clean up old entries
  const data = rateLimitSheet.getDataRange().getValues();
  for (let i = data.length - 1; i > 0; i--) { // Start from 1 to skip header
    const timestamp = new Date(data[i][1]);
    if (timestamp < cutoffTime) {
      rateLimitSheet.deleteRow(i + 1);
    }
  }

  // Count submissions from this phone number in the time window
  const currentData = rateLimitSheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < currentData.length; i++) {
    if (currentData[i][0] === phone) {
      count++;
    }
  }

  if (count >= MAX_SUBMISSIONS_PER_PHONE) {
    return `Too many submissions from this phone number. Please wait ${RATE_LIMIT_WINDOW_HOURS} hours or contact us directly.`;
  }

  return null; // No rate limit hit
}

function recordSubmission(phone) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let rateLimitSheet = spreadsheet.getSheetByName(RATE_LIMIT_SHEET);

  if (!rateLimitSheet) {
    rateLimitSheet = spreadsheet.insertSheet(RATE_LIMIT_SHEET);
    rateLimitSheet.appendRow(['Phone', 'Timestamp', 'Count']);
    rateLimitSheet.hideSheet();
  }

  rateLimitSheet.appendRow([phone, new Date(), 1]);
}

function createErrorResponse(message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

// Test function - you can run this to verify the script works
function test() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        fullName: 'Test User',
        phone: '1234567890',
        friendOf: 'Bride',
        hasPlusOne: 'Yes',
        plusOneName: 'Test Guest',
        yourChurch: 'Yes',
        yourReception: 'Yes',
        plusOneChurch: 'Yes',
        plusOneReception: 'No',
        churchGuestCount: 2,
        receptionGuestCount: 1,
        yourLunchDietary: 'Vegetarian',
        plusOneLunchDietary: 'None',
        yourDinnerDietary: 'None',
        plusOneDinnerDietary: 'N/A',
        song: 'Perfect by Ed Sheeran',
        message: 'Congratulations!'
      })
    }
  };

  const result = doPost(testData);
  Logger.log(result.getContent());
}

// Alternative simpler test function
function simpleTest() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  
  // Add headers if needed
  if (sheet.getLastRow() === 0) {
    const headers = [
      'Timestamp', 'Full Name', 'Phone', 'Friend Of', 'Has Plus One', 
      'Plus One Name', 'Your Church', 'Your Reception', 'Plus One Church', 
      'Plus One Reception', 'Church Guest Count', 'Reception Guest Count', 
      'Your Lunch Dietary', 'Plus One Lunch Dietary', 'Your Dinner Dietary', 
      'Plus One Dinner Dietary', 'Song Request', 'Message'
    ];
    sheet.appendRow(headers);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#F4C7D4');
    headerRange.setFontColor('#2D1E24');
    sheet.setFrozenRows(1);
  }
  
  // Add test data
  const row = [
    new Date().toISOString(),
    'Simple Test User',
    '9999999999',
    'Bride',
    'Yes',
    'Test Guest',
    'Yes',
    'Yes',
    'No',
    'Yes',
    2,
    1,
    'Vegetarian',
    'None',
    'Gluten-free',
    'N/A',
    'Happy Song',
    'Test message!'
  ];
  
  sheet.appendRow(row);
  sheet.autoResizeColumns(1, row.length);
  
  Logger.log('Test completed! Check your RSVP sheet.');
}