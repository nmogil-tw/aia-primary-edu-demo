const Airtable = require('airtable');

/**
 * Schedule a conference with the school guidance counselor
 * @param {Object} context - The context from the Twilio Runtime
 * @param {Object} event - The event from the incoming request
 * @param {Function} callback - The callback function to handle the response
 * @param {string} event.student_name - Name of the student
 * @param {string} event.preferred_date - Preferred date for the conference (YYYY-MM-DD)
 * @param {string} event.preferred_time - Preferred time slot (e.g., "morning", "afternoon")
 * @param {string} event.reason - Brief reason for the conference
 * @returns {Object} - Response object with scheduling confirmation
 */
exports.handler = function(context, event, callback) {
  console.log('Starting counselor conference scheduling with event:', JSON.stringify(event));
  
  try {
    // Simple validation of required fields
    const requiredFields = ['student_name', 'preferred_date', 'preferred_time', 'reason'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields:', missingFields);
      return callback(null, {
        status: 400,
        body: {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        }
      });
    }
    
    console.log('All required fields present. Validating Airtable configuration...');

    // Validate Airtable configuration
    if (!context.AIRTABLE_API_KEY || !context.AIRTABLE_BASE_ID) {
      console.error('Missing Airtable configuration:', {
        hasApiKey: !!context.AIRTABLE_API_KEY,
        hasBaseId: !!context.AIRTABLE_BASE_ID
      });
      return callback(null, {
        status: 500,
        body: {
          success: false,
          message: 'Airtable configuration error. Please check environment variables.',
        }
      });
    }

    console.log('Airtable configuration valid. Creating appointment...');

    // Airtable setup
    const base = new Airtable({apiKey: context.AIRTABLE_API_KEY}).base(context.AIRTABLE_BASE_ID);

    // Create the conference appointment
    const appointment = {
      student_name: event.student_name,
      date: event.preferred_date,
      time_slot: event.preferred_time,
      reason: event.reason,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    console.log('Creating appointment with details:', JSON.stringify(appointment));

    // Create appointment record in Airtable
    base('counselor_appointments').create([
      { fields: appointment }
    ], (err, createdAppointment) => {
      if (err) {
        console.error('Failed to create appointment record:', err);
        return callback(null, {
          status: 500,
          body: {
            success: false,
            message: 'Failed to create appointment record'
          }
        });
      }

      if (!createdAppointment || createdAppointment.length === 0) {
        console.error('Failed to create appointment record - no record created');
        return callback(null, {
          status: 500,
          body: {
            success: false,
            message: 'Failed to create appointment record'
          }
        });
      }

      console.log('Appointment created successfully.');

      return callback(null, {
        status: 200,
        body: {
          success: true,
          message: 'Conference successfully scheduled',
          appointment: {
            id: createdAppointment[0].id,
            ...appointment
          }
        }
      });
    });

  } catch (error) {
    console.error('Error scheduling counselor conference:', {
      error: error.message,
      stack: error.stack,
      status: error.status
    });
    return callback(null, {
      status: error.status || 500,
      body: {
        success: false,
        message: error.message || 'An error occurred while scheduling the conference'
      }
    });
  }
}; 