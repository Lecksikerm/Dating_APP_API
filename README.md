# LoveConnect Backend API

Backend service for the LoveConnect dating app.  
This API handles authentication, profile management, matching, chat, media upload, notifications, and real-time events (presence, typing, calls) over Socket.IO.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO (real-time messaging/calls/presence)
- Cloudinary + Multer (media uploads)
- JWT auth
- Nodemailer (email verification + password reset)

## Project Structure

```
backend/
  server.js
  src/
    app.js
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    socket.js
    utils/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB connection string
- Cloudinary account
- SMTP/email credentials

## Installation

```bash
cd backend
npm install
```

## Environment Variables

Create a `.env` file in `backend/`:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=90

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
EMAIL_FROM="LoveConnect <no-reply@loveconnect.com>"

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> Important: Never commit real secrets to git. Rotate any exposed keys immediately.

## Run Locally

```bash
# development
npm run dev

# production-like
npm run prod
```

Backend starts on `http://localhost:5000` by default.

Health check:

```http
GET /health
```

## API Base

All REST routes are prefixed with `/api`.

## Core REST Endpoints

### Auth (`/api/auth`)

- `POST /signup`
- `GET /verify-email/:token`
- `POST /login`
- `POST /forgot-password`
- `PATCH /reset-password/:token`
- `GET /me` (protected)
- `PATCH /update-password` (protected)
- `GET /logout` (protected)

### Users (`/api/users`) (protected)

- `GET /me`
- `PATCH /update-profile`
- `POST /upload-profile-picture` (multipart: `image`)
- `POST /add-gallery-image` (multipart: `image`)
- `PATCH /remove-gallery-image`
- `GET /discover`
- `GET /:id` (public profile view + visit notification trigger)

### Matches (`/api/matches`) (protected)

- `POST /like/:userId`
- `POST /pass/:userId`
- `DELETE /unlike/:userId`
- `GET /my-matches`
- `GET /who-liked-me`
- `GET /people-i-liked`

### Chat (`/api/chat`) (protected)

- `GET /conversations`
- `POST /start/:userId`
- `POST /send`
- `POST /send-file` (multipart: `file`)
- `GET /messages/:conversationId`
- `PATCH /read/:conversationId`
- `GET /unread-count`
- `PATCH /messages/:messageId` (edit)
- `PATCH /messages/:messageId/reaction` (sticker reaction)

### Voice (`/api/voice`) (protected)

- `POST /upload` (multipart: `voice`, `conversationId`, `receiverId`, `duration`)
- `GET /:messageId`

### Notifications (`/api/notifications`) (protected)

- `GET /`
- `GET /unread-count`
- `PATCH /read-all`
- `PATCH /:id/read`

## Socket.IO (Real-Time)

Client authenticates with JWT in `auth.token`.

### Client -> Server events

- `join_conversation`
- `leave_conversation`
- `send_message`
- `typing`
- `stop_typing`
- `recording_start`
- `recording_stop`
- `call_offer`
- `call_answer`
- `call_ice_candidate`
- `switch_call_mode`
- `end_call`

### Server -> Client events

- `new_message`
- `notification`
- `user_typing`
- `user_stop_typing`
- `user_recording`
- `presence_update`
- `profile_visit_notification`
- `notification_created`
- `incoming_call`
- `call_answered`
- `call_ice_candidate`
- `call_mode_switched`
- `call_ended`

## Media Uploads

Cloudinary folders used:

- `dating-app/profiles`
- `dating-app/gallery`
- `dating-app/voice`
- `dating-app/chat-files`

## Deployment Notes

Before deploying:

1. Set all env vars in your host (Render/Railway/Fly/EC2/etc.).
2. Set `NODE_ENV=production`.
3. Set `FRONTEND_URL` to your deployed frontend origin.
4. Ensure MongoDB allowlist includes your backend host.
5. Rotate any previously exposed credentials.
6. Use HTTPS for full media + call support.

### Deploy to Render (Quick Start)

1. Push this project to GitHub.
2. In Render, click **New +** -> **Blueprint**.
3. Select your repo. Render will detect `render.yaml`.
4. Fill all env vars marked `sync: false` in Render dashboard.
5. Deploy and wait for the first build.
6. Verify health endpoint:
   - `https://<your-render-service>.onrender.com/health`

## Troubleshooting

- CORS errors: verify `FRONTEND_URL` and origin match exactly.
- Socket auth failures: verify frontend sends valid JWT in `auth.token`.
- Calls not connecting: WebRTC can require TURN in restrictive networks.
- Upload failures: verify Cloudinary credentials and file size limits.

## Scripts

- `npm run dev` - start with nodemon
- `npm start` - start server
- `npm run prod` - start in production mode
