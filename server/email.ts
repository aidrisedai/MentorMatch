import { Resend } from 'resend';

const FROM_EMAIL = "onboarding@resend.dev";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  return new Resend(apiKey);
}

export async function sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
  try {
    const client = getResendClient();
    console.log(`Sending welcome email from ${FROM_EMAIL} to ${email}`);
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to MentorMatch!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">Welcome to MentorMatch, ${firstName}!</h1>
          <p>Thank you for joining MentorMatch - the platform connecting students with real-world professionals for 1-on-1 guidance.</p>
          <p>You're now ready to:</p>
          <ul>
            <li>Browse mentor profiles</li>
            <li>Book mentorship sessions</li>
            <li>Connect with industry professionals</li>
          </ul>
          <p>Start exploring mentors today and take the first step toward your future career!</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The MentorMatch Team</p>
        </div>
      `,
    });
    console.log(`Welcome email result:`, JSON.stringify(result));
    if (result.error) {
      console.error("Resend error:", result.error);
      return false;
    }
    console.log(`Welcome email sent to ${email}, id: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return false;
  }
}

export async function sendBookingConfirmationEmail(
  menteeEmail: string,
  menteeName: string,
  mentorEmail: string,
  mentorName: string,
  serviceName: string,
  scheduledAt: Date,
  meetLink?: string
): Promise<boolean> {
  const formattedDate = scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    const client = getResendClient();
    console.log(`Sending booking emails from ${FROM_EMAIL} to ${menteeEmail} and ${mentorEmail}`);
    
    const menteeResult = await client.emails.send({
      from: FROM_EMAIL,
      to: menteeEmail,
      subject: `Booking Confirmed: ${serviceName} with ${mentorName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">Booking Confirmed!</h1>
          <p>Hi ${menteeName},</p>
          <p>Your mentorship session has been successfully booked!</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Mentor:</strong> ${mentorName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> 30 minutes</p>
            ${meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #0891b2; text-decoration: none;">${meetLink}</a></p>` : ''}
          </div>
          <p>You'll receive a reminder email before your session begins.</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The MentorMatch Team</p>
        </div>
      `,
    });
    console.log(`Mentee email result:`, JSON.stringify(menteeResult));
    if (menteeResult.error) {
      console.error("Resend error (mentee):", menteeResult.error);
    }

    const mentorResult = await client.emails.send({
      from: FROM_EMAIL,
      to: mentorEmail,
      subject: `New Booking: ${serviceName} with ${menteeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">New Booking!</h1>
          <p>Hi ${mentorName},</p>
          <p>You have a new mentorship session booked!</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Student:</strong> ${menteeName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> 30 minutes</p>
            ${meetLink ? `<p><strong>Meeting Link:</strong> <a href="${meetLink}" style="color: #0891b2; text-decoration: none;">${meetLink}</a></p>` : ''}
          </div>
          <p>You'll receive a reminder email before the session begins.</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The MentorMatch Team</p>
        </div>
      `,
    });
    console.log(`Mentor email result:`, JSON.stringify(mentorResult));
    if (mentorResult.error) {
      console.error("Resend error (mentor):", mentorResult.error);
    }

    console.log(`Booking confirmation emails sent to ${menteeEmail} and ${mentorEmail}`);
    return !menteeResult.error && !mentorResult.error;
  } catch (error) {
    console.error("Failed to send booking confirmation:", error);
    return false;
  }
}

export async function sendVerificationEmail(
  email: string, 
  firstName: string, 
  verificationToken: string
): Promise<boolean> {
  try {
    const client = getResendClient();
    const verifyUrl = `${process.env.REPLIT_DEV_DOMAIN ? 'https://' + process.env.REPLIT_DEV_DOMAIN : 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
    
    console.log(`Sending verification email from ${FROM_EMAIL} to ${email}`);
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your MentorMatch account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">Verify Your Email</h1>
          <p>Hi ${firstName},</p>
          <p>Thank you for signing up for MentorMatch! Please verify your email address to complete your registration.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${verifyUrl}" style="background: #0891b2; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="color: #0891b2; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The MentorMatch Team</p>
        </div>
      `,
    });
    console.log(`Verification email result:`, JSON.stringify(result));
    if (result.error) {
      console.error("Resend error:", result.error);
      return false;
    }
    console.log(`Verification email sent to ${email}, id: ${result.data?.id}`);
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return false;
  }
}

export async function sendMeetingReminderEmail(
  email: string,
  name: string,
  otherPartyName: string,
  serviceName: string,
  scheduledAt: Date,
  isMentor: boolean
): Promise<boolean> {
  const formattedTime = scheduledAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  try {
    const client = getResendClient();
    const result = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Reminder: Your session starts soon!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0891b2;">Your Session Starts Soon!</h1>
          <p>Hi ${name},</p>
          <p>This is a friendly reminder that your mentorship session is starting soon.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>${isMentor ? "Student" : "Mentor"}:</strong> ${otherPartyName}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> 30 minutes</p>
          </div>
          <p>Make sure to log in to MentorMatch to join the video call.</p>
          <p style="margin-top: 30px; color: #666;">Best regards,<br>The MentorMatch Team</p>
        </div>
      `,
    });
    if (result.error) {
      console.error("Resend error (reminder):", result.error);
      return false;
    }
    console.log(`Meeting reminder sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Failed to send meeting reminder:", error);
    return false;
  }
}
