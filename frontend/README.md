# CrowdFlow | Premium Crowdfunding Platform (PERN Stack)

CrowdFlow is a production-quality, trust-verified crowdfunding platform designed to look like a modern SaaS startup product. It is built using the PERN stack (PostgreSQL, Express.js, React, Node.js) with Prisma ORM.

---

## Tech Stack & Highlights

- **Frontend:** React, Vite, Tailwind CSS, Lucide Icons, Recharts (visual statistics), Framer Motion (micro-animations)
- **Backend:** Node.js, Express.js, Winston Logger (centralized logs)
- **Database & ORM:** PostgreSQL, Prisma (Decimal database fields for precise currency handling)
- **Authentication & Security:** JWT Auth (with role-based access controllers), Bcryptjs, Express Rate Limiting
- **File Uploads:** Multer (local disk storage with size and file extension checks)
- **PDF Generation:** PDFKit (generates downloadable donation receipts dynamically)

---

## Features

- **Authentication & Authorization:** Secure Login, Registration, Forgot Password, and Profile settings. Separate roles: Admin, Campaign Creator, and Donor.
- **Mock KYC Verification:** Creators must submit identity documents for Admin review and approval before they can launch campaign cards.
- **Dynamic Trust Score & Verification:** Creators and Campaigns get a dynamic trust score (0 to 100) calculated based on completed campaigns, updates, flags, and reports.
- **Campaign CRUD & Approval:** Campaigns start in a `PENDING` draft state, reviewed and approved/rejected by Admin.
- **Donation Processing & PDF Receipts:** Secure donations with options for anonymity. Generates invoice receipt PDFs on the fly using PDFKit for download.
- **Gamified Badges:** Earn contributor achievements ("First Contribution", "Super Donor", "Philanthropist") dynamically based on donation history.
- **Creator Dashboard:** Analytics charts showing fundraising trends (Recharts area maps), campaign management tools, and update publishers.
- **Donor Dashboard:** View metrics, history logs, bookmarked listings, followed creators, and download receipt PDFs.
- **Admin Dashboard:** Review pending KYC documents, approve/reject campaign drafts, toggle user suspension states, resolve reports, and inspect audit trail logs.
- **Auditable System Logs:** Centralized `AdminLog` database record tracking all admin moderation activities.

---

## Folder Structure

```
f:\demo_c/
├── backend/
│   ├── logs/                   # Winston output log files
│   ├── prisma/                 # Prisma database schema and seed script
│   ├── receipts/               # Generated invoice receipt PDF files
│   ├── uploads/                # Avatar, campaign cover, and KYC file uploads
│   └── src/
│       ├── config/             # DB and Winston logger instantiation
│       ├── controllers/        # Express REST API controllers
│       ├── middleware/         # Auth, Upload, rate limiters, and error handlers
│       ├── routes/             # Routes (Auth, User, Campaign, Donation, Admin)
│       └── utils/              # Validators, dynamic Trust Score formulas
└── frontend/
    ├── src/
    │   ├── components/         # Reusable widgets (Navbar, Footer, ProgressBar)
    │   ├── context/            # AuthContext API requests interceptors
    │   ├── pages/              # Landing page, Dashboards, Details, Auth, KYC
    │   └── utils/              # Lazy loading setup
    └── vercel.json             # Vercel SPA rewrites config
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL server (running on port 5432)

### 1. Database Configuration
Create a PostgreSQL database named `crowdfunding_platform`. Configure the `DATABASE_URL` credentials inside the environment configuration.

### 2. Backend Setup
1. Open a terminal in `backend/`.
2. Create a `.env` file from `.env.example`:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/crowdfunding_platform?schema=public
   JWT_SECRET=super_secret_key_change_me_in_production
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:5173
   UPLOAD_PATH=uploads/
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Sync the database schema and generate the Prisma Client:
   ```bash
   npx prisma db push
   ```
5. Seed database with test users, campaigns, and badges:
   ```bash
   npx prisma db seed
   ```
6. Start development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open a terminal in `frontend/`.
2. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Open browser at `http://localhost:5173`.

---

## Seed Accounts (Password: `password123`)

- **Admin Account:** `admin@crowdflow.com`
- **Creator 1 (Verified):** `creator1@crowdflow.com`
- **Creator 2 (Verified):** `creator2@crowdflow.com`
- **Creator 3 (KYC Pending):** `creator3@crowdflow.com`
- **Donors:** `donor1@crowdflow.com` through `donor5@crowdflow.com`

---

## Deployment Guide

### Frontend (Vercel)
The project includes a `vercel.json` file. Import the `frontend` folder to Vercel, link the `VITE_API_URL` environment variable to the hosted backend API url, and deploy.

### Backend (Render)
1. Set up a Web Service on Render pointing to the `backend` folder.
2. In Environment settings, configure environment variables: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, and `UPLOAD_PATH`.
3. Set Build Command: `npm install && npx prisma generate`
4. Set Start Command: `npm start`
