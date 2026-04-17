# Render Worker — TrinketMobile

This folder contains a small Node worker intended to run as a background service (for example on Render or in Docker).

## Files
- `worker.js` — simple Node HTTP worker with:
  - GET `/health` — returns `ok` (HTTP 200)
  - POST `/task` — accepts JSON `{ "name": "..." }` and returns `{ "status": "done", "task": "..." }`
- `package.json` — minimal manifest with `start` script
- `Dockerfile` — lightweight image to build and run the worker

## Run locally
1. From this folder, install deps (none required for the current worker, but safe to run):

```bash
cd /Users/ryanhaviland/TrinketMobile/worker
npm install
```

2. Start the worker:

```bash
npm start
# or
node worker.js
```

3. Health check and example task requests:

```bash
curl http://127.0.0.1:8080/health
curl -X POST http://127.0.0.1:8080/task -H "Content-Type: application/json" -d '{"name":"test-task"}'
```

The worker listens on the port defined by `process.env.PORT` (defaults to `8080`).

## Run with Docker
Build locally:

```bash
docker build -t trinket-worker:latest .
```

Run locally:

```bash
docker run -p 8080:8080 trinket-worker:latest
```

## Deploy to Render
Two options:

1. Deploy from source (Node): create a Render "Web Service" or "Background Worker" and point it at this repository. Set the start command to:

```bash
npm start
```

2. Deploy with Docker: push the built image to a registry (Docker Hub, GitHub Container Registry, etc.) and create a Render service from the image.

Render-specific tips:
- Configure the service to use the `PORT` environment variable (Render sets this automatically).
- Add a health check to `/health` in Render settings.

## Logs
- Locally, start the process without `nohup` to see logs in the terminal.
- When run with `nohup` in the project, logs were written to `/tmp/worker.log` in previous testing steps.

## Troubleshooting
- If port is already in use, change `PORT` env var before starting.
- Check `worker.log` or container logs for stack traces.

## Notes / Next steps
- Add any required dependencies to `package.json` if the worker grows.
- Add CI steps or a small health-monitor if you need higher availability.

