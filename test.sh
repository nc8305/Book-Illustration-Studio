#!/bin/bash
# Script to run automated tests for Backend and Frontend

echo "=== Running Backend Tests (State Machine & Pipeline) ==="
cd backend
npm test
BACKEND_STATUS=$?

echo ""
echo "=== Running Frontend Tests (React UI Components) ==="
cd ../frontend
npm test
FRONTEND_STATUS=$?

echo ""
if [ $BACKEND_STATUS -eq 0 ] && [ $FRONTEND_STATUS -eq 0 ]; then
  echo "✅ All tests passed successfully!"
  exit 0
else
  echo "❌ Some tests failed. Check the output above."
  exit 1
fi
