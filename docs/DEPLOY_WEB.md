# Deploy Web to GitHub Pages (Subdomain)

The Expo web app is deployed to GitHub Pages via GitHub Actions. Each push to `main` triggers a build and deploy.

## One-Time Setup

### 1. Enable GitHub Pages

1. Go to your repo **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, select **GitHub Actions**

### 2. Set Your Subdomain

Edit `.github/workflows/deploy-web.yml` and change the subdomain:

```yaml
env:
  CNAME_SUBDOMAIN: arthub.studiobuda.co.il
```

### 3. Configure DNS

In your domain’s DNS settings, add a **CNAME record**:

| Type  | Name  | Value                 |
|-------|-------|-----------------------|
| CNAME | arthub| `yourusername.github.io` |

Replace `arthub` with your subdomain and `yourusername` with your GitHub username.

### 4. Add Custom Domain in GitHub (Optional)

1. In **Settings** → **Pages**, under **Custom domain**
2. Enter your subdomain (e.g. `arthub.studiobuda.co.il`)
3. Click **Save**
4. Enable **Enforce HTTPS** once the DNS record has propagated

## How It Works

1. Push to `main` → workflow runs
2. Installs dependencies, generates icons, builds Expo web
3. Uploads build artifact and deploys to GitHub Pages
4. Site is available at your subdomain after deploy

## Manual Deploy

Trigger a deploy without pushing: **Actions** → **Deploy Web to GitHub Pages** → **Run workflow**
