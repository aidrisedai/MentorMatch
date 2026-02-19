import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { db } from './db';
import { users, bookings } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { refreshGoogleToken } from './googleAuth';

export const createGoogleMeetEvent = async (
  mentorId: number,
  menteeId: number,
  bookingId: number,
  scheduledAt: Date,
  duration: number,
  serviceName: string
) => {
  try {
    // Get mentor's Google credentials
    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, mentorId))
      .limit(1);

    if (!mentor.googleAccessToken || !mentor.googleRefreshToken) {
      throw new Error('Mentor has not connected Google account');
    }

    // Get mentee's email
    const [mentee] = await db
      .select()
      .from(users)
      .where(eq(users.id, menteeId))
      .limit(1);

    // Check if token is expired and refresh if needed
    if (mentor.googleTokenExpiresAt && mentor.googleTokenExpiresAt < new Date()) {
      await refreshGoogleToken(mentorId);
      // Re-fetch mentor with new token
      const [refreshedMentor] = await db
        .select()
        .from(users)
        .where(eq(users.id, mentorId))
        .limit(1);
      mentor.googleAccessToken = refreshedMentor.googleAccessToken;
    }

    // Create OAuth2 client with mentor's credentials
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: mentor.googleAccessToken,
      refresh_token: mentor.googleRefreshToken,
    });

    // Create calendar instance
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculate end time
    const endTime = new Date(scheduledAt);
    endTime.setMinutes(endTime.getMinutes() + duration);

    // Create event with Google Meet
    const event = {
      summary: `MentorMatch Session: ${serviceName}`,
      description: `Mentorship session between ${mentor.firstName} ${mentor.lastName} and ${mentee.firstName} ${mentee.lastName}`,
      start: {
        dateTime: scheduledAt.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        { email: mentor.email },
        { email: mentee.email },
      ],
      conferenceData: {
        createRequest: {
          requestId: `mentormatch-${bookingId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    // Extract Google Meet link
    const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;
    const eventId = response.data.id;

    if (!meetLink) {
      throw new Error('Failed to create Google Meet link');
    }

    // Update booking with Meet link and event ID
    await db
      .update(bookings)
      .set({
        meetingLink: meetLink,
        googleEventId: eventId,
      })
      .where(eq(bookings.id, bookingId));

    return {
      meetLink,
      eventId,
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error('Error creating Google Meet event:', error);
    throw error;
  }
};

export const updateGoogleMeetEvent = async (
  bookingId: number,
  updates: {
    scheduledAt?: Date;
    duration?: number;
    status?: 'confirmed' | 'cancelled';
  }
) => {
  try {
    // Get booking details
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking.googleEventId) {
      throw new Error('No Google event associated with this booking');
    }

    // Get mentor's Google credentials
    const [mentor] = await db
      .select()
      .from(users)
      .where(eq(users.id, booking.mentorId))
      .limit(1);

    if (!mentor.googleAccessToken || !mentor.googleRefreshToken) {
      throw new Error('Mentor has not connected Google account');
    }

    // Check if token is expired and refresh if needed
    if (mentor.googleTokenExpiresAt && mentor.googleTokenExpiresAt < new Date()) {
      await refreshGoogleToken(booking.mentorId);
      // Re-fetch mentor with new token
      const [refreshedMentor] = await db
        .select()
        .from(users)
        .where(eq(users.id, booking.mentorId))
        .limit(1);
      mentor.googleAccessToken = refreshedMentor.googleAccessToken;
    }

    // Create OAuth2 client
    const oauth2Client = new OAuth2Client();
    oauth2Client.setCredentials({
      access_token: mentor.googleAccessToken,
      refresh_token: mentor.googleRefreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (updates.status === 'cancelled') {
      // Cancel the event
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: booking.googleEventId,
        sendUpdates: 'all',
      });

      // Clear meeting link from booking
      await db
        .update(bookings)
        .set({
          meetingLink: null,
          googleEventId: null,
        })
        .where(eq(bookings.id, bookingId));
    } else if (updates.scheduledAt || updates.duration) {
      // Update event time
      const startTime = updates.scheduledAt || booking.scheduledAt;
      const duration = updates.duration || booking.duration;
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      await calendar.events.patch({
        calendarId: 'primary',
        eventId: booking.googleEventId,
        requestBody: {
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC',
          },
        },
        sendUpdates: 'all',
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating Google Meet event:', error);
    throw error;
  }
};

export const deleteGoogleMeetEvent = async (bookingId: number) => {
  return updateGoogleMeetEvent(bookingId, { status: 'cancelled' });
};