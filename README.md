# QueueLess Campus

A MERN web application for managing a campus print-shop queue.

Developed by **Joshua Mathew Varghese**  
Sahrdaya College of Engineering and Technology  
Individual project

## Live Website

https://queueless-campus-5hgu.onrender.com

## Overview

Students can join the print-shop queue online and track their token.
Staff can manage admissions, serve students in token order and view
daily statistics.

## Features

### Students
- Register, log in and log out.
- Join an open queue.
- View the current token and number of people ahead.
- Cancel a waiting token.
- View personal token history with pagination.

### Staff
- Open and close queue admissions.
- View the waiting list with pagination.
- Call the next token in order.
- Complete service or skip an absent student.
- View daily counts of issued, completed, cancelled and skipped tokens.

## Technology

- Frontend: React and Vite
- Backend: Node.js and Express
- Database: MongoDB Atlas with Mongoose
- Authentication: express-session and connect-mongo
- Password hashing: bcryptjs
- Hosting: Render

## Queue Rules

- Each student can hold one active token at a time.
- Tokens are called in ascending number order.
- Closing admissions does not cancel existing tokens.
- Only waiting tokens can be cancelled by their owner.
- Daily numbering uses the Asia/Kolkata timezone.
- Previous active tokens must be resolved before opening a new service day.
- Queue details refresh every five seconds.
- Students refresh their history using the Refresh history button.

## Local Setup

Use Node.js 24 and a MongoDB Atlas database.

Install dependencies from the project root:

```bash
npm ci --prefix server
npm ci --prefix client
```

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=your_random_session_secret
```

Do not commit real credentials.

Start the backend:

```bash
cd server
npm run dev
```

In another terminal, start the frontend:

```bash
cd client
npm run dev
```

Open http://localhost:5173.

## Run the Built Website Locally

From the project root:

```bash
npm run build --prefix client
npm start --prefix server
```

Open http://localhost:5000.

## Staff Account Setup

New registrations always receive the student role.

To create the staff account, register `staff@example.com`, then run
the following command from the `server` directory:

```bash
node scripts/makeStaff.js
```

This promotes that account to staff. Keep the staff password private.

## Frontend Checks

Run from the `client` directory:

```bash
npm run lint
npm run build
```

## Scope

This version supports one Campus Print Shop counter.
Payments, document uploads, appointments and SMS/email notifications
are outside the project scope.