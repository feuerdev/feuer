# feuer.io

Description: A web based MMORTS game in medieval setting.

Try the current build at https://feuer.io

## Source and project status

This checkout follows the `dev` code line: more game mechanics, Clerk authentication and optional PostgreSQL world snapshots. `master` has the older sprite-based presentation and Firebase integration. Historical demo URLs above are not a guarantee that either deployment is currently available.

This is a prototype without an automated game regression suite. See [the bounded portfolio-demo plan](docs/project-readiness.md) before extending the feature backlog.

## Local setup and checks

Install dependencies from the workspace root with `npm ci`. The repository's `.nvmrc` requests Node 22.11.0; verification on another Node version must be recorded separately.

```bash
cp client/.example.env client/.env
cp server/example.env server/.env
npm ci
npm run build
```

The build compiles the client and server sequentially. It does not start services. Client output is `client/dist/`; the server start command expects `server/dist/server/src/main.js`.

For a development-only game, remove placeholder Clerk/database credentials from the environment copies. Use `VITE_FORCE_AUTH=false`, `FEUER_FORCE_AUTH=false`, `FEUER_WORLD_PERSISTENCE=false`, and explicitly set `FEUER_NODE_ENV=development`. Set `VITE_SERVER_URL` to the server's port and `FEUER_CLIENT_URLS` to the client's exact origin. Production builds require a genuine Clerk publishable key; the backend requires the corresponding private configuration. Do not commit either environment file.

The existing server listens by port without an explicit loopback host. Do not start it on a shared VPS until host binding is added and verified. Client-only previews must bind to `127.0.0.1`, for example `npm run preview --workspace=client -- --host 127.0.0.1`. A client preview alone does not verify multiplayer behavior.

Useful focused checks:

```bash
npm run build --workspace=client
npm run build --workspace=@feuer/server
npm run lint --workspace=client
```

Features:
- Client/Server Multiplayer
- Procedurally Generated Map
- Hexagonal Tile System
- Firebase Authentication + Custom Database
- A\* Pathfinding
- Client/Server Code Sharing
- HTML5 Canvas graphics using pixi.js
- CI/CD leveraging
- Static Code Analysis using SonarQube
- Automated deployment using Jenkins, Docker, managed services

Languages, Frameworks:
- Next.js
- Typescript
- Node.js
- vite
- React.js
- Socket.io
- TailwindCSS

Services used:
- Planetscale (hosted DB)
- Firebase Auth (hosted Auth)
- render.com (hosted Node Server)
