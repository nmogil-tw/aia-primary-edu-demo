const twilio = require('twilio');

/*
Example usage:
Headers:
  x-identity: phone:+1234567890 (or) whatsapp:+1234567890

Request body:
{
  "message": "Your message text here"
}

Successful Response:
{
  "status": 200,
  "message": "SMS sent successfully",
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
*/

// Helper function to parse identity header
function parseIdentityHeader(identityHeader) {
  if (!identityHeader) {
    return { error: 'Missing x-identity header. Provide email:<email> or phone:<phone>.' };
  }

  let queryField, queryValue;
  if (identityHeader.startsWith('email:')) {
    queryField = 'email';
    queryValue = identityHeader.replace('email:', '').trim();
  } else if (identityHeader.startsWith('phone:')) {
    queryField = 'phone';
    queryValue = identityHeader.replace('phone:', '').trim();
  } else if (identityHeader.startsWith('whatsapp:')) {
    queryField = 'phone';
    queryValue = identityHeader.replace('whatsapp:', '').trim();
  } else {
    return { error: 'Invalid x-identity format. Use "email:<email>" or "phone:<phone>".' };
  }

  return { queryField, queryValue };
}

exports.handler = async function (context, event, callback) {
  try {
    // Validate Twilio configuration
    if (!context.TWILIO_ACCOUNT_SID || !context.TWILIO_AUTH_TOKEN || !context.TWILIO_PHONE_NUMBER) {
      return callback(null, {
        status: 500,
        message: 'Twilio configuration error. Please check environment variables.',
      });
    }

    // Extract and validate identity
    const identityHeader = event.request?.headers?.["x-identity"] || event["x-identity"];
    const identityResult = parseIdentityHeader(identityHeader);
    if (identityResult.error) {
      return callback(null, {
        status: 400,
        message: identityResult.error,
      });
    }

    const { queryField, queryValue } = identityResult;

    // Extract and validate request body
    const message = event.request?.body?.message || event.message;

    if (!message) {
      return callback(null, {
        status: 400,
        message: 'Missing required field: message.',
      });
    }

    // If identity is not a phone number, we can't send SMS
    if (queryField !== 'phone') {
      return callback(null, {
        status: 400,
        message: 'SMS can only be sent to phone numbers. Please provide a phone number in x-identity.',
      });
    }

    // Format phone number for Twilio (ensure E.164 format)
    const to = queryValue.startsWith('+') ? queryValue : `+${queryValue}`;

    // Validate phone number format (basic check)
    if (!/^\+\d{10,15}$/.test(to)) {
      return callback(null, {
        status: 400,
        message: 'Invalid phone number format. Please use E.164 format (e.g., +1234567890).',
      });
    }

    console.log(`Sending SMS to: ${to}`);

    // Initialize Twilio client
    const client = twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);

    // Send SMS
    const result = await client.messages.create({
      body: message,
      to: to,
      from: context.TWILIO_PHONE_NUMBER,
    });

    console.log(`SMS sent successfully. SID: ${result.sid}`);
    return callback(null, {
      status: 200,
      message: 'SMS sent successfully',
      sid: result.sid,
    });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return callback(null, {
      status: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}; 