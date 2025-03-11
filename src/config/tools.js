/**
 * List of tools to be attached to the assistant
 * @param {string} domain
 * @returns
 */
module.exports = (domain) => ({
  guardianAuthentication: {
    name: 'Guardian Authentication',
    description: 'Use this tool to authenticate a guardian using their contact information (email or phone) and PIN.',
    type: 'WEBHOOK',
    method: 'GET',
    url: `https://${domain}/tools/guardian-authentication`,
    schema: {
      pin: 'string', // 4-digit PIN
    },
  },
  studentLookup: {
    name: 'Student Lookup',
    description: 'Use this tool to look up all students associated with a guardian using their contact information.',
    type: 'WEBHOOK',
    method: 'GET',
    url: `https://${domain}/tools/student-lookup`,
  },
  absenceLookup: {
    name: 'Absence Lookup',
    description: 'Use this tool to look up absence records for students associated with a guardian. You can optionally specify a date range.',
    type: 'WEBHOOK',
    method: 'GET',
    url: `https://${domain}/tools/absence-lookup`,
    schema: {
      start_date: 'string', // Optional: YYYY-MM-DD
      end_date: 'string', // Optional: YYYY-MM-DD
    },
  },
  reportAbsence: {
    name: 'Report Absence',
    description: 'Use this tool to report a student absence. The guardian must be authenticated first.',
    type: 'WEBHOOK',
    method: 'POST',
    url: `https://${domain}/tools/report-absence`,
    schema: {
      student_name: 'string',
      date: 'string', // YYYY-MM-DD
      reason: 'string',
    },
  },
  fieldTripInfo: {
    name: 'Field Trip Information',
    description: 'Use this tool to look up field trip information for students associated with a guardian. Can optionally look up a specific trip using trip_id.',
    type: 'WEBHOOK',
    method: 'GET',
    url: `https://${domain}/tools/field-trip-info`,
    schema: {
      trip_id: 'string', // Optional: specific trip ID
    },
  },
  sendSMS: {
    name: 'Send SMS',
    description: 'Use this tool to send an SMS message to a guardian\'s phone number. Can only be used with phone numbers, not email addresses.',
    type: 'WEBHOOK',
    method: 'POST',
    url: `https://${domain}/tools/send-sms`,
    schema: {
      message: 'string',
    },
  },
  scheduleCounselorConference: {
    name: 'Schedule Counselor Conference',
    description: 'Use this tool to schedule a conference with the school guidance counselor. The guardian must be authenticated first.',
    type: 'WEBHOOK',
    method: 'POST',
    url: `https://${domain}/tools/schedule-counselor-conference`,
    schema: {
      student_name: 'string',
      preferred_date: 'string', // YYYY-MM-DD
      preferred_time: 'string', // "morning" or "afternoon"
      reason: 'string',
    },
  },
});
