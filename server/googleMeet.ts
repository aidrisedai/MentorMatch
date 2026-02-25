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
  private auth: any;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      const credentials = process.env.GOOGLE_CREDENTIALS;
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (credentials) {
        const parsedCredentials = JSON.parse(credentials);
        this.auth = new google.auth.GoogleAuth({
          credentials: parsedCredentials,
          scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        this.isConfigured = true;
      } else if (clientEmail && privateKey) {
        this.auth = new google.auth.JWT(
          clientEmail,
          undefined,
          privateKey,
          ['https://www.googleapis.com/auth/calendar']
        );
        this.isConfigured = true;
      } else {
        console.log('Google Meet: No credentials configured, using fallback mode');
        this.isConfigured = false;
      }

      if (this.isConfigured) {
        this.calendar = google.calendar({ version: 'v3', auth: this.auth });
      }
    } catch (error) {
      console.error('Failed to initialize Google Meet service:', error);
      this.isConfigured = false;
    }
  }

  async createMeeting(details: MeetingDetails): Promise<{ meetLink: string; eventId: string } | null> {
    if (!this.isConfigured) {
      return this.createFallbackMeeting(details);
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
      });

      const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;
      
      if (meetLink) {
        return {
          meetLink,
          eventId: response.data.id,
        };
      }

      return this.createFallbackMeeting(details);
    } catch (error) {
      console.error('Failed to create Google Meet:', error);
      return this.createFallbackMeeting(details);
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
      });
      return true;
    } catch (error) {
      console.error('Failed to cancel Google Meet:', error);
      return false;
    }
  }

  private createFallbackMeeting(details: MeetingDetails): { meetLink: string; eventId: string } {
    const meetingId = uuidv4().substring(0, 12);
    const fallbackLink = `https://meet.google.com/${meetingId}`;
    
    console.log('Created fallback meeting link:', fallbackLink);
    console.log('Note: This is a placeholder. Configure Google API credentials for real Meet links.');
    
    return {
      meetLink: fallbackLink,
      eventId: meetingId,
    };
  }

  generateInstantMeetLink(): string {
    const meetingCode = this.generateMeetingCode();
    return `https://meet.google.com/${meetingCode}`;
  }

  private generateMeetingCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let code = '';
    
    for (let i = 0; i < 3; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    code += '-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    code += '-';
    for (let i = 0; i < 3; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    
    return code;
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