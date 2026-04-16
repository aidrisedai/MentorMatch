import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';

interface MeetingDetails {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: { email: string; displayName?: string }[];
}

class GoogleMeetService {
  private calendar: any;
  private isConfigured: boolean = false;
  private authMode: 'oauth2' | 'service-account' | 'none' = 'none';

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      // Priority 1: OAuth2 with refresh token (works with any Google account)
      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

      if (clientId && clientSecret && refreshToken) {
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        this.isConfigured = true;
        this.authMode = 'oauth2';
        console.log('Google Meet: Configured with OAuth2 (refresh token)');
        return;
      }

      // Priority 2: Service account JSON credentials (requires Google Workspace)
      const credentials = process.env.GOOGLE_CREDENTIALS;
      if (credentials) {
        const parsedCredentials = JSON.parse(credentials);
        const auth = new google.auth.GoogleAuth({
          credentials: parsedCredentials,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        this.calendar = google.calendar({ version: 'v3', auth });
        this.isConfigured = true;
        this.authMode = 'service-account';
        console.log('Google Meet: Configured with service account (JSON)');
        return;
      }

      // Priority 3: Separate service account credentials
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (clientEmail && privateKey) {
        const auth = new google.auth.JWT({
          email: clientEmail,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        this.calendar = google.calendar({ version: 'v3', auth });
        this.isConfigured = true;
        this.authMode = 'service-account';
        console.log('Google Meet: Configured with service account (JWT)');
        return;
      }

      console.log('Google Meet: No credentials configured, using Jitsi fallback mode');
      this.isConfigured = false;
    } catch (error) {
      console.error('Failed to initialize Google Meet service:', error);
      this.isConfigured = false;
    }
  }

  async createMeeting(details: MeetingDetails): Promise<{ meetLink: string; eventId: string } | null> {
    if (!this.isConfigured) {
      return this.createFallbackMeeting();
    }

    try {
      const event = {
        summary: details.summary,
        description: details.description,
        start: {
          dateTime: details.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: details.endTime.toISOString(),
          timeZone: 'UTC',
        },
        attendees: details.attendees.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: 'needsAction',
        })),
        conferenceData: {
          createRequest: {
            requestId: uuidv4(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendNotifications: true,
        sendUpdates: 'all',
      });

      const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;

      if (meetLink) {
        console.log(`Google Meet link created: ${meetLink}`);
        return {
          meetLink,
          eventId: response.data.id,
        };
      }

      console.warn('Calendar event created but no Meet link returned, using fallback');
      return this.createFallbackMeeting();
    } catch (error: any) {
      console.error('Failed to create Google Meet:', error.message || error);
      return this.createFallbackMeeting();
    }
  }

  async updateMeeting(eventId: string, details: Partial<MeetingDetails>): Promise<boolean> {
    if (!this.isConfigured || !eventId) {
      return false;
    }

    try {
      const event: any = {};

      if (details.summary) event.summary = details.summary;
      if (details.description) event.description = details.description;
      if (details.startTime) {
        event.start = {
          dateTime: details.startTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (details.endTime) {
        event.end = {
          dateTime: details.endTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (details.attendees) {
        event.attendees = details.attendees.map(a => ({
          email: a.email,
          displayName: a.displayName,
        }));
      }

      await this.calendar.events.patch({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId,
        resource: event,
        sendNotifications: true,
        sendUpdates: 'all',
      });

      return true;
    } catch (error) {
      console.error('Failed to update Google Meet:', error);
      return false;
    }
  }

  async cancelMeeting(eventId: string): Promise<boolean> {
    if (!this.isConfigured || !eventId) {
      return false;
    }

    try {
      await this.calendar.events.delete({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId: eventId,
        sendNotifications: true,
        sendUpdates: 'all',
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel Google Meet:', error);
      return false;
    }
  }

  private createFallbackMeeting(): { meetLink: string; eventId: string } {
    const roomId = `mentormatch-${uuidv4().replace(/-/g, '')}`;
    const fallbackLink = `https://meet.jit.si/${roomId}`;

    console.log('Using Jitsi fallback video link:', fallbackLink);

    return {
      meetLink: fallbackLink,
      eventId: roomId,
    };
  }

  generateInstantMeetLink(): string {
    const roomId = `mentormatch-${uuidv4().replace(/-/g, '')}`;
    return `https://meet.jit.si/${roomId}`;
  }
}

export const googleMeetService = new GoogleMeetService();

export async function createGoogleMeetLink(
  mentorName: string,
  menteeName: string,
  mentorEmail: string,
  menteeEmail: string,
  serviceName: string,
  scheduledAt: Date,
  duration: number = 30
): Promise<{ meetLink: string; eventId: string | null }> {
  const endTime = new Date(scheduledAt);
  endTime.setMinutes(endTime.getMinutes() + duration);

  const meetingDetails: MeetingDetails = {
    summary: `${serviceName} - ${mentorName} & ${menteeName}`,
    description: `MentorMatch Session\n\nMentor: ${mentorName}\nMentee: ${menteeName}\n\nThis is your scheduled mentorship session. Join the Google Meet link at the scheduled time.`,
    startTime: scheduledAt,
    endTime: endTime,
    attendees: [
      { email: mentorEmail, displayName: mentorName },
      { email: menteeEmail, displayName: menteeName },
    ],
  };

  const result = await googleMeetService.createMeeting(meetingDetails);

  if (result) {
    return result;
  }

  return {
    meetLink: googleMeetService.generateInstantMeetLink(),
    eventId: null,
  };
}

export async function updateGoogleMeetEvent(
  eventId: string,
  updates: Partial<MeetingDetails>
): Promise<boolean> {
  return googleMeetService.updateMeeting(eventId, updates);
}

export async function cancelGoogleMeetEvent(eventId: string): Promise<boolean> {
  return googleMeetService.cancelMeeting(eventId);
}
