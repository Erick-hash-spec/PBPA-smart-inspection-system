#!/bin/bash

# Smart Reporting System - Setup Script
# This script sets up the complete system for development

echo "🔷 Smart Petroleum Reporting System - Setup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo -e "${RED}Python is not installed. Please install Python 3.10+${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Setting up Backend...${NC}"

# Create virtual environment
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r ../requirements.txt

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

# Load sample data
echo "Loading sample data..."
python manage.py shell < load_sample_data.py

echo -e "${GREEN}Backend setup complete!${NC}"
echo ""

cd ..

echo -e "${YELLOW}Step 2: Setting up Frontend...${NC}"

cd frontend

# Check if Node.js is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Node.js/npm is not installed. Please install Node.js 16+${NC}"
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Install dependencies
echo "Installing Node dependencies..."
npm install

# Create .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cp .env.example .env
fi

echo -e "${GREEN}Frontend setup complete!${NC}"
echo ""

cd ..

echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "To start development:"
echo ""
echo "1. Backend (Terminal 1):"
echo "   cd backend"
echo "   source venv/Scripts/activate  # On Windows"
echo "   source venv/bin/activate      # On macOS/Linux"
echo "   python manage.py runserver"
echo ""
echo "2. Frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "Access the app at: http://localhost:3000"
echo ""
echo "Demo credentials:"
echo "  Inspector: inspector1 / password123"
echo "  Supervisor: supervisor1 / password123"
echo "  Admin: admin1 / password123"
