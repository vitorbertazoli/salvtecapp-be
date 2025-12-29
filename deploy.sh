#!/bin/bash

# Update system
sudo apk update && sudo apk upgrade

# Install Docker and Docker Compose
sudo apk add docker docker-compose

# Start Docker service
sudo service docker start
sudo rc-update add docker

# Add user to docker group (optional, replace 'user' with your username)
# sudo usermod -aG docker $USER

# Clone your repositories (replace with your repo URLs)
# git clone https://github.com/yourusername/salvtecapp-be.git
# git clone https://github.com/yourusername/salvtecapp-fe.git
# cd salvtecapp-be

# Copy environment file
cp .env.example .env
# Edit .env with your actual values

# Build and run
docker compose up -d --build

# Initialize database (run after first startup)
# docker compose exec backend npm run initDB
# docker compose exec backend npm run seed

echo "Deployment complete!"
echo "Frontend: http://your-server-ip"
echo "Backend API: http://your-server-ip/api"