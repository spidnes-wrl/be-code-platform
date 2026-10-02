# Be Code Platform 🐝

**AI Creative Concept Engine** by Monestime Arvens Warley | NATE Technology

## About Be Code

Be Code is an AI-powered creative concept engine designed to help users imagine, structure, analyze, and improve digital concepts:
- Websites
- Applications  
- Interfaces (UI/UX)
- Digital systems
- Digital products
- And more...

## Features

✨ **AI-Powered Generation** — Create professional websites from descriptions  
🎨 **Live Editing** — Edit elements in real-time  
💰 **Flexible Plans** — Be Pro (free, 3 sites), Beeflex (full control)  
🌍 **Multi-Language** — Support for FR, EN, ES, PT, JA  
🚀 **Serverless Ready** — Deploy instantly on Vercel  

## Plans

### Be Pro (Free)
- 3 professional websites
- Text editing only
- Free `.be` or `.code` domain
- Ask questions, search, simple HTML

### Beeflex ($12/month)
- Unlimited websites
- Full editing control (colors, fonts, layout)
- `.com` and `.fr` domains
- Real-time modifications

## Quick Start

### Local Development

```bash
# Clone repo
git clone https://github.com/spidnes-wrl/be-code-platform.git
cd be-code-platform

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your OpenAI API key to .env
echo "OPENAI_API_KEY=sk-..." >> .env

# Start dev server
npm run dev

# Open in browser
open http://localhost:3000
```

### Deploy to Vercel

1. **Fork or connect this repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Select your GitHub repository

2. **Configure Environment Variables:**
   - In Vercel project settings → Environment Variables
   - Add `OPENAI_API_KEY` with your OpenAI API key
   - Add `PORT=3000`

3. **Deploy:**
   - Vercel will automatically deploy on every push
   - Your site will be live at `https://be-code-platform-xxxxx.vercel.app`

## API Endpoints

### `POST /api/chat`
Send a message to Be Code AI.

**Request:**
```json
{
  "userId": "user_123",
  "message": "Create a website for my coffee shop",
  "lang": "fr"
}
```

**Response:**
```json
{
  "message": "I'll create a beautiful website for your coffee shop...",
  "siteData": { /* generated site JSON */ },
  "userState": {
    "tier": "pro",
    "sitesUsed": 1,
    "sitesLimit": 3
  }
}
```

### `GET /api/health`
Check API status.

### `GET /api/user/:userId`
Get user account details.

### `POST /api/upgrade-plan`
Upgrade to a paid plan.

### `POST /api/edit-element`
Edit website elements (with tier restrictions).

### `POST /api/user/:userId/reset`
Reset conversation history.

## Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...

# Optional
PORT=3000
NODE_ENV=development
```

## File Structure

```
be-code-platform/
├── api/
│   └── index.js           # Express server + API endpoints
├── public/
│   ├── index.html         # Frontend HTML
│   ├── styles.css         # Styling
│   └── app.js             # Frontend JavaScript
├── package.json           # Dependencies
├── vercel.json            # Vercel deployment config
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Security

⚠️ **IMPORTANT:**
- Never commit `.env` file to GitHub
- Always use environment variables for sensitive data
- OpenAI API keys should only be stored in Vercel secrets
- The `.gitignore` file protects `.env` from being committed

## Pricing (As of December 2, 2026)

- **Be Pro**: FREE (limited to 3 sites until Dec 2, 2026)
- **Be Codex**: Price to be defined
- **Beeflex**: $12/month

After December 2, 2026, all plans will require payment or subscription.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel (serverless)
- **Storage**: In-memory (session-based, can be upgraded to MongoDB)

## Support & Issues

For issues or feature requests, please open a GitHub issue.

## License

MIT License - See LICENSE file for details

## Creator

👨‍💻 **Monestime Arvens Warley**  
🏢 **NATE Technology** — National Access Technology Effect  

---

**Be Code** — Transform ideas into reality 🐝✨
