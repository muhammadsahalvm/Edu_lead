# EduLead — Production Deployment Guide

This guide details the complete deployment process for **EduLead Admissions Lead Management System** across free-tier production infrastructure:
- **Backend API**: Hosted on [Render](https://render.com) (Django + Gunicorn + WhiteNoise)
- **Frontend SPA**: Hosted on [Vercel](https://vercel.com) (React 19 + Vite)
- **Database**: Cloud MySQL via [TiDB Cloud Serverless](https://tidbcloud.com) (100% MySQL compatible, perpetual free tier with 5 GB storage and SSL)

---

## Architecture Overview

```
                      ┌────────────────────────────┐
                      │    Vercel (Frontend)       │
                      │  https://<app>.vercel.app  │
                      └─────────────┬──────────────┘
                                    │ HTTPS (REST API)
                                    ▼
                      ┌────────────────────────────┐
                      │     Render (Backend API)   │
                      │ https://<api>.onrender.com │
                      └─────────────┬──────────────┘
                                    │ TLS / SSL
                                    ▼
                      ┌────────────────────────────┐
                      │ TiDB Cloud Serverless MySQL│
                      │   edulead_db (Port 4000)   │
                      └────────────────────────────┘
```

---

## Step 1: Database Setup (TiDB Cloud Serverless MySQL)

1. Sign up or log into [TiDB Cloud](https://tidbcloud.com/).
2. Click **Create Cluster** and select **Serverless** (Free tier).
3. Name your cluster (e.g. `edulead-db`) and select your nearest region.
4. Once provisioned, click **Connect**:
   - Connection Type: **General**
   - Note your **Host**, **Port** (usually `4000`), **User**, and **Password**.
   - Copy the standard MySQL connection string format:
     ```
     mysql://<USER>:<PASSWORD>@<HOST>:4000/edulead_db?ssl-mode=REQUIRED
     ```
5. In the TiDB Cloud Web SQL console (or via MySQL workbench), create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS edulead_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

---

## Step 2: Backend API Deployment (Render)

1. Push latest code to GitHub:
   ```bash
   git add .
   git commit -m "chore: deployment configuration for Render and Vercel"
   git push origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository `muhammadsahalvm/Edu_lead`.
5. Configure the service settings:
   - **Name**: `edulead-api`
   - **Region**: Choose closest to your database (e.g. Frankfurt or Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `./build.sh` (or `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`)
   - **Start Command**: `gunicorn edulead_api.wsgi:application`
   - **Instance Type**: `Free`
6. Under **Environment Variables**, add:
   | Key | Value / Description |
   |---|---|
   | `PYTHON_VERSION` | `3.11.9` |
   | `DEBUG` | `False` |
   | `SECRET_KEY` | Generate a 50-character random key or click Render's generate |
   | `ALLOWED_HOSTS` | `.onrender.com,localhost,127.0.0.1` |
   | `DATABASE_URL` | Your TiDB Cloud or MySQL URL string: `mysql://<USER>:<PASSWORD>@<HOST>:4000/edulead_db?ssl-mode=REQUIRED` |
   | `DB_SSL` | `True` |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,https://<your-vercel-app>.vercel.app` (update once Vercel is created) |
   | `CSRF_TRUSTED_ORIGINS` | `https://<your-vercel-app>.vercel.app` |
7. Click **Create Web Service**.
8. Once deployed, test your API health endpoint:
   ```bash
   curl https://<your-render-url>.onrender.com/api/health/
   ```
   Should return: `{"status": "healthy", "service": "EduLead Admission Lead Management API", "version": "1.0.0"}`

### Seed Demo Data & Superuser on Render
In Render dashboard, navigate to your Web Service → **Shell** tab:
```bash
# Seed initial courses, counsellors, and admissions manager
python manage.py seed_demo_data

# (Optional) Create superuser
python manage.py createsuperuser
```

---

## Step 3: Frontend Deployment (Vercel)

1. Log into [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository `muhammadsahalvm/Edu_lead`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | Your live Render backend URL: `https://<your-render-url>.onrender.com` (do not include trailing slash) |
6. Click **Deploy**.
7. Vercel will build and deploy the React 19 app.

---

## Step 4: Final Cross-Origin Handshake

Once you have your Vercel URL (e.g. `https://edulead-frontend.vercel.app`):
1. Go back to Render Dashboard → `edulead-api` → **Environment**.
2. Update:
   - `CORS_ALLOWED_ORIGINS`: `http://localhost:5173,https://edulead-frontend.vercel.app`
   - `CSRF_TRUSTED_ORIGINS`: `https://edulead-frontend.vercel.app`
3. Render will automatically redeploy with the updated CORS configuration.

---

## Step 5: Verification & Smoke Test

Open your Vercel URL and verify:
1. **Login Page**:
   - Log in with manager credentials:
     - Username: `manager_priya`
     - Password: `Password@123`
2. **Dashboard**:
   - Verify metrics cards, funnel chart, source attribution chart, and counsellor workload table load correctly.
3. **Leads Management**:
   - Navigate to `/leads`. Check list filters, search, and click into a lead detail page.
   - Verify the audit timeline and stage transition modals work.
4. **Follow-Ups**:
   - Navigate to `/followups`. Schedule a follow-up interaction and mark one as completed.
