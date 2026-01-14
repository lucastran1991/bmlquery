# BML Query Generator - System Usage Wiki

## 1. System Overview
This system consists of:
- **Frontend**: Next.js application (Port 8086) for generating queries via UI.
- **Backend**: Golang service (Port 8080) that processes logic.
- **Proxy**: Frontend proxies API requests to Backend to avoid CORS issues.

## 2. Deployment
The system is managed by `deploy.sh` and `PM2`.

### Start/Restart System
Run the deployment script to build and start all services:
```bash
./deploy.sh
```

### Check Status
Verify services are running:
```bash
pm2 status
```

### View Logs
Monitor real-time logs (both frontend and backend):
```bash
tail -f out.log
```

## 3. Usage

### Web Interface
Access the UI via browser:
**URL**: [http://localhost:8086](http://localhost:8086)

1. Fill in the **Function**, **Model**, **Attribute**, **Condition**, and **Value**.
2. Click **Generate Query**.
3. Copy the generated YAML output.

### API Endpoint
You can generate queries programmatically via the API.

**Endpoint**: `POST http://localhost:8086/api/generate`
**Content-Type**: `application/json`

**Request Body Example:**
```json
{
  "function": "find",
  "model": "User",
  "attribute": "email",
  "condition": "eq",
  "condition_value": "admin@example.com"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:8086/api/generate \
  -H "Content-Type: application/json" \
  -d '{
        "function": "find",
        "model": "Product",
        "attribute": "price",
        "condition": "gt",
        "condition_value": "100"
      }'
```

**Response (YAML):**
```yaml
find:
    Product:
        price:
            gt: 100
```

## 4. Troubleshooting
- **Port Conflicts**: Ensure ports `8080` (Backend) and `8086` (Frontend) are free.
- **Node Version**: System requires Node.js 16.20.2 (handled by environment or nvm).
- **PM2 Errors**: If PM2 fails, try running `pm2 delete all` and then `./deploy.sh` again.
