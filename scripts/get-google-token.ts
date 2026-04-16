/**
 * Google OAuth2 Refresh Token Helper
 *
 * This script helps you obtain a refresh token for Google Calendar API.
 * Run it once to get the token, then add it to your .env file.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com
 *   2. Create a project (or use existing)
 *   3. Enable "Google Calendar API" in APIs & Services > Library
 *   4. Go to APIs & Services > Credentials > Create Credentials > OAuth 2.0 Client ID
 *   5. Application type: "Web application"
 *   6. Add "http://localhost:3333" as an Authorized redirect URI
 *   7. Copy the Client ID and Client Secret
 *
 * Usage:
 *   GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy npx tsx scripts/get-google-token.ts
 */

import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3333';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing environment variables!\n');
  console.error('Run this script with:');
  console.error('  GOOGLE_OAUTH_CLIENT_ID=your_id GOOGLE_OAUTH_CLIENT_SECRET=your_secret npx tsx scripts/get-google-token.ts\n');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar'],
});

console.log('\n🔗 Open this URL in your browser to authorize:\n');
console.log(authUrl);
console.log('\n⏳ Waiting for authorization...\n');

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/?')) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:3333`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('Missing authorization code');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; text-align: center;">
          <h1 style="color: #0891b2;">✅ Authorization Successful!</h1>
          <p>You can close this tab and check your terminal.</p>
        </body>
      </html>
    `);

    console.log('✅ Authorization successful!\n');
    console.log('Add these to your .env file:\n');
    console.log(`GOOGLE_OAUTH_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('Failed to get token:', error);
    res.writeHead(500);
    res.end('Failed to exchange authorization code');
    server.close();
    process.exit(1);
  }
});

server.listen(3333, () => {
  console.log('Listening on http://localhost:3333 for the OAuth callback...');
});
