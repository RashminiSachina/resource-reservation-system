# ReserveIt

A modern, full-stack resource reservation system built with Next.js 16, Prisma ORM, and PostgreSQL.

[Next.js](https://img.shields.io/badge/Next.js-16.4.0-black?style=flat-square&logo=next.js)
[Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=flat-square&logo=prisma)
[PostgreSQL](https://img.shields.io/badge/PostgreSQL-latest-336791?style=flat-square&logo=postgresql&logoColor=white)
[TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
[Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)

---

## ✨ Features
### 👤 User Features
- **Resource Discovery** — Browse all available resources with category filtering and real-time availability checks
- **Smart Booking** — Reserve resources with a start/end time window; instant conflict detection prevents double-bookings
- **Availability Timetable** — Visual timetable per resource showing existing bookings at a glance
- **Booking Management** — View upcoming and past reservations; cancel bookings from a single dashboard
- **Notification Centre** — In-app notification bell with unread count; receive alerts for confirmations, updates, and new resources
- **Profile Management** — Update display name and email from the profile page
- **Secure Authentication** — Password-based login with session-based auth using HTTP-only cookies
- **Password Reset** — Email-based OTP flow with time-limited tokens and attempt limiting
### 🔐 Admin Features
- **Dashboard Overview** — Live stats: total users, active resources, total reservations, and pending today
- **Resource Management** — Create, edit, and toggle resources active/inactive; assign categories
- **Category Management** — Create and list resource categories with descriptions
- **Reservation Management** — View all reservations; confirm or cancel any booking
- **User Management** — View all registered users and their roles

---

## 📸 Screenshots

### 🏠 Homepage
![Homepage — Landing page with hero section and feature highlights](public/screenshots/homepage.png)

### 🔑 Login
![Login page with email/password authentication](public/screenshots/login.png)

### 📋 User Dashboard
![User dashboard showing available resources with category filters and booking options](public/screenshots/userDashboard.png)

### 📅 Booking & Availability
![Availability timetable with hourly slots and booking modal](public/screenshots/myBooking.png)

### 🛠️ Admin Dashboard
![Admin dashboard with system statistics, resource management, and reservation control](public/screenshots/adminDashboard.png)

---

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL |
| **ORM** | [Prisma 7](https://www.prisma.io) with `@prisma/adapter-pg` |
| **Styling** | Tailwind CSS 4 |
| **Auth** | Session cookies (`bcryptjs` password hashing) |
| **Email** | `nodemailer` (SMTP) for OTP / notification emails |
---
## 🚀 Getting Started
### Prerequisites
- **Node.js** 20 or later
- **PostgreSQL** database (local or cloud)
- **npm** / yarn / pnpm / bun
### 1 — Clone the repository
```bash
git clone https://github.com/RashminiSachina/resource-reservation-system.git
cd resource-reservation-system
```
### 2 — Install dependencies
```bash
npm install
```
### 3 — Configure environment variables
Duplicate the example file and fill in your values:
```bash
cp .env.example .env
```
See the [Environment Variables](#-environment-variables) section for details on each key.
### 4 — Push the database schema
```bash
npx prisma migrate deploy
# or for development with automatic migrations:
npx prisma migrate dev --name init
```
### 5 — Generate the Prisma Client
```bash
npx prisma generate
```
### 6 — Start the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
---
## ⚙️ Environment Variables
Create a `.env` file in the project root (copy from `.env.example`):
```env
# ─── Database ───────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/reservation_system"
# ─── Session ────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="your-session-secret-here"
# ─── Admin Access ───────────────────────────────────────────────
# Comma-separated list — these emails receive the ADMIN role on first login
ADMIN_EMAILS="admin@example.com"
# ─── SMTP (for OTP / email notifications) ───────────────────────
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"
SMTP_FROM="noreply@reserveit.local"
```
> **Tip:** For `SESSION_SECRET`, run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate a secure random string.
---
## 📡 API Reference
All API routes are under `/api/`. Authentication is enforced via an HTTP-only session cookie.
### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in (email + password) |
| `POST` | `/api/auth/logout` | Invalidate session |
| `GET` | `/api/auth/me` | Get the current authenticated user |
| `POST` | `/api/auth/forgot-password` | Send OTP reset email |
| `POST` | `/api/auth/verify-otp` | Verify OTP and obtain a reset token |
| `POST` | `/api/auth/reset-password` | Reset password with token |
### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/user/resources` | List active resources (supports `?categoryId=`, `?startTime=`, `?endTime=`) |
| `GET` | `/api/user/categories` | List all resource categories |
| `GET` | `/api/user/reservations` | List the current user's reservations |
| `POST` | `/api/user/reservations` | Create a new reservation |
| `PATCH` | `/api/user/reservations` | Cancel a reservation |
| `GET` | `/api/user/resource/[id]/availability` | Get availability timetable for a resource |
| `GET` | `/api/user/notifications` | List notifications for the current user |
| `GET` | `/api/user/notifications/unread-count` | Get unread notification count |
| `PATCH` | `/api/user/notifications/mark-all-read` | Mark all notifications as read |
| `PATCH` | `/api/user/notifications/[id]` | Mark a specific notification as read |
| `GET` | `/api/user/profile` | Get current user's profile |
| `PATCH` | `/api/user/profile` | Update name and email |
| `POST` | `/api/user/profile/change-password` | Change user password |
| `GET` | `/api/user/dashboard` | Dashboard summary stats |
### Admin *(requires `ADMIN` role)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/stats` | Aggregate system statistics |
| `GET / POST` | `/api/admin/resources` | List or create resources |
| `PATCH / DELETE` | `/api/admin/resources` | Update or delete a resource |
| `GET / POST` | `/api/admin/categories` | List or create categories |
| `GET / PATCH` | `/api/admin/reservations` | List all reservations; confirm or cancel |
| `GET` | `/api/admin/users` | List all users |

---

## 🗄️ Database Schema

### Entity Relationship Diagram

![Database Schema ERD](public/screenshots/Resource-Reservation-ERD.drawio.png)

### Reservation Statuses
| Status | Description |
|--------|-------------|
| `PENDING` | Created, awaiting admin confirmation |
| `CONFIRMED` | Approved and active |
| `CANCELLED` | Cancelled by user or admin |
### Notification Types
`RESERVATION_CONFIRMED` · `RESERVATION_UPDATED` · `RESERVATION_CANCELLED` · `RESERVATION_REMINDER` · `NEW_RESOURCE` · `SYSTEM`
---
## 📂 Project Structure
```
resource-reservation-system/
├── prisma/
│   ├── schema.prisma          # Database models
│   └── migrations/            # Migration history
├── public/
│   └── screenshots/           # App screenshots used in README
├── src/
│   ├── app/
│   │   ├── page.tsx           # Public homepage
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── forgot-password/   # Password reset flow
│   │   ├── dashboard/         # User dashboard
│   │   ├── admin/             # Admin panel
│   │   ├── profile/           # User profile
│   │   └── api/               # Next.js API routes
│   │       ├── auth/          # Auth endpoints
│   │       ├── user/          # User-facing endpoints
│   │       └── admin/         # Admin-only endpoints
│   ├── components/            # Shared React components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── NotificationBell.tsx
│   │   └── AvailabilityTimetable.tsx
│   ├── lib/                   # Utilities (Prisma client, session, email)
│   └── generated/             # Prisma generated client
├── .env.example               # Environment variable template
├── next.config.ts
├── prisma7.config.ts
└── package.json
```
---
## 🧑‍💻 Available Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
---
## 🗺️ Roadmap
- [ ] Google OAuth integration (social sign-in)
- [ ] Email reminders before upcoming reservations
- [ ] Recurring reservation support
- [ ] Resource image uploads
- [ ] Export reservations to CSV / iCal
- [ ] Multi-tenant / organisation support
---
## 🔄 Reservation Workflow and Validation

### Booking Flow

1. **Resource Selection** — Users browse resources with optional category and time window filters
2. **Availability Check** — The system checks for existing reservations in the selected time range
3. **Booking Creation** — Users submit reservation requests with:
   - Resource ID
   - Purpose description
   - Start and end times
4. **Conflict Prevention** — Backend validates no overlapping reservations exist
5. **Approval** — Resources requiring admin approval start as `PENDING`; instant-confirmation resources become `CONFIRMED`

### Validation Rules

- **Lead Time**: Reservations must start at least 1 minute in the future (for regular bookings)
- **Active Slots**: For currently active time slots, bookings are adjusted to start 5 minutes from now
- **Time Window**: End time must be after start time
- **Overlap Prevention**: The system prevents double-bookings by checking existing reservations
- **Timezone Consistency**: UI uses local time; backend stores and validates in UTC

### Reservation Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Created, awaiting admin confirmation (for resources requiring approval) |
| `CONFIRMED` | Approved and active (instant-confirmation or admin-approved) |
| `CANCELLED` | Cancelled by user or admin |

---
## 📧 Email and In-App Notifications

### Email Notifications

The system uses `nodemailer` with SMTP to send transactional emails:

- **Password Reset OTP** — One-time password sent when users request a password reset
- **Reservation Status Updates** — Users receive emails when reservations are confirmed or cancelled by admins

#### SMTP Configuration

Email functionality requires the following environment variables:

```env
SMTP_HOST="smtp.example.com"      # SMTP server hostname
SMTP_PORT="587"                   # SMTP port (587 for TLS, 465 for SSL)
SMTP_SECURE="false"               # Set to "true" for SSL (port 465)
SMTP_USER="your-email@example.com" # SMTP username
SMTP_PASS="your-email-password"   # SMTP password (or App Password for Gmail)
SMTP_FROM="noreply@reserveit.local" # From address
```

**Gmail Setup**: If using Gmail, enable 2FA and create an [App Password](https://support.google.com/accounts/answer/185833) for SMTP authentication.

### In-App Notifications

Users receive real-time notifications for:
- Reservation confirmations
- Reservation cancellations
- New resource additions
- System announcements

Notifications are displayed via a bell icon with unread count and can be marked as read individually or all at once.

---
## 🔒 Security and Configuration Notes

### Session Management

- Sessions are stored as HTTP-only cookies to prevent XSS attacks
- Session duration: 7 days
- Sessions are invalidated on logout

### Password Security

- Passwords are hashed using `bcryptjs` before storage
- Password reset OTPs are hashed and time-limited (5 minutes)
- Maximum 5 OTP attempts before lockout

### Role-Based Access Control

- **USER**: Can create/view own reservations, update profile
- **ADMIN**: Full access to all resources, reservations, and users
- Admin role is automatically assigned to emails listed in `ADMIN_EMAILS` on first login

### Environment Variables

Never commit `.env` to version control. Use `.env.example` as a template and keep actual values secret.

---
## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Ensure PostgreSQL is running
- Verify `DATABASE_URL` in `.env` matches your database credentials
- Check that the database exists: `createdb reservation_system`

**Migration Failures**
- Run `npx prisma migrate reset` to reset the database (warning: deletes all data)
- Ensure `DATABASE_URL` is set before running migrations

**Email Not Sending**
- Verify SMTP credentials are correct
- Check that `SMTP_SECURE` matches your port (false for 587, true for 465)
- For Gmail, use an App Password instead of your account password

**Build Errors**
- Run `npm install` to ensure all dependencies are installed
- Run `npx prisma generate` to regenerate the Prisma client
- Clear `.next` folder: `rm -rf .next`

---

<div align="center">
  <sub>Built with ❤️ using Next.js · Prisma · PostgreSQL</sub>
</div>