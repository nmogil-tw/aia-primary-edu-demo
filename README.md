> [!NOTE]
> Twilio AI Assistants is a [Twilio Alpha](https://twilioalpha.com) project that is currently in Developer Preview.

# Twilio AI Assistant Deployment Tool - Primary School Parent Hub

A modular tool for deploying a Twilio AI Assistant with pre-configured tools and knowledge bases. This project provides a structured way to create and configure an AI Assistant for primary school parent communication and support.

## Features

- Automated assistant creation with education-focused personality
- Pre-configured tools for common parent support operations:
  - Guardian authentication
  - Student information lookup
  - Absence reporting
  - Field trip information
  - SMS notifications
- Knowledge base integration for school FAQs
- Modular and maintainable codebase

## Prerequisites

- Node.js (v14 or higher)
- Twilio account with AI Assistant access (accept AI Assistants Terms & Conditions)
- Twilio Account SID and Auth Token
- Airtable account, [App ID](https://support.airtable.com/docs/finding-airtable-ids#finding-ids-in-the-airtable-api) and [API token](https://airtable.com/developers/web/guides/personal-access-tokens#creating-a-token)

## Project Structure

```
twilio-ai-assistant/
├── README.md                                # Project documentation and setup instructions
├── LICENSE                                  # MIT license file
├── package.json                             # Project dependencies and scripts
├── .env.example                             # Template for environment variables
├── instructions.md                          # Implementation instructions
├── example_database_tables/                 # Example CSV data for Airtable
│   ├── guardians.csv                        # Parent/guardian information
│   ├── students.csv                         # Student information
│   ├── absences.csv                         # Absence records
│   ├── field_trips.csv                      # Field trip information
│   ├── counselor_appointments.csv           # Counselor appointment records
│   └── counselor_availability.csv           # Counselor availability schedule
├── functions/                               # Serverless function implementations
│   ├── channels/                            # Channel-specific handlers
│   │   ├── conversations/                   # Twilio Conversations handlers
│   │   │   ├── flex-webchat.protected.js    # Flex webchat integration
│   │   │   ├── messageAdded.protected.js    # Message handling
│   │   │   └── response.js                  # Response handling
│   │   ├── messaging/                       # SMS/WhatsApp handlers
│   │   │   ├── incoming.protected.js        # Incoming message handling
│   │   │   └── response.js                  # Response handling
│   │   └── voice/                           # Voice call handlers
│   │       └── incoming-call.js             # Incoming call handling
│   ├── front-end/                           # Front-end integration endpoints
│   └── tools/                               # Assistant tool implementations
│       ├── guardian-authentication.js       # Guardian PIN validation
│       ├── student-lookup.js                # Student information lookup
│       ├── report-absence.js                # Absence reporting
│       ├── field-trip-info.js               # Field trip information
│       └── send-sms.js                      # SMS notification sender
├── prompts/                                 # Assistant configuration
│   └── assistant-prompt.md                  # Core personality and behavior
└── src/                                     # Deployment and configuration
    ├── deploy.js                            # Main deployment script
    ├── redeploy.js                          # Redeployment script
    ├── config/                              # Configuration modules
    │   ├── assistant.js                     # Assistant settings
    │   ├── knowledge.js                     # Knowledge base config
    │   └── tools.js                         # Tool configurations
    ├── lib/                                 # Core functionality
    │   ├── createAssistant.js               # Assistant creation
    │   ├── createKnowledge.js               # Knowledge base setup
    │   └── createTools.js                   # Tool creation and attachment
    └── assistant/                           # Assistant-specific modules
```

## Quick Start

1. Clone the repository:

```bash
git clone https://github.com/twilio-samples/ai-assistant-demo-primary-edu.git
cd ai-assistant-demo-primary-edu
```

2. Install dependencies:

```bash
npm install
```

3. Configure Airtable:

   a. Create a new Airtable base with the following tables:
      - Guardians: Parent/guardian information
      - Students: Student information
      - Absences: Absence records
      - Field Trips: Field trip information
      - Counselor Appointments: Counselor appointment records
      - Counselor Availability: Counselor availability schedule

   b. Use the CSV files in the `example_database_tables` directory as templates for your tables

   c. Once created, find the base ID in your Airtable URL (it looks like 'appXXXXXXXXXXXXX')

   d. Generate an Airtable access token:
      - Go to your [Airtable account](https://airtable.com/create/tokens)
      - Click "Create new token"
      - Give it a name and select the necessary scopes for your base
      - Copy the generated token

4. Configure environment variables:

```bash
cp .env.example .env
# Edit .env and add your credentials:
# TWILIO_ACCOUNT_SID=your_account_sid
# TWILIO_AUTH_TOKEN=your_auth_token
# AIRTABLE_API_KEY=your_airtable_api_key
# AIRTABLE_BASE_ID=your_airtable_base_id
```
:warning: **Ensure you accept the Terms and Conditions in the Twilio Console by visiting the AI Assistants page before running the script.**

5. Deploy the assistant:

```bash
npm run deploy
```

## Connecting Channels

After deploying your functions and assistant, you'll need to connect various Twilio channels. Here's how to set up each channel:

- [Conversations](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/channel-conversations)
- [SMS & Whatsapp](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/channel-messaging)
- [Conversations with React](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/react)
- [Transition to Flex](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/transition-flex)
- [Flex Voice Handoff](https://docs.google.com/document/d/14RuOxt6FUAuc62A7BmeQFZWHr5WcXOoQZluZEF98GJA/edit?usp=sharing)
- [Transition to Sudio](https://www.twilio.com/docs/alpha/ai-assistants/code-samples/transition-studio)
- [Other Examples](https://github.com/twilio-labs/ai-assistants-samples)

### Voice Channel

:warning: **Add your Assistant ID to the incoming-call function**

Configure your Twilio voice number to use the AI Assistant:

**Via Twilio CLI:**

```bash
twilio phone_number <your-twilio-number> \
    --voice-url=https://<your-functions-domain>.twil.io/channels/voice/incoming-call
```

OR If Using Voice Intel.

```bash
twilio phone_number <your-twilio-number> \
    --voice-url=https://<your-functions-domain>.twil.io/channels/voice/incoming-call-voice-intel
```

**Via Twilio Console:**

1. Open your voice-capable phone number
2. Set the "When a call comes in" function to: `https://<your-functions-domain>.twil.io/channels/voice/incoming-call` or `https://<your-functions-domain>.twil.io/channels/voice/incoming-call-voice-intel`

### Messaging Channels

#### SMS

**Via Twilio CLI:**

```bash
twilio phone_number <your-twilio-number> \
    --sms-url=https://<your-functions-domain>.twil.io/channels/messaging/incoming
```

**Via Twilio Console:**

1. Open your SMS-capable phone number or Messaging Service
2. Set the "When a message comes in" webhook to: `https://<your-functions-domain>.twil.io/channels/messaging/incoming`

#### WhatsApp

1. Go to your WhatsApp Sandbox Settings in the Twilio Console
2. Configure the "When a message comes in" function to: `https://<your-functions-domain>.twil.io/channels/messaging/incoming`

**Note:** To use the same webhook for multiple assistants, add the AssistantSid as a parameter:

```
https://<your-functions-domain>.twil.io/channels/messaging/incoming?AssistantSid=AI1234561231237812312
```

### Conversations Channel

Set up Twilio Conversations integration:

1. Create a Conversations Service or use your default service
2. Run this Twilio CLI command to configure the webhook:

```bash
twilio api:conversations:v1:services:configuration:webhooks:update \
    --post-webhook-url=https://<your-functions-domain>.twil.io/channels/conversations/messageAdded \
    --chat-service-sid=<your-conversations-service-sid> \
    --filter=onMessageAdded
```

3. Follow the [Twilio Conversations documentation](https://www.twilio.com/docs/conversations/overview) to connect your preferred channels

## Tool Functions

The assistant uses several tool functions that need to be implemented:

1. Guardian Authentication (`/tools/guardian-authentication`)
   - Validates guardian PIN
   - Authenticates guardians based on phone/email and PIN
   - Returns authentication status and guardian information

2. Student Lookup (`/tools/student-lookup`)
   - Retrieves student information for authorized guardians
   - Returns list of students associated with the guardian
   - Input schema:
     ```javascript
     {
       guardian_id: string; // Required: guardian identifier
     }
     ```

3. Report Absence (`/tools/report-absence`)
   - Logs absence reports in the database
   - Creates absence record with student ID, date, reason
   - Input schema:
     ```javascript
     {
       student_id: string,    // Required: student identifier
       date: string,          // Required: date of absence
       reason: string,        // Required: reason for absence
       reported_by: string    // Required: guardian identifier
     }
     ```

4. Field Trip Info (`/tools/field-trip-info`)
   - Retrieves field trip information
   - Provides details about upcoming field trips
   - Input schema:
     ```javascript
     {
       grade_level: string,   // Optional: filter by grade level
       trip_id: string        // Optional: specific trip identifier
     }
     ```

5. Send SMS (`/tools/send-sms`)
   - Sends SMS messages with field trip information
   - Delivers notifications to guardians
   - Input schema:
     ```javascript
     {
       phone_number: string,  // Required: recipient phone number
       message: string        // Required: message content
     }
     ```

## Development

### Adding New Tools

1. Create your function in the `functions/tools` directory
2. Deploy the updated functions:

```bash
twilio serverless:deploy
```

3. Add tool configuration to `src/config/tools.js`:

```javascript
newTool: {
  name: "Tool Name",
  description: "Tool description and rules",
  type: "WEBHOOK",
  method: "GET",
  url: `https://${DOMAIN}/tools/your-new-tool`
}
```

4. Redeploy the assistant:

```bash
npm run deploy
```

### Modifying Assistant Behavior

1. Update the prompt in `prompts/assistant-prompt.md`
2. Modify tool configurations as needed
3. Redeploy the assistant:

```bash
npm run redeploy
```

### Local Development

1. Create test credentials in Twilio
2. Use test credentials in `.env`
3. Deploy functions and assistant separately for easier debugging

## Demo Scenario

The system is designed to handle the following scenario:

1. Parent reaches out to report an upcoming absence for their child
2. AI Assistant asks user to provide their "guardian PIN" to ensure they are authorized
3. AI Assistant logs absence in "absences" table in Airtable
4. Parent asks about upcoming field trip
5. AI Assistant sends info about field trip via SMS

## Error Handling

The deployment script includes comprehensive error handling:

- Environment variable validation
- Creation failure handling
- Detailed error logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
