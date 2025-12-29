# Salvtec App Deployment Guide

This guide covers deploying the Salvtec application (frontend + backend) to a Linux VPS using Docker.

For automated CI/CD deployment on every merge to main, see [CI_CD_SETUP.md](CI_CD_SETUP.md).

## Prerequisites

- Linux VPS (Ubuntu/Debian or Alpine Linux)
- At least 2GB RAM, 20GB storage
- Domain name (optional but recommended for SSL)

## Quick Deployment

1. **Connect to your VPS:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Run the deployment script (for Alpine Linux):**
   ```bash
   wget https://raw.githubusercontent.com/your-repo/salvtecapp-be/main/deploy.sh
   chmod +x deploy.sh
   ./deploy.sh
   ```

   *Note: This script is configured for Alpine Linux. For Ubuntu/Debian, you'll need to modify the package manager commands from `apk` to `apt`.*

3. **Clone your repositories:**
   ```bash
   git clone https://github.com/yourusername/salvtecapp-be.git
   git clone https://github.com/yourusername/salvtecapp-fe.git
   cd salvtecapp-be
   ```

4. **Configure environment:**
   ```bash
   cp salvtecapp-be/.env.example salvtecapp-be/.env
   nano salvtecapp-be/.env  # Edit with your values
   ```

5. **Deploy:**
   ```bash
   docker compose up -d --build
   ```

6. **Initialize database:**
   ```bash
   docker compose exec backend npm run initDB
   docker compose exec backend npm run seed
   ```

## Services

- **Frontend:** http://your-server-ip (port 80)
- **Backend API:** http://your-server-ip/api (port 3000, proxied through frontend)
- **MongoDB:** localhost:27017 (internal only)

## SSL Setup (Let's Encrypt)

For Alpine Linux:
```bash
# Install certbot
sudo apk add certbot certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

For Ubuntu/Debian:
```bash
# Install certbot
sudo apt install snapd -y
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com
```

Certbot will automatically update nginx config and set up auto-renewal.

## Useful Commands

```bash
# View logs
docker compose logs -f

# Restart services
docker compose restart

# Update deployment
git pull
docker compose up -d --build

# Backup database
docker compose exec mongodb mongodump --db salvtec --out /backup
```

## Environment Variables

Create `salvtecapp-be/.env` with:

```env
MONGODB_URI=mongodb://admin:password@mongodb:27017/salvtec?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=production
```

## Security Notes

- Change default MongoDB credentials
- Use strong JWT secret
- Keep Docker and system updated
- Use firewall (ufw)
- Consider using Docker secrets for sensitive data

## Troubleshooting

- Check logs: `docker compose logs service-name`
- Verify ports: `sudo netstat -tlnp | grep :80`
- Test API: `curl http://localhost/api/health`