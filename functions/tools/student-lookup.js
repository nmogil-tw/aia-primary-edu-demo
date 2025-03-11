const Airtable = require('airtable');

/*
Example usage:
Headers:
  x-identity: email:parent@example.com (or) phone:+1234567890

Successful Response:
{
  "status": 200,
  "students": [
    {
      "name": "Jane Doe",
      "grade": "5",
      "class": "5A",
      "student_id": "recXXXXXXXXXXXXXX"
    }
  ]
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
    console.log('Function triggered with event:', JSON.stringify(event));
    
    // Validate Airtable configuration
    if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
      console.log('Missing Airtable configuration:', {
        hasApiKey: !!context.AIRTABLE_API_KEY,
        hasBaseId: !!context.AIRTABLE_BASE_ID
      });
      return callback(null, {
        status: 500,
        message: 'Airtable configuration error. Please check environment variables.',
      });
    }

    // Airtable setup
    const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);

    // Extract and validate identity
    const identityHeader = event.request?.headers?.["x-identity"] || event["x-identity"];
    console.log('Received identity header:', identityHeader);
    
    const identityResult = parseIdentityHeader(identityHeader);
    if (identityResult.error) {
      console.log('Identity parsing error:', identityResult.error);
      return callback(null, {
        status: 400,
        message: identityResult.error,
      });
    }

    const { queryField, queryValue } = identityResult;
    console.log(`Looking up students for guardian with ${queryField}: ${queryValue}`);

    // First find the guardian
    const guardianFilter = `{${queryField}} = '${queryValue}'`;
    console.log('Guardian lookup filter:', guardianFilter);
    
    const guardianRecords = await base('guardians')
      .select({
        filterByFormula: guardianFilter,
        maxRecords: 1
      })
      .firstPage();

    console.log('Guardian lookup results:', {
      found: !!guardianRecords && guardianRecords.length > 0,
      count: guardianRecords?.length || 0
    });

    if (!guardianRecords || guardianRecords.length === 0) {
      console.log(`No guardian found with ${queryField}: ${queryValue}`);
      return callback(null, {
        status: 404,
        message: 'Guardian not found.',
      });
    }

    const guardianId = guardianRecords[0].fields.guardian_id;
    console.log('Found guardian with ID:', guardianId);

    // Then find all students for this guardian
    const studentFilter = `{guardian_id} = '${guardianId}'`;
    console.log('Student lookup filter:', studentFilter);
    
    const studentRecords = await base('students')
      .select({
        filterByFormula: studentFilter,
      })
      .firstPage();

    console.log('Student lookup results:', {
      found: !!studentRecords && studentRecords.length > 0,
      count: studentRecords?.length || 0
    });

    if (!studentRecords || studentRecords.length === 0) {
      console.log(`No students found for guardian with ${queryField}: ${queryValue}`);
      return callback(null, {
        status: 404,
        message: 'No students found for this guardian.',
      });
    }

    console.log(`Found ${studentRecords.length} students for guardian with ${queryField}: ${queryValue}`);
    return callback(null, {
      status: 200,
      students: studentRecords.map(record => record.fields),
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return callback(null, {
      status: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}; 