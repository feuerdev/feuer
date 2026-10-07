# feuer client

React/Vite/Pixi client for Feuer. Run these commands from the repository root:

```bash
npm ci
cp client/.example.env client/.env
npm run dev --workspace=client
```

Set `VITE_SERVER_URL` in `client/.env` to the game server URL. For local development, `VITE_FORCE_AUTH=false` skips Clerk authentication when the server also runs with `FEUER_NODE_ENV=development` and `FEUER_FORCE_AUTH=false`. Production builds require a valid `VITE_CLERK_PUBLISHABLE_KEY` and a server configured for Clerk authentication.

```bash
npm run build --workspace=client
npm run lint --workspace=client
```

The client requires a running game server. The server defaults to `127.0.0.1`; set `FEUER_HOST` explicitly when hosting it. Server startup requires an available database unless `FEUER_WORLD_PERSISTENCE=false` is explicitly set for local development.
