# HMS Backend Deployment

## Environment Variables Required
- DATABASE_URL: PostgreSQL connection string (Supabase)
- JWT_SECRET_KEY: JWT signing secret
- FLASK_ENV: production
- FLASK_DEBUG: 0

## Build Command
pip install -r requirements.txt

## Start Command
python app.py

## Health Check
GET /api/health

## Port
5000
