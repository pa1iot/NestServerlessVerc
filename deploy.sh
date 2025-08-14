#!/bin/bash

# GPS Tracking IoT - Serverless Deployment Script
# This script deploys the application to AWS using Serverless Framework

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
STAGE="dev"
REGION="us-east-1"
VERBOSE=false
SKIP_TESTS=false
SKIP_BUILD=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--stage)
            STAGE="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -s, --stage STAGE     Deployment stage (default: dev)"
            echo "  -r, --region REGION   AWS region (default: us-east-1)"
            echo "  -v, --verbose         Enable verbose output"
            echo "  --skip-tests          Skip running tests"
            echo "  --skip-build          Skip build step"
            echo "  -h, --help            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

print_status "Starting deployment for stage: $STAGE, region: $REGION"

# Check if required tools are installed
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

if ! command -v serverless &> /dev/null && ! command -v sls &> /dev/null; then
    print_error "Serverless Framework is not installed. Install with: npm install -g serverless"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    print_warning "AWS CLI is not installed. Some features may not work properly."
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please copy .env.example to .env and configure it."
    if [ ! -f ".env.example" ]; then
        print_error ".env.example file not found"
        exit 1
    fi
    print_status "Copying .env.example to .env"
    cp .env.example .env
    print_warning "Please edit .env file with your configuration before deploying"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Install dependencies
print_status "Installing dependencies..."
if [ "$VERBOSE" = true ]; then
    npm install
else
    npm install --silent
fi

# Run tests (unless skipped)
if [ "$SKIP_TESTS" = false ]; then
    print_status "Running tests..."
    if [ "$VERBOSE" = true ]; then
        npm test
    else
        npm test --silent
    fi
else
    print_warning "Skipping tests"
fi

# Build the application (unless skipped)
if [ "$SKIP_BUILD" = false ]; then
    print_status "Building application..."
    if [ "$VERBOSE" = true ]; then
        npm run build
    else
        npm run build --silent
    fi
else
    print_warning "Skipping build"
fi

# Generate Prisma client
print_status "Generating Prisma client..."
if [ "$VERBOSE" = true ]; then
    npx prisma generate
else
    npx prisma generate --silent
fi

# Deploy with Serverless Framework
print_status "Deploying to AWS..."
if [ "$VERBOSE" = true ]; then
    sls deploy --stage $STAGE --region $REGION --verbose
else
    sls deploy --stage $STAGE --region $REGION
fi

# Get deployment info
print_status "Getting deployment information..."
DEPLOYMENT_INFO=$(sls info --stage $STAGE --region $REGION)

print_success "Deployment completed successfully!"
echo ""
echo "Deployment Information:"
echo "$DEPLOYMENT_INFO"
echo ""

# Extract API Gateway URL
API_URL=$(echo "$DEPLOYMENT_INFO" | grep -o 'https://[a-zA-Z0-9]*.execute-api.[a-zA-Z0-9-]*.amazonaws.com/[a-zA-Z0-9]*' | head -1)
if [ ! -z "$API_URL" ]; then
    print_success "API Gateway URL: $API_URL"
fi

# Extract WebSocket URL
WS_URL=$(echo "$DEPLOYMENT_INFO" | grep -o 'wss://[a-zA-Z0-9]*.execute-api.[a-zA-Z0-9-]*.amazonaws.com/[a-zA-Z0-9]*' | head -1)
if [ ! -z "$WS_URL" ]; then
    print_success "WebSocket URL: $WS_URL"
fi

print_status "Deployment completed for stage: $STAGE"
print_warning "Don't forget to update your frontend configuration with the new API URLs!"

# Optional: Run database migrations
read -p "Do you want to run database migrations? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Running database migrations..."
    npx prisma migrate deploy
    print_success "Database migrations completed"
fi

print_success "All done! 🚀"