const Airtable = require('airtable');

/*
Example usage:
Headers:
  x-identity: email:parent@example.com (or) phone:+1234567890
  x-start-date: 2024-01-01 (optional)
  x-end-date: 2024-12-31 (optional)

Successful Response:
{
  "status": 200,
  "absences": [
    {
      "date": "2024-03-15",
      "reason": "Doctor appointment",
      "status": "approved",
      "student_id": "recXXXXXXXXXXXXXX"
    }
  ],
  "total": 1
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

    // Extract optional date range parameters
    const startDate = event.request?.headers?.["x-start-date"] || event["x-start-date"] || event.startDate;
    const endDate = event.request?.headers?.["x-end-date"] || event["x-end-date"] || event.endDate;

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

    // Then find all students for this guardian
    const studentRecords = await base('students')
      .select({
        filterByFormula: `{guardian_id} = '${guardianId}'`,
      })
      .firstPage();

    if (!studentRecords || studentRecords.length === 0) {
      console.log(`No students found for guardian with ${queryField}: ${queryValue}`);
      return callback(null, {
        status: 404,
        message: 'No students found for this guardian.',
      });
    }

    // Get student IDs
    const studentIds = studentRecords.map(record => record.fields.student_id);

    // Build the filter formula for absences
    let dateFilter = '';
    if (startDate && endDate) {
      // Validate date formats (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return callback(null, {
          status: 400,
          message: 'Invalid date format. Please use YYYY-MM-DD format.',
        });
      }
      dateFilter = `,
        {date} >= '${startDate}',
        {date} <= '${endDate}'`;
    }

    const studentFilter = studentIds.map(id => `{student_id} = '${id}'`).join(',');
    const filterFormula = `AND(
      OR(${studentFilter})${dateFilter}
    )`;

    console.log(`Looking up absences for students of guardian with ${queryField}: ${queryValue}`);

    // Query absences
    const absenceRecords = await base('absences')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'date', direction: 'desc' }]
      })
      .firstPage();

    if (!absenceRecords || absenceRecords.length === 0) {
      console.log(`No absences found for students of guardian with ${queryField}: ${queryValue}`);
      return callback(null, {
        status: 404,
        message: 'No absence records found.',
      });
    }

    console.log(`Found ${absenceRecords.length} absence records`);
    return callback(null, {
      status: 200,
      absences: absenceRecords.map(record => record.fields),
      total: absenceRecords.length
    });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return callback(null, {
      status: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}; 