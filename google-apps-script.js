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

function doPost(e) {
  try {
    // Get the specific sheet by name instead of active sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create the sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);

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
      data.timestamp || '',
      data.fullName || '',
      data.phone || '',
      data.friendOf || '',
      data.hasPlusOne || '',
      data.plusOneName || '',
      data.yourChurch || '',
      data.yourReception || '',
      data.plusOneChurch || '',
      data.plusOneReception || '',
      data.churchGuestCount || '',
      data.receptionGuestCount || '',
      data.yourLunchDietary || '',
      data.plusOneLunchDietary || '',
      data.yourDinnerDietary || '',
      data.plusOneDinnerDietary || '',
      data.song || '',
      data.message || ''
    ];

    sheet.appendRow(row);

    // Auto-resize columns for better readability
    sheet.autoResizeColumns(1, row.length);

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