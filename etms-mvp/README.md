# etms-mvp — Local development

Quick notes for running the monorepo locally.

- Install all dependencies (root + client + server):

```powershell
npm run install:all
```

- Start both backend and frontend concurrently:

```powershell
npm run dev
```

- Frontend: Vite serves at `http://localhost:5173/` by default.
- Backend: Express server runs at the port shown in server logs (example: `http://localhost:5003`).

If `npm run dev` only starts one side, make sure you have run `npm run install:all` first so each workspace has its `node_modules`.

To address remaining audit issues in `client` you can run:

```powershell
npm --prefix client audit fix --force
```

Note: `--force` may apply breaking upgrades (for example, upgrading `vite`), so use with caution.
