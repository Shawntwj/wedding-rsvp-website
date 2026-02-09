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

// Email Configuration
const EMAIL_CONFIG = {
  fromName: "Shawn & Wendy",
  replyTo: "shawntwj20@gmail.com",
  subject: "RSVP Confirmed - Shawn & Wendy's Wedding",

  // Event details
  weddingDate: "November 28, 2026",
  churchName: "Zion Presbyterian Church",
  churchTime: "10:30 AM - 12:30 PM",
  receptionVenue: "Pan Pacific Hotel Singapore",
  receptionLocation: "Ocean Ballroom, 2nd Floor",
  receptionTime: "7:00 PM - 11:00 PM",

  // Contact info
  contactEmail: "shawntwj20@gmail.com"
};

// Configuration
const MAX_SUBMISSIONS_PER_PHONE = 3; // Max submissions per phone number
const RATE_LIMIT_WINDOW_HOURS = 24; // Time window for rate limiting
const MAX_STRING_LENGTH = 500; // Max length for text fields
const MAX_PHONE_LENGTH = 20;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 100;

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
        'Email',
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
      sanitizedData.email || '',
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

    // Send confirmation email to the guest
    try {
      sendConfirmationEmail(sanitizedData);
    } catch (emailError) {
      // Log email error but don't fail the submission
      Logger.log('Email sending failed: ' + emailError.toString());
    }

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
  if (!data.fullName || !data.email || !data.phone || !data.friendOf) {
    return 'Missing required fields';
  }

  // Validate name length
  if (data.fullName.length > MAX_NAME_LENGTH) {
    return 'Name is too long';
  }

  // Validate email
  if (data.email.length > MAX_EMAIL_LENGTH) {
    return 'Email is too long';
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return 'Invalid email format';
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

// ============================================
// EMAIL CONFIRMATION FUNCTION
// ============================================

/**
 * Sends a confirmation email to the guest
 * @param {Object} data - The sanitized form data
 */
function sendConfirmationEmail(data) {
  try {
    // Validate email address
    if (!data.email || !validateEmail(data.email)) {
      Logger.log('Invalid email address: ' + data.email);
      return false;
    }

    // Generate HTML email content
    const htmlBody = generateEmailHTML(data);

    // Generate plain text version (fallback)
    const plainTextBody = generatePlainTextEmail(data);

    // Send email using GmailApp
    GmailApp.sendEmail(
      data.email,
      EMAIL_CONFIG.subject,
      plainTextBody,
      {
        name: EMAIL_CONFIG.fromName,
        htmlBody: htmlBody,
        replyTo: EMAIL_CONFIG.replyTo,
        noReply: false
      }
    );

    Logger.log('Confirmation email sent successfully to: ' + data.email);
    return true;

  } catch (error) {
    Logger.log('Error sending confirmation email: ' + error.toString());
    // Don't throw - we don't want email failures to break RSVP submission
    return false;
  }
}

/**
 * Validates email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates HTML email template with wedding aesthetic
 * FIXES:
 * 1. Replaced broken emoji with safe HTML entity code (🍷)
 * 2. Removed Dress Code section
 * 3. Kept cleaner icon style (no pink boxes)
 */
function generateEmailHTML(data) {
  // Parse event attendance
  const attendingChurch = data.yourChurch === 'Yes' || data.plusOneChurch === 'Yes';
  const attendingReception = data.yourReception === 'Yes' || data.plusOneReception === 'Yes';
  const hasPlusOne = data.hasPlusOne === 'Yes';

  // Build guest list
  const guestList = [];
  if (data.yourChurch === 'Yes' || data.yourReception === 'Yes') {
    guestList.push({
      name: data.fullName,
      church: data.yourChurch === 'Yes',
      reception: data.yourReception === 'Yes',
      lunchDietary: data.yourLunchDietary,
      dinnerDietary: data.yourDinnerDietary
    });
  }
  if (hasPlusOne && (data.plusOneChurch === 'Yes' || data.plusOneReception === 'Yes')) {
    guestList.push({
      name: data.plusOneName,
      church: data.plusOneChurch === 'Yes',
      reception: data.plusOneReception === 'Yes',
      lunchDietary: data.plusOneLunchDietary,
      dinnerDietary: data.plusOneDinnerDietary
    });
  }

  // Generate guest RSVP details HTML
  const guestDetailsHTML = guestList.map((guest) => `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:15px">
      <tbody>
        <tr>
          <td style="padding-bottom:8px">
            <span style="font-family: Arial, sans-serif; font-size:16px; font-weight:600; color:#2d1e24">${guest.name}</span>
          </td>
        </tr>
        ${guest.church ? `
        <tr>
          <td style="padding:8px 0 8px 20px; color:#5d4e55; font-size:14px; border-left:3px solid #d4a5b5; font-family: Arial, sans-serif;">
            <span style="color:#6b9f7e; font-weight:bold; margin-right:8px">✓</span>
            Church Solemnization &amp; Lunch (10:30 AM - 12:30 PM)
            ${guest.lunchDietary && guest.lunchDietary !== 'None' && guest.lunchDietary !== 'N/A' ? 
              `<br><span style="font-size:13px; color:#8b7a82; font-style:italic; margin-left:24px">Dietary: ${guest.lunchDietary}</span>` : ''}
          </td>
        </tr>` : ''}
        ${guest.reception ? `
        <tr>
          <td style="padding:8px 0 8px 20px; color:#5d4e55; font-size:14px; border-left:3px solid #d4a5b5; font-family: Arial, sans-serif;">
            <span style="color:#6b9f7e; font-weight:bold; margin-right:8px">✓</span>
            Wedding Reception &amp; Dinner (7:00 PM - 11:00 PM)
            ${guest.dinnerDietary && guest.dinnerDietary !== 'None' && guest.dinnerDietary !== 'N/A' ? 
              `<br><span style="font-size:13px; color:#8b7a82; font-style:italic; margin-left:24px">Dietary: ${guest.dinnerDietary}</span>` : ''}
          </td>
        </tr>` : ''}
      </tbody>
    </table>
  `).join('');

  // Generate HTML
  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>RSVP Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #FDF8F5; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FDF8F5;">
        <tr>
          <td align="center" style="padding: 30px 15px;">
            <table role="presentation" width="600" style="max-width: 600px; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #F0E6EA;" cellspacing="0" cellpadding="0" border="0">

              <tr>
                <td style="height: 5px; background-color: #D4A5B5;"></td>
              </tr>

              <tr>
                <td style="background-color: #FFFFFF; padding: 40px 40px 20px 40px; text-align: center;">
                  <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 40px; font-weight: 400; margin: 0 0 10px 0; color: #8B5A6F; letter-spacing: 2px; line-height: 1.2;">
                    Shawn <span style="font-style: italic; color: #C9939E; font-size: 36px;">&amp;</span> Wendy
                  </h1>

                  <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 400; margin: 0; color: #8B7A82; letter-spacing: 2px;">November 28, 2026</p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 0 40px;">
                  <span style="display: inline-block; background-color: #F2FAF4; border-radius: 30px; border: 1px solid #B8DCC5; padding: 6px 20px; font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: #5A8F6B; letter-spacing: 1.5px; text-transform: uppercase;">
                    ✓ RSVP Confirmed
                  </span>
                </td>
              </tr>

              <tr>
                <td style="padding: 30px 40px 20px 40px;">
                  <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #2D1E24; margin: 0 0 15px 0;">Dear ${data.fullName},</p>
                  <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #6B5A62; line-height: 1.7; margin: 0;">
                    Thank you for your RSVP! We're absolutely delighted that you'll be joining us to celebrate our special day. This email confirms your attendance details.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 40px 30px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fdf8f5; border-radius:10px; overflow:hidden;">
                    <tbody>
                      <tr>
                        <td style="background:linear-gradient(90deg,#d4a5b5,#c9939e); padding:15px 25px;">
                          <span style="font-family:Georgia,'Times New Roman',serif; font-size:18px; color:#ffffff; letter-spacing:1px;">Your RSVP Summary</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:25px;">
                          ${guestDetailsHTML}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 10px 40px 20px 40px;">
                   <h2 style="font-family: Georgia, 'Times New Roman', serif; font-size: 22px; color: #8B5A6F; margin: 0; font-weight: 400; letter-spacing: 1px;">Event Details</h2>
                </td>
              </tr>

              ${attendingChurch ? `
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #E8D4DC; border-radius: 10px; overflow: hidden;">
                    <tbody>
                      <tr>
                        <td style="background:#fdfbfc; padding:20px 25px; border-bottom:1px solid #f0e6ea;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tbody>
                              <tr>
                                <td width="30" valign="top" style="padding-top:2px;">
                                   <span style="font-size:24px;">⛪</span>
                                </td>
                                <td style="padding-left:15px; vertical-align: middle;">
                                  <span style="font-family:Georgia,'Times New Roman',serif; font-size:18px; color:#8b5a6f;">Church Solemnization</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 25px; background-color: #FFFFFF;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,sans-serif; font-size:14px; color:#5d4e55;">
                            <tbody>
                              <tr>
                                <td style="padding:6px 0;"><strong style="color:#8b5a6f; display:inline-block; width:70px;">Venue:</strong> ${EMAIL_CONFIG.churchName}</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0;"><strong style="color:#8b5a6f; display:inline-block; width:70px;">Time:</strong> ${EMAIL_CONFIG.churchTime}</td>
                              </tr>
                              <tr>
                                <td style="padding:10px 0 0 0;">
                                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background:#fff9f0; border-radius:6px; border-left:3px solid #e8c07d;">
                                    <tbody>
                                      <tr>
                                        <td style="padding:10px 15px; font-size:13px; color:#8b7355;">
                                          <span style="margin-right:6px;">☆</span> Lunch will be provided after the ceremony
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              ` : ''}

              ${attendingReception ? `
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #E8D4DC; border-radius: 10px; overflow: hidden;">
                    <tbody>
                      <tr>
                        <td style="background:#fdfbfc; padding:20px 25px; border-bottom:1px solid #f0e6ea;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tbody>
                              <tr>
                                <td width="30" valign="top" style="padding-top:2px;">
                                   <span style="font-size:24px; color:#8B5A6F;">&#127863;</span>
                                </td>
                                <td style="padding-left:15px; vertical-align: middle;">
                                  <span style="font-family:Georgia,'Times New Roman',serif; font-size:18px; color:#8b5a6f;">Wedding Reception</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 25px; background-color: #FFFFFF;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,sans-serif; font-size:14px; color:#5d4e55;">
                            <tbody>
                              <tr>
                                <td style="padding:6px 0;"><strong style="color:#8b5a6f; display:inline-block; width:70px;">Venue:</strong> ${EMAIL_CONFIG.receptionVenue}</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0;"><strong style="color:#8b5a6f; display:inline-block; width:70px;">Location:</strong> ${EMAIL_CONFIG.receptionLocation}</td>
                              </tr>
                              <tr>
                                <td style="padding:6px 0;"><strong style="color:#8b5a6f; display:inline-block; width:70px;">Time:</strong> ${EMAIL_CONFIG.receptionTime}</td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              ` : ''}

              ${data.song && data.song !== 'N/A' ? `
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 10px; border: 1px solid #E8DFF0; border-left: 4px solid #E0D2E8;">
                    <tr>
                      <td style="padding: 20px 24px;">
                        <span style="font-size: 18px; margin-right: 8px;">♪</span>
                        <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #7A5A8B; font-weight: 600;">Song Request</span>
                        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #6B5A72; margin: 8px 0 0 0; line-height: 1.5;">
                          We'll do our best to play: <strong style="color: #8B5A6F;">${data.song}</strong>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              ${data.message && data.message !== 'N/A' ? `
              <tr>
                <td style="padding: 0 40px 20px 40px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFFFFF; border-radius: 10px; border: 1px solid #F0E0E6; border-left: 4px solid #F0D6DE;">
                    <tr>
                      <td style="padding: 20px 24px;">
                        <span style="font-size: 18px; margin-right: 8px;">♡</span>
                        <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; color: #8B5A6F; font-weight: 600;">Your Message</span>
                        <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #6B5A62; margin: 10px 0 0 0; line-height: 1.6; font-style: italic;">
                          &ldquo;${data.message}&rdquo;
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              ` : ''}

              <tr>
                <td style="padding: 20px 40px 28px 40px;">
                  <p style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #6B5A62; line-height: 1.7; margin: 0; text-align: center;">
                    We can't wait to celebrate with you!<br>
                    <span style="font-size: 13px; color: #8B7A82;">If you need to make any changes to your RSVP, please contact us.</span>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="background-color: #FFFFFF; padding: 30px 40px 28px 40px; text-align: center; border-top: 1px solid #F0E6EA;">
                  <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #8B7A82; margin: 0 0 4px 0;">With love,</p>
                  <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 20px; color: #8B5A6F; margin: 0 0 22px 0; letter-spacing: 1px;">Shawn &amp; Wendy</p>

                  <div style="display: inline-block; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E8D4DC; padding: 8px 20px;">
                    <span style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #8B7A82;">For enquiries: </span>
                    <a href="mailto:${EMAIL_CONFIG.contactEmail}" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #C9939E; text-decoration: none; font-weight: 600;">${EMAIL_CONFIG.contactEmail}</a>
                  </div>

                  <p style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #C0B4BB; margin: 18px 0 0 0;">
                    This is an automated confirmation email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="height: 5px; background-color: #D4A5B5;"></td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}


/**
 * Generates plain text version of confirmation email
 * @param {Object} data - The sanitized form data
 * @returns {string} - Plain text email content
 */
function generatePlainTextEmail(data) {
  const hasPlusOne = data.hasPlusOne === 'Yes';
  const attendingChurch = data.yourChurch === 'Yes' || data.plusOneChurch === 'Yes';
  const attendingReception = data.yourReception === 'Yes' || data.plusOneReception === 'Yes';

  let emailText = `
--------------------------------------------
          SHAWN & WENDY
          November 28, 2026

          RSVP CONFIRMED
--------------------------------------------

Dear ${data.fullName},

Thank you for your RSVP! We're absolutely delighted
that you'll be joining us to celebrate our special day.

--------------------------------------------
          YOUR RSVP SUMMARY
--------------------------------------------

`;

  // Add guest details
  if (data.yourChurch === 'Yes' || data.yourReception === 'Yes') {
    emailText += `${data.fullName}:\n`;
    if (data.yourChurch === 'Yes') {
      emailText += `  [x] Church Solemnization & Lunch (10:30 AM - 12:30 PM)\n`;
      if (data.yourLunchDietary && data.yourLunchDietary !== 'None' && data.yourLunchDietary !== 'N/A') {
        emailText += `      Dietary: ${data.yourLunchDietary}\n`;
      }
    }
    if (data.yourReception === 'Yes') {
      emailText += `  [x] Wedding Reception & Dinner (7:00 PM - 11:00 PM)\n`;
      if (data.yourDinnerDietary && data.yourDinnerDietary !== 'None' && data.yourDinnerDietary !== 'N/A') {
        emailText += `      Dietary: ${data.yourDinnerDietary}\n`;
      }
    }
    emailText += '\n';
  }

  if (hasPlusOne && (data.plusOneChurch === 'Yes' || data.plusOneReception === 'Yes')) {
    emailText += `${data.plusOneName}:\n`;
    if (data.plusOneChurch === 'Yes') {
      emailText += `  [x] Church Solemnization & Lunch (10:30 AM - 12:30 PM)\n`;
      if (data.plusOneLunchDietary && data.plusOneLunchDietary !== 'None' && data.plusOneLunchDietary !== 'N/A') {
        emailText += `      Dietary: ${data.plusOneLunchDietary}\n`;
      }
    }
    if (data.plusOneReception === 'Yes') {
      emailText += `  [x] Wedding Reception & Dinner (7:00 PM - 11:00 PM)\n`;
      if (data.plusOneDinnerDietary && data.plusOneDinnerDietary !== 'None' && data.plusOneDinnerDietary !== 'N/A') {
        emailText += `      Dietary: ${data.plusOneDinnerDietary}\n`;
      }
    }
    emailText += '\n';
  }

  emailText += `
--------------------------------------------
           EVENT DETAILS
--------------------------------------------

`;

  if (attendingChurch) {
    emailText += `CHURCH SOLEMNIZATION
  Venue: ${EMAIL_CONFIG.churchName}
  Time:  ${EMAIL_CONFIG.churchTime}
  Note:  Lunch will be provided after the ceremony

`;
  }

  if (attendingReception) {
    emailText += `WEDDING RECEPTION
  Venue:      ${EMAIL_CONFIG.receptionVenue}
  Location:   ${EMAIL_CONFIG.receptionLocation}
  Time:       ${EMAIL_CONFIG.receptionTime}
  Dress Code: Cocktail attire

`;
  }

  if (data.song && data.song !== 'N/A') {
    emailText += `--------------------------------------------

SONG REQUEST
  We'll do our best to play: ${data.song}

`;
  }

  if (data.message && data.message !== 'N/A') {
    emailText += `--------------------------------------------

YOUR MESSAGE
  "${data.message}"

  Thank you for your lovely words!

`;
  }

  emailText += `
--------------------------------------------

We can't wait to celebrate with you!

If you need to make any changes to your RSVP,
please contact us at ${EMAIL_CONFIG.contactEmail}.

With love,
Shawn & Wendy

--------------------------------------------
This is an automated confirmation email.
`;

  return emailText;
}

/**
 * Test function specifically for email sending
 * Run this to test if email confirmation works
 */
function testEmail() {
  // Test data - CHANGE THE EMAIL TO YOUR OWN!
  const testData = {
    timestamp: new Date().toISOString(),
    fullName: 'Test User',
    email: 'shawntwj12@gmail.com', // CHANGE THIS TO YOUR EMAIL
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
  };

  Logger.log('Testing email to: ' + testData.email);

  const result = sendConfirmationEmail(testData);

  if (result) {
    Logger.log('Email sent successfully! Check your inbox at: ' + testData.email);
  } else {
    Logger.log('Email failed to send. Check the logs above for details.');
  }
}

// Test function - you can run this to verify the script works
function test() {
  const testData = {
    postData: {
      contents: JSON.stringify({
        timestamp: new Date().toISOString(),
        fullName: 'Test User',
        email: 'test@example.com',
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
      'Timestamp', 'Full Name', 'Email', 'Phone', 'Friend Of', 'Has Plus One',
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
    'test@example.com',
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