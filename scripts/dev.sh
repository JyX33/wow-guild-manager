#!/bin/bash

PROJECT_ROOT="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")"
LOGS_DIR="$PROJECT_ROOT/logs"
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
BACKEND_PID_FILE="$PROJECT_ROOT/.backend.pid"
FRONTEND_PID_FILE="$PROJECT_ROOT/.frontend.pid"

# Create logs directory if it doesn't exist
mkdir -p $LOGS_DIR

start_services() {
    echo "🚀 Starting development environment..."
    
    # Start backend
    echo "📡 Starting backend server..."
    if cd "$PROJECT_ROOT/backend"; then
        bun run dev > $BACKEND_LOG 2>&1 &
        echo $! > $BACKEND_PID_FILE
        cd "$PROJECT_ROOT"
        echo "✅ Backend server started! Logs: $BACKEND_LOG"
    else
        echo "⚠️ Failed to change to backend directory!"
        return 1
    fi
    
    # Start frontend
    echo "🖥️ Starting frontend dev server..."
    if cd "$PROJECT_ROOT/frontend"; then
        bun run dev > $FRONTEND_LOG 2>&1 &
        echo $! > $FRONTEND_PID_FILE
        cd "$PROJECT_ROOT"
        echo "✅ Frontend dev server started! Logs: $FRONTEND_LOG"
    else
        echo "⚠️ Failed to change to frontend directory!"
        return 1
    fi
    
    echo "🎮 Development environment is running!"
    echo "🔍 View logs in $LOGS_DIR directory"
}

stop_services() {
    echo "🛑 Stopping development environment..."
    
    # Stop backend
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat $BACKEND_PID_FILE)
        if ps -p $PID > /dev/null; then
            echo "📡 Stopping backend server..."
            kill $PID
            echo "✅ Backend server stopped!"
        else
            echo "⚠️ Backend server was not running!"
        fi
        rm $BACKEND_PID_FILE
    else
        echo "⚠️ Backend server was not running!"
    fi
    
    # Stop frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat $FRONTEND_PID_FILE)
        if ps -p $PID > /dev/null; then
            echo "🖥️ Stopping frontend dev server..."
            kill $PID
            echo "✅ Frontend dev server stopped!"
        else
            echo "⚠️ Frontend dev server was not running!"
        fi
        rm $FRONTEND_PID_FILE
    else
        echo "⚠️ Frontend dev server was not running!"
    fi
    
    echo "👋 Development environment stopped!"
}

# Check for command line arguments
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac

exit 0