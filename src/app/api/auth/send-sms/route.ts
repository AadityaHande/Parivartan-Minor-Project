import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/twilio';

/**
 * POST /api/auth/send-sms
 * Server-side endpoint to send SMS (credentials are secure on server)
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, message } = await request.json();

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    const result = await sendSMS({
      phoneNumber,
      message,
    });

    if (!result.success) {
      console.warn('SMS sending warning:', result.error);
      // Don't fail the request, just log the warning
      return NextResponse.json(
        {
          success: true,
          warning: 'Account created but SMS could not be sent',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        messageSid: result.messageSid,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      {
        success: true,
        warning: 'Account created but SMS could not be sent',
      },
      { status: 200 }
    );
  }
}
