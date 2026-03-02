#!/bin/bash

# Hospital Management System - Supabase Deployment Script
# ======================================================

set -e

echo "🚀 Starting Supabase Deployment for HMS Backend..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if we have the required environment variables
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "❌ SUPABASE_PROJECT_REF environment variable not set"
    echo "Please set it: export SUPABASE_PROJECT_REF=your-project-ref"
    exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN environment variable not set"
    echo "Please set it: export SUPABASE_ACCESS_TOKEN=your-access-token"
    exit 1
fi

echo "✅ Environment variables found"

# Login to Supabase
echo "🔐 Logging into Supabase..."
supabase login --token $SUPABASE_ACCESS_TOKEN

# Link to project
echo "🔗 Linking to Supabase project..."
supabase link --project-ref $SUPABASE_PROJECT_REF

# Deploy database schema
echo "🗄️ Deploying database schema..."
supabase db push

# Deploy database functions (if any)
if [ -d "supabase/functions" ]; then
    echo "⚡ Deploying database functions..."
    supabase functions deploy
fi

# Deploy edge functions (if any)
if [ -d "supabase/edge-functions" ]; then
    echo "🚀 Deploying edge functions..."
    supabase edge-functions deploy
fi

echo "✅ Database deployment completed!"

# Now deploy the backend to Render (or your preferred platform)
echo "🌐 Ready to deploy backend to Render/Railway/etc."
echo "Make sure to set the following environment variables:"
echo "- DATABASE_URL (from Supabase)"
echo "- SECRET_KEY"
echo "- JWT_SECRET_KEY"
echo "- CORS_ORIGINS"

echo "🎉 Supabase deployment completed successfully!"
