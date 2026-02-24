#!/bin/bash
set -e
echo "Starting Prod Simulation..."
make prod
echo "✅ Prod simulation is ready."
echo "Frontend: https://app.rms.com:8443"
echo "Backend : https://api.rms.com:8443"
echo "Note: Make sure to add '127.0.0.1 app.rms.com api.rms.com' to your /etc/hosts"
