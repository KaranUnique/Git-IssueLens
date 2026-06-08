# Git-IssueLens

An AI-powered GitHub issue analysis platform that automatically evaluates and categorizes incoming issues using Google's Gemini AI. Git-IssueLens integrates with GitHub webhooks to receive issue events, analyzes them against repository context, and provides actionable insights through a modern web dashboard.

## Features

- **GitHub Webhook Integration**: Automatically receives and processes GitHub issue events via secure webhooks
- **AI-Powered Analysis**: Uses Google Gemini 2.0 Flash to analyze issues based on repository context and README content
- **Smart Categorization**: Automatically categorizes issues by type (Bug Report, Feature Request, Documentation, Question, Other)
- **Priority Assessment**: AI assigns priority levels (Low, Medium, High) based on issue content and scope
- **Scope Matching**: Evaluates how well issues align with repository scope (0-100 score)
- **Worthiness Evaluation**: Classifies issues as Useful, Duplicate, Out of Scope, Too Vague, or Low Impact
- **Confidence Scoring**: Provides confidence metrics for AI recommendations
- **Interactive Dashboard**: Modern React-based dashboard for viewing and managing issues
- **Repository Configuration**: Easy setup for connecting GitHub repositories
- **Secure Webhook Verification**: HMAC-SHA256 signature verification for webhook security

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Router** - Client-side routing
- **Jest** - Testing framework with React Testing Library

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **MongoDB** - Database (via Mongoose)
- **Google Generative AI** - AI analysis (Gemini 2.0 Flash)
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

### Development Tools
- **Jest** - Unit and integration testing
- **Supertest** - HTTP endpoint testing
- **MongoDB Memory Server** - In-memory MongoDB for testing
- **ngrok** - Webhook tunneling for local development

## Project Structure

```
Git-IssueLens/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Home, Configure, Dashboard)
│   │   └── __tests__/     # Frontend tests
│   ├── public/            # Static assets
│   └── package.json       # Frontend dependencies
├── server/                # Node.js/Express backend
│   ├── models/           # Mongoose models (Issue, Project, RepoConfig)
│   ├── routes/           # API routes (webhook, issues, project, config)
│   ├── services/         # Business logic (GitHub, Gemini, Webhook services)
│   ├── __tests__/        # Backend tests
│   ├── .env              # Environment variables
│   └── server.js         # Main server entry point
└── package.json          # Root dependencies (ngrok)
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local instance or MongoDB Atlas account)
- Google Gemini API key
- GitHub account (for webhook setup)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Git-IssueLens
   ```

2. **Install root dependencies**
   ```bash
   npm install
   ```

3. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

4. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

## Configuration

1. **Create environment file**
   Create a `.env` file in the `server/` directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/git-issuelens
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=5000
   WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok-free.dev
   ```

2. **Get Google Gemini API Key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

3. **Setup MongoDB**
   - For local development: Install MongoDB and run `mongod`
   - For production: Use MongoDB Atlas and update `MONGO_URI`

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   Server runs on `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   Client runs on `http://localhost:5173`

3. **Setup ngrok for webhooks** (optional, for local development)
   ```bash
   ngrok http 5000
   ```
   Update `WEBHOOK_BASE_URL` in `.env` with your ngrok URL

### Production Mode

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Start the backend server**
   ```bash
   cd server
   npm start
   ```

## Setting Up GitHub Webhooks

1. Navigate to your GitHub repository settings
2. Go to **Webhooks** → **Add webhook**
3. Set the payload URL to: `https://your-domain.com/api/webhook/github`
4. Set content type to `application/json`
5. Add your webhook secret (configured in the app)
6. Select "Issues" events
7. Click "Add webhook"

## API Endpoints

### Webhook
- `POST /api/webhook/github` - Receive GitHub issue events

### Issues
- `GET /api/issues` - Get all issues
- `GET /api/issues/:id` - Get specific issue
- `POST /api/issues/:id/analyze` - Trigger AI analysis for an issue

### Project
- `GET /api/project` - Get project information
- `POST /api/project` - Create/update project

### Configuration
- `GET /api/config` - Get repository configuration
- `POST /api/config` - Update repository configuration
- `POST /api/config/webhook` - Setup webhook configuration

## Testing

### Backend Tests
```bash
cd server
npm test
```

### Frontend Tests
```bash
cd client
npm test
```

## AI Analysis Features

The Gemini AI analyzes issues based on:

- **Repository Context**: Uses repository name, description, and README content
- **Issue Content**: Analyzes title, body, and labels
- **Scope Alignment**: Scores how well issues match repository scope (0-100)
- **Priority Assignment**: Recommends Low, Medium, or High priority
- **Worthiness Classification**: Categorizes as Useful, Duplicate, Out of Scope, Too Vague, or Low Impact
- **Issue Type Detection**: Identifies Bug Reports, Feature Requests, Documentation, Questions, or Other
- **Recommendations**: Provides Accept, Review Further, or Reject recommendations
- **Confidence Scoring**: Rates confidence in analysis (0-100)

## Security Features

- HMAC-SHA256 webhook signature verification
- Environment variable configuration
- CORS protection
- Input validation and sanitization
- Error handling and logging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue on the GitHub repository.
