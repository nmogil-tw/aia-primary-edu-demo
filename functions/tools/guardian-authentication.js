const Airtable = require('airtable');

/*
Example usage:
Headers:
  x-identity: email:parent@example.com (or) phone:+1234567890
  pin: "1234"

Successful Response:
{
  "status": 200,
  "guardian": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "parent@example.com",
    "phone": "+1234567890",
    "guardian_id": "G001"
  }
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
    // Validate Airtable configuration
    if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
      return callback(null, {
        status: 500,
        message: 'Airtable configuration error. Please check environment variables.',
      });
    }

    // Airtable setup
    const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);

    // Debug connection and table contents
    console.log('Airtable Config:', {
      baseId: context.AIRTABLE_BASE_ID,
      tableName: 'guardians'
    });

    // Try to list some records to verify connection
    try {
      const allRecords = await base('guardians').select({
        maxRecords: 3,
        view: 'Grid view'
      }).firstPage();
      
      console.log('First few records in table:', 
        JSON.stringify(allRecords.map(record => ({
          guardian_id: record.fields.guardian_id,
          fields: record.fields
        })), null, 2)
      );

      // Log field names from first record if available
      if (allRecords.length > 0) {
        console.log('Available fields:', Object.keys(allRecords[0].fields));
      }
    } catch (err) {
      console.error('Error accessing table:', err.message);
      return callback(null, {
        status: 500,
        message: 'Error accessing guardian records. Please verify table configuration.',
      });
    }

    // Extract and validate the identity and PIN
    const identityHeader = event.request?.headers?.["x-identity"] || event["x-identity"];
    console.log('Raw event:', JSON.stringify(event, null, 2));
    console.log('Raw headers:', JSON.stringify(event.request?.headers, null, 2));
    
    // Ensure PIN is treated as string and remove any quotes if they were included
    const rawPin = event.request?.headers?.["pin"] || event.pin;
    const pin = String(rawPin).replace(/^"|"$/g, '');  // Remove surrounding quotes if present
    
    console.log('Raw PIN received:', rawPin);
    console.log('Processed PIN:', pin);

    if (!pin) {
      return callback(null, {
        status: 400,
        message: 'Missing PIN. Provide it either in the "pin" header, query parameter, or request body.',
      });
    }

    const identityResult = parseIdentityHeader(identityHeader);
    if (identityResult.error) {
      return callback(null, {
        status: 400,
        message: identityResult.error,
      });
    }

    const { queryField, queryValue } = identityResult;
    console.log(`Authenticating guardian with ${queryField}: ${queryValue}`);
    console.log(`PIN provided: "${pin}" (type: ${typeof pin})`);

    // First check if we can find the record by email only
    console.log('Checking for record by email only...');
    const emailOnlyFormula = queryField === 'email' 
      ? `TRIM({${queryField}}) = '${queryValue}'`
      : `{${queryField}} = '${queryValue}'`;
      
    const emailOnlyRecords = await base('guardians')
      .select({
        filterByFormula: emailOnlyFormula
      })
      .firstPage();
    
    if (emailOnlyRecords && emailOnlyRecords.length > 0) {
      console.log('Found record by email. Record data:', JSON.stringify(emailOnlyRecords[0].fields, null, 2));
    } else {
      console.log('No record found with this email address');
    }

    const formula = queryField === 'email'
      ? `AND(TRIM({${queryField}}) = '${queryValue}', {pin} = '${pin}')`
      : `AND({${queryField}} = '${queryValue}', {pin} = '${pin}')`;
    console.log('Full authentication formula:', formula);

    // Query Airtable - handle pin as string since it's stored as string in Airtable
    const records = await base('guardians')
      .select({
        filterByFormula: formula,
        maxRecords: 1
      })
      .firstPage();

    if (!records || records.length === 0) {
      console.log(`Authentication failed for ${queryField}: ${queryValue}`);
      console.log('No matching records found in Airtable');
      return callback(null, {
        status: 401,
        message: 'Invalid credentials. Please check your identity and PIN.',
      });
    }

    // Format the response using the correct field names
    const guardian = {
      guardian_id: records[0].fields.guardian_id,
      first_name: records[0].fields.first_name,
      last_name: records[0].fields.last_name,
      email: records[0].fields.email,
      phone: records[0].fields.phone
    };

    console.log(`Guardian authenticated successfully for ${queryField}: ${queryValue}`);
    return callback(null, {
      status: 200,
      guardian: guardian,
    });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return callback(null, {
      status: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}; 