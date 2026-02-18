# Land Grants API Grafana Dashboards

Grafana dashboard definitions for the Land Grants API monitoring and metrics.

### Live Monitoring

The live Grafana board for the development environment:

- https://metrics.dev.cdp-int.defra.cloud/dashboards/f/land-grants-api

Sign in with Azure AD. See [Managing the service](../../docs/managing-the-service.md) for more details.


### Files

| File | Description |
|------|-------------|
| `land-grants-api.json` | Main dashboard with Parcels, Payments, Case Management Adapter, Application, and Land Data Ingest panels |
| `land-grants-api-original.json` | Original dashboard export ("Application specific metrics"), kept as reference |

### Endpoints Monitored

| Endpoint | Version | Metrics |
|----------|---------|---------|
| `/parcels` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/api/v2/parcels` | V2 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/payments/calculate` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/api/v2/payments/calculate` | V2 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/case-management-adapter/application/validation-run/` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/case-management-adapter/application/validation-run/rerun` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/application/validate` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/api/v2/application/validate` | V2 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/application/validation-run/` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/application/*/validation-run` | V1 | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/initiate-upload` | - | Count 2xx, 4xx, 5xx; Response time (ms) |
| `/cdp-uploader-callback` | - | Count 2xx, 4xx, 5xx; Response time (ms) |


### Key fields

| Field | Description |
|-------|-------------|
| `url.path` | Request URL path |
| `http.response.status_code` | HTTP response status code |
| `http.response.response_time` | Response time in milliseconds |


### Query structure

| Metric type | Example query |
|-------------|---------------|
| Count 2xx | `url.path:"/parcels" AND http.response.status_code:[200 TO 299]` |
| Count 2xx | `url.path:"/parcels" AND http.response.status_code:[200 TO 299]` |
| Count 4xx | `url.path:"/parcels" AND http.response.status_code:[400 TO 499]` |
| Count 5xx | `url.path:"/parcels" AND http.response.status_code:[500 TO 599]` |
| V1 includes | `NOT url.path:*v2*` |
| V2 includes | `url.path:"/api/v2/*"` |
| Response time | Same path/status filter, with metric `avg` on `http.response.response_time` |

### Aggregations

- **Count panels:** `date_histogram` on `@timestamp` (auto interval) + `count` metric
- **Response time panels:** `date_histogram` on `@timestamp` + `avg` on `http.response.response_time` (milliseconds)


### Update Dashboard

The simplest way to apply changes is via **Dashboard settings** (gear icon) → **JSON Model** — paste the updated JSON and save.

### Add Rules

To add an alert rule to each 5xx Count panel:

1. Open the dashboard and locate the 5xx panel (e.g. **Get Parcels - Count 5xx**, **Payment Calculation - Count 5xx**, etc.).
2. Click the panel title → **Edit** (or right-click → **Edit**).
3. Open the **Alert** tab.
4. Click **Create alert rule from this panel**.
5. Configure the rule:
   - **Condition:** e.g. `WHEN count() IS ABOVE 0` (or set a threshold such as 5).
   - **Evaluate every:** e.g. `1m`.
   - **For:** e.g. `0m` (alert immediately) or `5m` (wait before firing).
6. Add a **Contact point** (notification channel) and **Labels** if needed.
7. Click **Save rule**.
8. Repeat for each 5xx panel you want to monitor.
