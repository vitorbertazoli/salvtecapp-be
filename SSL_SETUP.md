# SSL Certificate Setup for Alpine Linux

## 🚀 **Recommended: Host-Level SSL with Reverse Proxy**

Since your frontend uses Nginx in a Docker container, the **cleanest approach** is to set up SSL on the host and reverse proxy to your containers.

### 1. Install Nginx on Host
```bash
sudo apk add nginx
sudo rc-update add nginx
sudo service nginx start
```

### 2. Install Certbot
```bash
sudo apk add certbot certbot-nginx
```

### 3. Create Nginx Reverse Proxy Config
```bash
sudo nano /etc/nginx/http.d/default.conf
```

Add this configuration:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Proxy to your frontend container
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com
```

### 5. Update Docker Compose
Remove the port mapping from frontend since Nginx on host will handle it:
```yaml
# docker-compose.yml
frontend:
  # Remove this line:
  # ports:
  #   - "80:80"
  expose:
    - "80"
```

### 6. Update Host Nginx to Proxy to Containers
The config above assumes your containers are accessible on localhost ports. If they're on different ports, adjust accordingly.

## Alternative: Container-Level SSL

If you prefer SSL inside the container:

### 1. Modify Frontend Dockerfile
```dockerfile
# Add SSL certificates to container
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL certificates (mount as volume or copy during build)
COPY ssl/fullchain.pem /etc/ssl/certs/
COPY ssl/privkey.pem /etc/ssl/private/

EXPOSE 80 443
```

### 2. Update Nginx Config in Container
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://backend:3000;
        # ... proxy settings
    }
}
```

### 3. Update Docker Compose
```yaml
frontend:
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./ssl:/etc/ssl:ro
```

## Option 1: Let's Encrypt (Free, Recommended for Production)

### 1. Install Certbot
```bash
sudo apk add certbot certbot-nginx
```

### 2. Get SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com
```

### 3. Update Nginx Configuration
Certbot will automatically update your Nginx config. If you need manual config:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Your existing config...
    location / {
        proxy_pass http://localhost:80;  # Point to your app
        # ... rest of config
    }
}
```

### 4. Auto-Renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 2: Self-Signed Certificate (For Testing)

### 1. Generate Self-Signed Certificate
```bash
sudo apk add openssl
sudo mkdir -p /etc/ssl/private
sudo chmod 700 /etc/ssl/private

# Generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/selfsigned.key \
  -out /etc/ssl/certs/selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### 2. Update Nginx Config
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/selfsigned.key;

    # Your app config...
}
```

## Option 3: Docker-based SSL

If you want SSL handled by Docker, you can use a reverse proxy with SSL:

### 1. Use Traefik or Caddy
```yaml
# Add to docker-compose.yml
services:
  traefik:
    image: traefik:v2.5
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.httpchallenge=true"
      - "--certificatesresolvers.myresolver.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.myresolver.acme.email=your@email.com"
      - "--certificatesresolvers.myresolver.acme.storage=/letsencrypt/acme.json"
    ports:
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - traefik_certificates:/letsencrypt
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.api.tls.certresolver=myresolver"

  # Update your frontend service
  frontend:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.frontend.tls.certresolver=myresolver"
```

## Security Best Practices

1. **Use strong ciphers**: TLS 1.2/1.3 only
2. **Enable HSTS**: Add `add_header Strict-Transport-Security "max-age=31536000";`
3. **Redirect HTTP to HTTPS**: Always redirect port 80 to 443
4. **Regular renewal**: Let's Encrypt certs expire every 90 days
5. **Monitor certificates**: Set up alerts for expiration

## Testing SSL

```bash
# Test certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check SSL rating
curl -I https://yourdomain.com

# SSL Labs test
# Visit: https://www.ssllabs.com/ssltest/
```

## Domain Requirements

- **DNS**: Point your domain to your VPS IP
- **Firewall**: Allow ports 80 and 443
- **HTTP-01 Challenge**: Certbot needs port 80 accessible for verification

Choose **Host-Level SSL with Reverse Proxy** for your containerized setup - it's the most maintainable approach! 🔒