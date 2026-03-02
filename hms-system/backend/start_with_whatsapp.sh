#!/bin/bash

# Hospital Management System - WhatsApp Integrated Backend Startup Script

echo "=========================================="
echo "Starting HMS Backend with WhatsApp Integration"
echo "=========================================="

# Navigate to backend directory
cd /home/ubuntu/Downloads/kimi_clone/hms-system/backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "   Copy from .env.example and add WhatsApp credentials"
    cp .env.example .env
    echo "   Created .env from .env.example"
    echo "   Please edit .env with your WhatsApp credentials"
fi

# Check if venv is activated
if [ -z "$VIRTUAL_ENV" ]; then
    echo "Activating Python virtual environment..."
    source /home/ubuntu/Downloads/kimi_clone/.venv/bin/activate
fi

# Display configuration status
echo ""
echo "Configuration Status:"
echo "===================="

if grep -q "WHATSAPP_PHONE_NUMBER_ID=" .env; then
    if grep -q "WHATSAPP_PHONE_NUMBER_ID=$" .env || grep -q "WHATSAPP_PHONE_NUMBER_ID=\$" .env; then
        echo "❌ WHATSAPP_PHONE_NUMBER_ID: Not configured (empty value)"
    else
        PHONE_ID=$(grep "WHATSAPP_PHONE_NUMBER_ID=" .env | cut -d'=' -f2 | head -1)
        if [ ! -z "$PHONE_ID" ]; then
            echo "✓ WHATSAPP_PHONE_NUMBER_ID: Configured"
        fi
    fi
else
    echo "❌ WHATSAPP_PHONE_NUMBER_ID: Not found in .env"
fi

if grep -q "WHATSAPP_ACCESS_TOKEN=" .env; then
    TOKEN=$(grep "WHATSAPP_ACCESS_TOKEN=" .env | cut -d'=' -f2 | head -1)
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "$" ]; then
        echo "✓ WHATSAPP_ACCESS_TOKEN: Configured"
    else
        echo "❌ WHATSAPP_ACCESS_TOKEN: Not configured (empty value)"
    fi
else
    echo "❌ WHATSAPP_ACCESS_TOKEN: Not found in .env"
fi

echo ""
echo "Starting Flask backend..."
echo "=========================================="
echo ""

# Start the backend
python3 app.py

