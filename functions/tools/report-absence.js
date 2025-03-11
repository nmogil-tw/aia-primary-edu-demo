const Airtable = require('airtable');

/*
Example usage:
Headers:
  x-identity: email:parent@example.com (or) phone:+1234567890

Request body:
{
  "student_name": "Jane Doe",
  "date": "2024-03-15",
  "reason": "Doctor appointment"
}

Successful Response:
{
  "status": 200,
  "absence": {
    "student_id": "recXXXXXXXXXXXXXX",
    "date": "2024-03-15",
    "reason": "Doctor appointment",
    "status": "pending",
    "reported_by": "parent@example.com"
  },
  "message": "Absence report submitted successfully."
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
    const student_name = event.request?.body?.student_name || event.student_name;
    const date = event.request?.body?.date || event.date;
    const reason = event.request?.body?.reason || event.reason;

    if (!student_name || !date || !reason) {
      return callback(null, {
        status: 400,
        message: 'Missing required fields. Please provide student_name, date, and reason.',
      });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return callback(null, {
        status: 400,
        message: 'Invalid date format. Please use YYYY-MM-DD format.',
      });
    }

    // First find the guardian
    const guardianRecords = await base('guardians')
      .select({
        filterByFormula: `{${queryField}} = '${queryValue}'`,
        maxRecords: 1
      })
      .firstPage();

    if (!guardianRecords || guardianRecords.length === 0) {
      console.log(`No guardian found with ${queryField}: ${queryValue}`);
      return callback(null, {
        status: 404,
        message: 'Guardian not found.',
      });
    }

    const guardianId = guardianRecords[0].fields.guardian_id;

    // Split student name into first and last name
    const [firstName, lastName] = student_name.split(' ');
    if (!firstName || !lastName) {
      return callback(null, {
        status: 400,
        message: 'Please provide both first and last name of the student.',
      });
    }

    // Find the student by name and guardian
    const studentRecords = await base('students')
      .select({
        filterByFormula: `AND(
          {guardian_id} = '${guardianId}',
          {first_name} = '${firstName}',
          {last_name} = '${lastName}'
        )`,
        maxRecords: 1
      })
      .firstPage();

    if (!studentRecords || studentRecords.length === 0) {
      console.log(`No student found with name ${student_name} for guardian with ${queryField}: ${queryValue}`);
      return callback(null, {
        status: 404,
        message: 'Student not found.',
      });
    }

    const studentId = studentRecords[0].fields.student_id;

    console.log(`Reporting absence for student: ${student_name}`);

    // Create absence record
    const records = await base('absences').create([
      {
        fields: {
          student_id: studentId,
          date,
          reason,
          reported_by: queryValue,
          status: 'pending'
        }
      }
    ]);

    if (!records || records.length === 0) {
      console.log('Failed to create absence record');
      return callback(null, {
        status: 500,
        message: 'Failed to create absence record.',
      });
    }

    console.log(`Successfully created absence record for student: ${student_name}`);
    return callback(null, {
      status: 200,
      absence: records[0].fields,
      message: 'Absence report submitted successfully.',
    });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return callback(null, {
      status: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}; 