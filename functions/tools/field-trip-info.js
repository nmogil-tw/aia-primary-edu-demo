const Airtable = require('airtable');

/*
Example usage:
Headers:
  x-identity: email:parent@example.com (or) phone:+1234567890
  x-trip-id: tripXXXXXX (optional - if you want to look up a specific trip)

Successful Response:
{
  "status": 200,
  "field_trips": [
    {
      "trip_id": "tripXXXXXX",
      "name": "Museum Visit",
      "date": "2024-04-15",
      "location": "Science Museum",
      "grade_levels": "3-5",
      "description": "Educational visit to the Science Museum"
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

    // Extract query parameters
    const tripId = event.request?.headers?.["x-trip-id"] || event["x-trip-id"] || event.tripId;

    // If trip ID is provided, just look up that specific trip
    if (tripId) {
      const tripRecords = await base('field_trips')
        .select({
          filterByFormula: `{trip_id} = '${tripId}'`,
          maxRecords: 1
        })
        .firstPage();

      if (!tripRecords || tripRecords.length === 0) {
        return callback(null, {
          status: 404,
          message: 'Field trip not found.',
        });
      }

      return callback(null, {
        status: 200,
        field_trips: tripRecords.map(record => record.fields),
      });
    }

    // Otherwise, find the guardian's students and their grades
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

    // Get all students for this guardian
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

    // Get unique grades from all students
    const grades = [...new Set(studentRecords.map(record => record.fields.grade))];

    // Build filter formula for all relevant grades
    const gradeFilters = grades.map(grade => `
      AND(
        VALUE(LEFT(grade_levels, FIND("-", grade_levels) - 1)) <= ${grade},
        VALUE(RIGHT(grade_levels, LEN(grade_levels) - FIND("-", grade_levels))) >= ${grade}
      )
    `).join(',');

    const filterFormula = `OR(${gradeFilters})`;

    console.log(`Looking up field trips for grades: ${grades.join(', ')}`);

    // Query field trips
    const tripRecords = await base('field_trips')
      .select({
        filterByFormula: filterFormula,
      })
      .firstPage();

    if (!tripRecords || tripRecords.length === 0) {
      console.log('No field trips found');
      return callback(null, {
        status: 404,
        message: 'No upcoming field trips found for your students\' grades.',
      });
    }

    console.log(`Found ${tripRecords.length} field trips`);
    return callback(null, {
      status: 200,
      field_trips: tripRecords.map(record => record.fields),
    });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return callback(null, {
      status: 500,
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
}; 