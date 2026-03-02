#!/bin/bash
# Health check script for server monitoring

check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "✓ Port $port is active"
        return 0
    else
        echo "✗ Port $port is not active"
        return 1
    fi
}

check_api() {
    local url=$1
    if curl -s -f "$url/api/health" > /dev/null 2>&1; then
        echo "✓ API health check passed"
        return 0
    else
        echo "✗ API health check failed"
        return 1
    fi
}

echo "=== Server Health Check ==="
echo "Time: $(date)"

check_port 5000 && check_api "http://localhost:5000"
check_port 5173
check_port 5177

echo "=========================="
