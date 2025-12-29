# GitHub Actions CI/CD Setup

This guide explains how to set up automatic deployment to your VPS when pushing to the master branch.

## Prerequisites

1. **Docker Hub Account**: Create one at https://hub.docker.com/
2. **GitHub Repositories**: Your `salvtecapp-be` and `salvtecapp-fe` repos
3. **VPS Access**: SSH key for deployment

## Setup Steps

### 1. Update docker-compose.yml

Replace `your-dockerhub-username` with your actual Docker Hub username in `docker-compose.yml`.

### 2. Create SSH Key for Deployment

On your local machine:
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@yourdomain.com" -f ~/.ssh/github_actions
```

Copy the public key to your VPS:
```bash
ssh-copy-id -i ~/.ssh/github_actions.pub user@your-vps-ip
```

### 3. Set up Environment Variables

Create a `.env` file on your VPS in the `salvtecapp-be` directory:
```bash
cp .env.example .env
# Edit with your actual values
```

**Important**: Never commit the `.env` file to GitHub. Add it to `.gitignore`.

### 3. Add GitHub Secrets to Backend Repository

Go to your `salvtecapp-be` repository → Settings → Secrets and variables → Actions

Add these secrets:
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password (or access token)
- `VPS_HOST`: Your VPS IP address or domain
- `VPS_USERNAME`: SSH username for your VPS
- `VPS_SSH_KEY`: The private SSH key content (from `~/.ssh/github_actions`)

### 4. Add GitHub Secrets to Frontend Repository

Go to your `salvtecapp-fe` repository → Settings → Secrets and variables → Actions

Add these secrets:
- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password (or access token)

### 5. Set up Frontend Workflow

The frontend workflow file has been moved to your `salvtecapp-fe` repository at `.github/workflows/build.yml`. Make sure it's committed to the frontend repository.

### 6. Update Workflow File

In `.github/workflows/deploy.yml`, update the script path:
```yaml
cd /path/to/your/project/salvtecapp-be
```
Replace with the actual path on your VPS where the repositories are cloned.

### 7. Initial Manual Setup on VPS

Clone the repositories on your VPS:
```bash
git clone https://github.com/yourusername/salvtecapp-be.git
git clone https://github.com/yourusername/salvtecapp-fe.git
cd salvtecapp-be
cp .env.example .env
# Edit .env with your actual values
```

### 8. Test the Workflow

Push to the master branch or manually trigger the workflow from GitHub Actions.

## Workflow Explanation

- **Backend Workflow** (`salvtecapp-be`): Builds backend image on BE changes, pulls latest FE image, deploys both
- **Frontend Workflow** (`salvtecapp-fe`): Builds frontend image on FE changes only

This setup ensures efficient builds - only rebuilding what's changed while always deploying the latest versions of both services.

## Security Notes

- Never commit sensitive data to the repository
- Use Docker Hub access tokens instead of passwords
- Regularly rotate SSH keys and tokens
- Monitor GitHub Actions logs for any issues

## Troubleshooting

- Check GitHub Actions logs for build errors
- Verify SSH connection: `ssh -i ~/.ssh/github_actions user@vps`
- Ensure Docker Hub credentials are correct
- Check VPS firewall allows SSH (port 22)