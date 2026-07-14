# Deploy na Vercel

## Projeto

Configure a Vercel apontando para a raiz do repositório.

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run db:generate && npm run build --workspace @fleetcontrol/web`
- Output Directory: `apps/web/.next`

Todo push e pull request no GitHub gera Preview Deployment. A branch principal deve ser usada como Production Deployment.

## Variáveis do Frontend na Vercel

Cadastre no projeto Vercel:

```bash
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
API_URL=https://sua-api-publica.com
```

`API_URL` deve apontar para a implantação Vercel da API NestJS FleetControl (com banco, Auth e Storage no Supabase). O frontend usa rewrites para encaminhar `/api/*` para `${API_URL}/api/*`, mantendo cookies HTTP-only no fluxo de autenticação. Nenhuma variável ou URL do Railway é necessária.

## Variáveis da API

Cadastre no ambiente onde a API NestJS estiver publicada:

```bash
NODE_ENV=production
APP_URL=https://seu-dominio.vercel.app
API_URL=https://sua-api-publica.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
PASSWORD_RESET_SECRET=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
JWT_REMEMBER_ME_REFRESH_TTL=30d
COOKIE_SECURE=true
COOKIE_DOMAIN=
LOCAL_STORAGE_PATH=./uploads
STORAGE_DRIVER=s3
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=
```

Para criar o primeiro administrador, preencha uma única vez:

```bash
BOOTSTRAP_COMPANY_NAME=
BOOTSTRAP_ADMIN_NAME=
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

Depois execute:

```bash
npm run db:deploy
npm run db:seed
```

## Primeiro Deploy

Com o repositório conectado à Vercel:

```bash
npm run db:generate
npm run build --workspace @fleetcontrol/web
```

Para produção, faça merge na branch principal. Para preview, abra um Pull Request.
