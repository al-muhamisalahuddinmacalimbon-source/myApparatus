# myApparatus

A full-stack, web-based laboratory equipment borrowing system designed for the **Department of Materials and Resources Engineering and Technology** at **Mindanao State University – Iligan Institute of Technology (MSU-IIT)**.

---

## 📌 Overview

**myApparatus** simplifies and digitizes the physical equipment borrowing workflow for laboratory operations. Students can authenticate using their Student ID, browse available equipment stock in real-time, generate digital borrower slips, and submit requests directly to a PostgreSQL backend. Laboratory technicians can manage and monitor active loans through an administrative dashboard.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, Lucide React
- **Backend & Database:** Node.js API Routes, PostgreSQL 18, `pg` (Connection Pooling)
- **Design & Prototyping:** Figma

---

## ✨ Key Features

- **Student Authentication:** Secure lookup via Student ID (`/api/students/[id]`) with session management.
- **Real-Time Catalog:** Interactive equipment inventory with real-time stock counts, search, and category filtering (`/api/apparatus/list`).
- **Cart & Borrower Slip:** Dynamic cart drawer that calculates quantities and generates digital borrower slips submitted directly to PostgreSQL (`/api/borrow/submit`).
- **Technician / Admin Dashboard:** Monitoring log tracking active loans, due dates, borrower details, and current checkouts (`/api/admin/active-loans`).

---

## 📂 Project Progress

- [x] GitHub repository and project scaffolding
- [x] Figma design and UI/UX prototyping
- [x] Frontend screens (Login, Home, Catalog, Cart Drawer, Borrower Slip, Admin Dashboard)
- [x] PostgreSQL database schema setup and seed data
- [x] Integrated REST API routes (`/api/...`) connecting UI directly to database

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.x or higher)
- **PostgreSQL** (v16 or v18)

### 1. Database Setup

Create a PostgreSQL database named `myapparatus` and run your seed script:

```bash
psql -U postgres -d myapparatus -f database/seeds/001_seed.sql
