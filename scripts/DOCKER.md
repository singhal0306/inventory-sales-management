# Docker setup

The repository has two independent images:

| Application | Dockerfile | Build context | Container port |
| --- | --- | --- | --- |
| Express backend | `Dockerfile` | repository root | `5000` |
| React frontend | `client/Dockerfile` | `client/` | `8080` |

The backend uses Node.js 22 and production dependencies installed with `npm ci`. The frontend builds with Node.js 22, then copies only the compiled assets into an [unprivileged Nginx image](https://github.com/nginx/docker-nginx-unprivileged). Both runtime processes run as non-root users. Dependency installation and runtime files use separate stages, following [Docker's build guidance](https://docs.docker.com/build/building/best-practices/).

The frontend forwards `/api/` requests to the backend, so the existing relative Axios URLs and cookie authentication work through one browser origin. The CRA `proxy` setting is only used by the development server; Nginx handles it in this image. React Router URLs fall back to `index.html`, hashed static assets receive long-lived cache headers, and HTML is revalidated.

## Start with Docker Compose

The root `compose.yaml` builds both images, creates their shared network, and publishes the frontend at `http://localhost:8080`. It connects the backend to your existing MongoDB using the root `.env` file.

If you do not already have `.env`, prepare it from the repository root:

```sh
cp .env.docker.sample .env
```

Edit `.env` with your actual `mongoUrl` and a strong `jwtSecret`, then start the applications:

```sh
docker compose up --build -d
```

The sample uses local HTTP settings. For production HTTPS, change both environment modes and the browser origin as described below. Values containing a literal `$` should be single-quoted in the environment file so Compose does not interpolate them.

Compose starts the frontend after the backend passes its Dockerfile health check, using [`depends_on: condition: service_healthy`](https://docs.docker.com/compose/how-tos/startup-order). Both services restart unless explicitly stopped. The backend runs with an init process, and its internal port is fixed to 5000 by the Compose file to match the frontend proxy. Its port is available inside the Docker network; only frontend port 8080 is published to the host.

Manage the stack with:

```sh
docker compose ps
docker compose logs -f --tail=100
docker compose down
```

Stopping this stack leaves your external MongoDB database running. Compose creates the network `stockroom_stockroom`; an existing MongoDB container can join that network and be addressed by its network alias. Docker Desktop provides `host.docker.internal` for a database running on your host.

For host-based MongoDB on Linux Docker Engine, add this configuration under the `backend` service:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Access from another device on your network

Open `http://<server-LAN-IP>:8080`, for example `http://192.168.1.5:8080`. Browser API requests remain relative to that origin; `BACKEND_URL` remains `http://backend:5000` inside Docker.

For local HTTP, use these settings in the root `.env`, replacing the example address with your server's address:

```dotenv
NODE_ENV=development
nodeEnv=development
clientOrigin=http://localhost:8080,http://192.168.1.5:8080
cookieSameSite=lax
```

After an environment change, recreate the backend with `docker compose up -d --force-recreate backend`. After a frontend source change, rebuild it with `docker compose up -d --build frontend`, then reload the browser.

The frontend generates tracing IDs with `crypto.getRandomValues()`, which works on HTTP LAN origins. `crypto.randomUUID()` requires a secure context and must not be required before sending an API request. If tracing APIs are unavailable, requests still proceed and the backend generates their tracing context. Blocked browser session storage uses an in-memory client ID.

If sign-in fails, first check that the browser actually sends `POST /api/user/login`. `GET /` only confirms the greeting endpoint responds; database readiness is checked at `/api/health`. A successful login followed by `GET /api/user/getuser` returning 401 instead suggests a missing session cookie; check that local HTTP is not configured with production mode or `cookieSameSite=none`, both of which require Secure cookies. For production access, use HTTPS with production mode.

The manual build and `docker run` instructions below provide an alternative way to launch the same images.

## Build

Run these commands from the repository root:

```sh
docker build -t stockroom-backend .
docker build -t stockroom-frontend ./client
```

Local `node_modules`, build outputs, environment files, and common credential/configuration directories are excluded from the build contexts. Backend source is copied explicitly. Frontend secrets are not injected into the build, and source maps are disabled.

## Run locally with your existing MongoDB

Create a separate environment file:

```sh
cp .env.docker.sample .env.docker
```

Edit `.env.docker` with your MongoDB URI and a strong signing secret. For local HTTP access use:

```dotenv
NODE_ENV=development
nodeEnv=development
port=5000
clientOrigin=http://localhost:8080
cookieSameSite=lax
LOG_LEVEL=info
SERVICE_NAME=inventory-sales-management-api
mongoUrl=mongodb://host.docker.internal:27017/inventory_sales
jwtSecret=replace-with-a-long-random-secret
```

Use your actual database URI, including credentials where required. For MongoDB running on your Mac or Windows host, `host.docker.internal` reaches the host from Docker Desktop. `localhost` inside a container refers to that container. For an existing MongoDB container, connect it to the same Docker network and use its network alias in the URI. For a hosted database, use its supplied URI and allow the Docker host's outbound address as required by the provider.

Create a network and start both containers:

```sh
docker network create stockroom

docker run -d --name backend --network stockroom --init \
  --restart unless-stopped --env-file .env.docker \
  stockroom-backend

docker run -d --name frontend --network stockroom \
  --restart unless-stopped -p 8080:8080 \
  -e BACKEND_URL=http://backend:5000 \
  stockroom-frontend
```

Open `http://localhost:8080`. The browser sends `/api` requests to that address, and Nginx forwards them over the Docker network. The backend port does not need to be published to the host.

On Linux Docker Engine, add `--add-host=host.docker.internal:host-gateway` to the backend `docker run` command if using the host-based MongoDB URI. MongoDB must listen on an address reachable from the container and permit the connection.

`.env.docker` is ignored by Git and Docker. It is passed at runtime rather than copied into either image.

## Runtime configuration

Backend configuration uses the existing environment variables documented in the root README. The image defaults to `port=5000`; supply `NODE_ENV`, `nodeEnv`, `mongoUrl`, and `jwtSecret` at runtime. Compose reads the root `.env`; the manual `docker run` example above reads `.env.docker`. Set `clientOrigin` to the exact browser origin, including the port when applicable.

The frontend accepts `BACKEND_URL` at startup. Its default is `http://backend:5000`, where `backend` is a container name or network alias on the same user-defined Docker network. Use an HTTP origin without a path or trailing slash, and update the port if you override the backend's `port`. Nginx resolves this address using Docker DNS; it is not a browser-facing API URL. No frontend rebuild is needed to change it.

For production, set both `NODE_ENV` and `nodeEnv` to `production`, configure `clientOrigin` with your HTTPS frontend origin, and terminate HTTPS at your ingress, reverse proxy, or hosting platform. The frontend container listens on HTTP port 8080 internally. The application's production cookies are marked Secure, so users must access the application over HTTPS. The development settings above are for local HTTP use.

Images currently use maintained version/channel tags. To reproduce an exact deployment, pin approved base-image digests and update them as part of your dependency maintenance.

## Health and logs

```sh
docker inspect --format '{{json .State.Health}}' backend
docker inspect --format '{{json .State.Health}}' frontend
docker logs backend
docker logs frontend
```

The backend health check requests `/api/health`. This public JSON readiness endpoint returns 200 only when the existing MongoDB connection is connected and a ping succeeds within one second; otherwise it returns 503. Docker's HTTP probe has a two-second timeout. The server starts listening after its initial MongoDB connection succeeds, and later probes check ongoing database availability. `/api/health/live` reports HTTP process liveness independently of MongoDB. Both API endpoints disable caching and omit database configuration and error details.

The frontend check requests `/healthz` and verifies Nginx availability, independently of the backend. API health endpoints are also accessible through the frontend proxy, for example `http://localhost:8080/api/health`. Rebuild the backend image after health-check code or Dockerfile changes with `docker compose up -d --build backend`. Docker records health status; health checks alone do not restart an unhealthy container.

Both images write logs to standard output/error. Database records and profile photos stay in your configured MongoDB database; neither application container requires a persistent data volume.

## Verification status

The Compose file, Dockerfiles, and Nginx template were reviewed against the application's source. Compose validation, image builds, and container startup have not been run in this session under the read/write-only restriction. After building and starting them, check login/logout, a refreshed customer detail URL, profile-photo upload, and a CSV export through the frontend origin.
