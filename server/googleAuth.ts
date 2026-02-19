import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

export const oauth2Client = new OAuth2Client(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

export const getAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });
};

export const getGoogleUserInfo = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2'
  });

  const { data } = await oauth2.userinfo.get();
  return { userInfo: data, tokens };
};

export const createOrUpdateGoogleUser = async (
  googleUserInfo: any,
  tokens: any,
  role: 'mentor' | 'mentee'
) => {
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.googleId, googleUserInfo.id))
    .limit(1);

  if (existingUser.length > 0) {
    // Update tokens
    await db
      .update(users)
      .set({
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || existingUser[0].googleRefreshToken,
        googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      })
      .where(eq(users.id, existingUser[0].id));

    return existingUser[0];
  } else {
    // Check if user exists with same email
    const existingEmailUser = await db
      .select()
      .from(users)
      .where(eq(users.email, googleUserInfo.email))
      .limit(1);

    if (existingEmailUser.length > 0) {
      // Link Google account to existing user
      await db
        .update(users)
        .set({
          googleId: googleUserInfo.id,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          avatar: existingEmailUser[0].avatar || googleUserInfo.picture,
        })
        .where(eq(users.id, existingEmailUser[0].id));

      return existingEmailUser[0];
    } else {
      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          email: googleUserInfo.email,
          googleId: googleUserInfo.id,
          firstName: googleUserInfo.given_name || '',
          lastName: googleUserInfo.family_name || '',
          avatar: googleUserInfo.picture,
          role,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          emailVerified: true,
        })
        .returning();

      return newUser;
    }
  }
};

export const generateJWT = (user: any) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyJWT = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

export const refreshGoogleToken = async (userId: number) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]?.googleRefreshToken) {
    throw new Error('No refresh token available');
  }

  oauth2Client.setCredentials({
    refresh_token: user[0].googleRefreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  await db
    .update(users)
    .set({
      googleAccessToken: credentials.access_token,
      googleTokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
    })
    .where(eq(users.id, userId));

  return credentials;
};