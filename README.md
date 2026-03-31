
---

# Parivartan – Civic Issue Management Platform

Parivartan is a civic issue management platform designed to streamline communication between citizens, municipal authorities, and field workers. It enables efficient reporting, tracking, and resolution of public issues such as road damage, waste management, and neighborhood concerns.

---

## Overview

Parivartan digitizes municipal workflows by providing:

* Citizen issue reporting with image and location
* AI-powered categorization and summaries
* Real-time tracking and analytics
* SMS notifications for important updates
* Worker task management with proof submission

---

## Key Features

* Complaint Management System
  Submit, track, and manage civic issues with full lifecycle visibility

* AI Integration
  Automatic categorization, summaries, and chatbot assistance

* Role-Based Access
  Separate portals for Citizen, Admin, and Worker

* Notifications
  In-app alerts with optional SMS integration

* Location-Based Reporting
  Map-based issue tagging using Leaflet

* Work Proof System
  Workers upload before and after images

* Progressive Web App
  Mobile-first experience with offline support

---

## User Portals

### Citizen

* Register and login
* Submit complaints with image and location
* Track complaint status
* Receive notifications
* Access chatbot assistance

### Admin (SMC/PMC)

* Dashboard and analytics
* Complaint management
* Assign tasks to workers
* Send notifications and SMS broadcasts

### Worker

* View assigned tasks
* Upload work proof
* Track history and performance

---

## Tech Stack

| Category      | Technology                                  |
| ------------- | ------------------------------------------- |
| Frontend      | Next.js (App Router, TypeScript)            |
| UI            | Tailwind CSS, shadcn/ui                     |
| Backend       | Firebase Firestore, Firebase Authentication |
| Admin SDK     | firebase-admin                              |
| AI            | Genkit with Google Gemini                   |
| Maps & Charts | Leaflet, Recharts                           |
| Messaging     | Twilio SMS APIs                             |

---

## Project Structure

```
src/
 ├── app/
 │   ├── citizen/
 │   ├── smc/
 │   ├── worker/
 │   ├── api/
 │
 ├── ai/
 ├── firebase/
 ├── lib/
 ├── components/
```

---

## Local Setup

### Prerequisites

* Node.js 18 or higher
* npm
* Firebase project (Auth + Firestore)
* Gemini API key
* Twilio account

---

### Installation

```
npm install
```

---

### Environment Variables

Create a `.env` file in the root directory:

```
GEMINI_API_KEY=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

Important:

* Do not commit the `.env` file
* Ensure `FIREBASE_PRIVATE_KEY` preserves line breaks

---

### Run the Project

```
npm run dev
```

Default URL:

```
http://localhost:9002
```

---

### Additional Commands

```
npm run dev:https
npm run genkit:dev
npm run genkit:watch
npm run lint
npm run typecheck
npm run build
npm run start
```

---

## Core Workflows

### Complaint Lifecycle

Submitted → Under Verification → Assigned → In Progress → Resolved or Rejected

---

### Worker Assignment Flow

1. Admin selects complaint
2. Assigns worker
3. Sets estimated duration
4. Task is assigned
5. Worker receives details via SMS

---

### Notification Flow

1. Admin creates notification
2. Stored in Firestore
3. SMS sent to users (if available)
4. Users can mark notifications as read

---

## API Highlights

* `/api/auth/send-sms` – Send SMS to a single user
* `/api/notifications/send-sms` – Broadcast SMS
* `/api/notifications/[id]/mark-read` – Mark notification as read
* `/api/worker/*` – Worker-related APIs

---

## Deployment Notes

* Configure Firebase Authentication and Firestore properly
* Update Firestore security rules before production
* Validate API security and role-based access
* Configure Twilio sender and compliance settings

---

## Troubleshooting

### Application not starting

* Run `npm install` again
* Check environment variables
* Restart the server

### SMS not working

* Verify Twilio credentials
* Ensure correct phone number format
* Check account limits and permissions

### Firebase permission issues

* Review Firestore rules
* Confirm user roles exist in database

---

## Documentation

* docs/blueprint.md
* docs/backend.json
* docs/worker-api.md
* tech-stack.md

---

## License

This project is intended for academic and prototype use.
