# Google Meet Integration Setup

MentorMatch supports automatic Google Meet link generation for mentorship sessions. This guide will help you set up the integration.

## Features

- Automatic Google Meet link creation when bookings are made
- Links included in confirmation emails
- Automatic calendar invites with reminders
- Rescheduling updates the Google Calendar event
- Cancellation removes the calendar event

## Setup Options

### Option 1: Without Google API (Fallback Mode)

If you don't configure Google API credentials, the system will:
- Generate joinable fallback video links (via Jitsi)
- Still allow video calls through the built-in WebRTC system
- Not create actual calendar events

This is suitable for testing and development.

### Option 2: With Google API (Full Integration)

For production use with real Google Meet links and calendar integration:

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

#### Step 2: Create Service Account Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: "MentorMatch Service Account"
   - Description: "Service account for Google Meet integration"
4. Click "Create and Continue"
5. Grant the role "Google Calendar API > Calendar Editor"
6. Click "Done"

#### Step 3: Generate Private Key

1. Click on the created service account
2. Go to the "Keys" tab
3. Click "Add Key" > "Create New Key"
4. Choose "JSON" format
5. Download the key file (keep it secure!)

#### Step 4: Configure Environment Variables

Add the following to your `.env` file:

```bash
# Option A: Full JSON credentials (easier)
GOOGLE_CREDENTIALS='paste_entire_json_content_here'

# Option B: Separate fields
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional: Specify calendar ID (defaults to 'primary')
GOOGLE_CALENDAR_ID=primary
```

#### Step 5: Share Calendar (Optional)

If you want to use a specific calendar:
1. Create or select a Google Calendar
2. Share it with the service account email
3. Grant "Make changes to events" permission
4. Use the calendar ID in `GOOGLE_CALENDAR_ID`

## Testing the Integration

1. Create a test booking through the application
2. Check if:
   - A Google Meet link appears in the booking
   - The link is included in confirmation emails
   - A calendar event is created (if using full integration)
   - The Meet link opens Google Meet when clicked

## Troubleshooting

### "No credentials configured" message
- Ensure environment variables are set correctly
- Restart the server after adding credentials

### Meet links not working
- Verify the service account has Calendar API access
- Check that the calendar is shared with the service account
- Review server logs for specific error messages

### Calendar events not created
- Confirm the service account has edit permissions
- Verify the GOOGLE_CALENDAR_ID is correct
- Check API quotas in Google Cloud Console

## Security Notes

- Never commit credentials to version control
- Keep service account keys secure
- Rotate keys periodically
- Use environment variables for all sensitive data
- Consider using Google Secret Manager for production

## API Quotas

Google Calendar API has the following default quotas:
- 1,000,000 queries per day
- 500 queries per 100 seconds per user

These limits are typically sufficient for most applications.

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Test with the fallback mode first
4. Ensure Google APIs are enabled in your project
