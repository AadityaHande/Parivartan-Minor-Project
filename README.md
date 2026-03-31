# 🛣️ SMC Road Damage Reporting System

A comprehensive civic engagement platform for reporting and managing road damage in Solapur Municipal Corporation (SMC). Built with Next.js, Firebase, and AI-powered damage assessment.

## ✨ Features

### 1. **Citizen Portal** 
- 📸 Report road damage with photos and GPS location
- 🤖 AI-powered damage analysis and categorization
- 📊 Track complaint status in real-time
- 🏆 Gamification with leaderboard system
- 🤝 Community donation marketplace
- 💬 AI chatbot for assistance

### 2. **SMC Officer Dashboard**
- 📈 Comprehensive analytics and insights
- 🔄 Workflow management with department routing
- 👷 Worker assignment and tracking
- 📊 Resolution timeline visualization
- 🏢 Department workload monitoring
- ⚙️ System-wide settings configuration

### 3. **Worker Portal**
- 📋 View assigned tasks
- ✅ Update complaint status with progress photos
- 📜 Work history and performance tracking

### 4. **AI-Powered Features**
- 🧠 Automatic damage detection and severity assessment
- 🎯 Smart department routing suggestions
- 📝 Report summarization
- 💬 Interactive chatbot for citizens

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or higher
- A Firebase project ([Create one here](https://console.firebase.google.com))
- A Gemini API key ([Get it here](https://ai.google.dev))

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd smc-road
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase & Gemini**
   
   📖 **Follow the complete setup guide in [SETUP.md](./SETUP.md)**
   
   Quick steps:
   - Create a Firebase project with Authentication and Firestore enabled
   - Get your Gemini API key
   - Copy `.env.example` to `.env` and fill in your credentials

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
smc-road/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── citizen/      # Citizen portal routes
│   │   ├── smc/          # SMC officer routes
│   │   └── worker/       # Worker portal routes
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utilities, types, constants
│   ├── firebase/         # Firebase client & server config
│   └── ai/               # Genkit AI flows
├── firestore.rules       # Firestore security rules
├── SETUP.md             # Detailed setup guide
└── .env                 # Environment variables (git-ignored)
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **UI Components**: ShadCN/UI, Recharts
- **Backend**: Firebase (Firestore, Authentication, App Hosting)
- **AI**: Google Genkit with Gemini models
- **Forms**: React Hook Form with Zod validation

## 🔐 Security Note

⚠️ **For Prototype Phase**: Firestore rules are currently open for development. Before production deployment:

1. Update `firestore.rules` with proper security
2. Enable email verification
3. Implement role-based access control
4. Secure API keys and credentials

## 📝 Available Departments

The system routes complaints to these departments:
- 🏗️ Engineering
- 💧 Water Supply
- 🚰 Drainage
- ⚡ Electricity
- 🚦 Traffic

## 🧪 Testing

1. **Citizen Flow**: `/citizen/report` → Submit report → Track in `/citizen/my-complaints`
2. **SMC Officer Flow**: `/smc/login` → View `/smc/dashboard` → Assign at `/smc/complaint/[id]`
3. **Worker Flow**: `/worker/login` → View tasks → Update status

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Complete setup instructions
- [features.md](./features.md) - Detailed feature list
- [tech-stack.md](./tech-stack.md) - Technology choices explained

## 🤝 Contributing

This is a hackathon project for SMC road damage reporting. Contributions welcome!

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Troubleshooting

### "auth/invalid-api-key" Error
- Check your `.env` file has correct Firebase credentials
- Restart dev server: `npm run dev`
- See [SETUP.md](./SETUP.md) for detailed Firebase configuration

### AI Features Not Working
- Verify `GEMINI_API_KEY` is set correctly
- Check API quotas at [Google AI Studio](https://ai.google.dev)

### Permission Denied Errors
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check Firebase Authentication is enabled

---

**Built for Solapur Municipal Corporation** | Made with ❤️ using Next.js & Firebase
```