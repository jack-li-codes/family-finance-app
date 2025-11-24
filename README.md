📘 Family Finance App

A clean, fast, and practical household finance management system built for real-life use.

This project is a full-stack Next.js + Supabase application designed to help families track accounts, manage transactions, categorize expenses, and generate monthly insights. It was created as part of a personal initiative to build a real financial tool for daily family use, and later expanded into a fully structured web application.

🚀 Features
🔐 User Authentication

      Secure login & registration via Supabase Auth
      Protected routes with AuthGuard
      Automatic redirect based on login status

💳 Account Management

      Add, edit, and delete multiple accounts
      Track initial balance, initial date, and calculated balance
      Real-time updates using database queries

💰 Transactions

   Record income and expenses with detailed categories
   Supports:
      Income / Expense
      Transfer between accounts
      Custom categories (aligned with Excel financial workflow)
      Data stored and retrieved from Supabase

📊 Statistics & Reports

      Monthly income/expense summary
      Category-based breakdown
      Transfer data automatically excluded from reports

🛠 Project Modules (In Progress & Planned)

      Engineering worklog tracking (time + cost)
      Project materials module
      Client tracking
      Multi-device support
      Mobile UI optimization

🧰 Tech Stack
   
   Frontend
      Next.js (App Router)
      React
      Tailwind CSS
      TypeScript

   Backend / Storage
      Supabase (PostgreSQL)
      Supabase Auth
      Edge Functions (planned)

   Tools
      Vercel Deployment
      GitHub Actions (planned)

📁 Project Structure
      app/                # Next.js App Router pages
      components/         # Reusable UI components
      lib/                # Supabase client & helpers
      supabase/           # Database schema & migrations (sanitized for open source)
      public/             # Static assets

📦 Getting Started
   1. Install dependencies
      npm install

   2. Set environment variables

      Create a .env.local file (not included for security):

      NEXT_PUBLIC_SUPABASE_URL=your-url
      NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
      SUPABASE_SERVICE_ROLE_KEY=your-service-role

  3. Run development server
      npm run dev


      App runs at:
      http://localhost:3000

🌐 Deployment

      This project is deployed on Vercel:

      👉 https://family-finance-app.vercel.app
      (demo)

🎯 Purpose of the Project

      This app was originally developed for real family budgeting needs and later expanded into a fully structured web application. It demonstrates:

      Full-stack engineering ability
      Database schema design
      Authentication flow
      Real-world financial logic
      Practical UI/UX planning
      Independent project planning and execution

      It is suitable for inclusion in résumés, university applications, and portfolio showcases.

🚀 CI/CD with Vercel — 12+ production deployments with automated builds and real-time preview environments.


👤 Author

Jack Li
High school student (Canada)
Aspiring computer science major
Interested in full-stack development, AI tools, and practical software engineering.