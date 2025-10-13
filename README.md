# Project Management System

A comprehensive project management system with advanced inspection tracking, export capabilities, and integration support.

## Features

- **Project Management**: Create, edit, and track projects with detailed phases and tasks
- **Inspection Tracking**: Comprehensive inspection management for contractors and owners
- **Multiple Export Formats**: Export data in CSV, JSON, and PDF formats
- **Integration Support**: Notion sync, Google Sheets export, and more
- **Real-time Updates**: Background synchronization and webhook support
- **Professional Reports**: Generate detailed inspection reports with QR codes

## Export Formats

All data endpoints support multiple export formats via the `?format` query parameter. The system provides efficient streaming for large datasets and pagination support for JSON exports.

### Supported Formats

- **CSV**: Comma-separated values, streamed for large datasets (>5000 rows)
- **JSON**: JavaScript Object Notation with optional pagination
- **PDF**: Professional PDF reports with headers, footers, and formatted tables

### Usage

Add `?format=csv|json|pdf` to any supported endpoint:

```bash
# Export all projects as CSV
GET /api/projects?format=csv

# Export project tasks as JSON with pagination
GET /api/projects/{id}/tasks?format=json&page=1&limit=100

# Export inspections as PDF
GET /api/projects/{id}/inspections?format=pdf
```

### Supported Endpoints

| Endpoint | Description | CSV | JSON | PDF |
|----------|-------------|-----|------|-----|
| `/api/projects` | All projects | ✓ | ✓ | ✓ |
| `/api/projects/{id}` | Single project details | ✓ | ✓ | ✓ |
| `/api/projects/{id}/tasks` | Project tasks | ✓ | ✓ | ✓ |
| `/api/projects/{id}/phases` | Project phases | ✓ | ✓ | ✓ |
| `/api/projects/{id}/inspections` | Project inspections | ✓ | ✓ | ✓ |
| `/api/projects/{id}/consultants` | Project consultants | ✓ | ✓ | ✓ |
| `/api/projects/{id}/rooms` | Project rooms | ✓ | ✓ | ✓ |
| `/api/projects/{id}/schedules` | Project schedules | ✓ | ✓ | ✓ |
| `/api/projects/{id}/materials` | Project materials | ✓ | ✓ | ✓ |
| `/api/projects/{id}/notes` | Project notes | ✓ | ✓ | ✓ |

### Pagination (JSON only)

JSON exports support pagination to handle large datasets efficiently:

```bash
GET /api/projects?format=json&page=2&limit=50
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 100, max: 500)

**Response format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### CSV Streaming

For large datasets (>5000 rows), CSV exports automatically use streaming to reduce memory usage:

```bash
# Automatically streamed for large datasets
GET /api/projects/{id}/inspections?format=csv
```

### PDF Features

PDF exports include:
- Professional header with project name and export date
- Formatted data tables with alternating row colors
- Automatic pagination with page numbers
- Footer with generation timestamp
- Summary statistics

### CURL Examples

#### Export all projects as CSV
```bash
curl -X GET "http://localhost:5000/api/projects?format=csv" \
  -H "Accept: text/csv" \
  -o projects.csv
```

#### Export project tasks as JSON with pagination
```bash
curl -X GET "http://localhost:5000/api/projects/123/tasks?format=json&page=1&limit=50" \
  -H "Accept: application/json" \
  | jq '.'
```

#### Export inspections as PDF
```bash
curl -X GET "http://localhost:5000/api/projects/123/inspections?format=pdf" \
  -H "Accept: application/pdf" \
  -o inspections.pdf
```

#### Export with authentication (if required)
```bash
curl -X GET "http://localhost:5000/api/projects?format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: text/csv" \
  -o projects_export.csv
```

### Rate Limiting

Export endpoints are rate-limited to prevent abuse:
- **Limit**: 5 requests per minute per IP address
- **Headers**: Rate limit information is included in response headers
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when the limit resets

### Error Handling

The API returns appropriate error codes:
- `400 Bad Request`: Invalid format or parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error during export

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Feature Flags
NOTION_ENABLED=false
GOOGLE_EXPORT_ENABLED=false

# Notion Integration (optional)
NOTION_PARENT_PAGE_ID=your-notion-parent-page-id
NOTION_WEBHOOK_SECRET=your-notion-webhook-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token

# Background Sync (optional)
ENABLE_BACKGROUND_SYNC=false

# NYC Open Data API (optional)
NYC_OPEN_DATA_API_KEY=your-nyc-api-key
```

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Run database migrations: `npm run db:push`
5. Start the application: `npm run dev`

## Development

- Frontend: React + TypeScript + Vite
- Backend: Express + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Styling: Tailwind CSS + shadcn/ui

## Security and Dependency Management

### Monthly Security Audit Process

1. **Run Security Audit Script**
   ```bash
   node scripts/security-audit.js
   ```
   This script will:
   - Check for security vulnerabilities using `npm audit`
   - Identify outdated packages
   - Check package licenses
   - Generate an audit report in `audit-reports/`

2. **Fix Vulnerabilities**
   ```bash
   # Automatically fix vulnerabilities where possible
   npm audit fix
   
   # For breaking changes that can't be auto-fixed
   npm audit fix --force  # Use with caution!
   ```

3. **Update Dependencies**
   ```bash
   # Update packages within semver range
   npm update
   
   # Update specific package to latest version
   npm install <package-name>@latest
   
   # Check which packages would be updated
   npm outdated
   ```

4. **Test After Updates**
   - Run the application: `npm run dev`
   - Execute test suite: `npm test`
   - Verify critical functionality works

5. **Commit Changes**
   ```bash
   git add package-lock.json
   git commit -m "chore: update dependencies and fix vulnerabilities"
   ```

### Security Best Practices

- **Never commit sensitive data**: Keep `.env` files, API keys, and secrets out of version control
- **Use exact versions in production**: Run `npm ci` instead of `npm install` for deployments
- **Review dependency changes**: Check `package-lock.json` changes in pull requests
- **Enable automated monitoring**: Consider using GitHub Dependabot or Snyk for continuous vulnerability scanning
- **Regular audits**: Schedule monthly security audits as part of your maintenance routine
- **Check licenses**: Ensure all dependencies have compatible licenses using the audit script

### Vulnerability Levels

- **Critical**: Fix immediately - may allow remote code execution
- **High**: Fix within 24 hours - significant security risk
- **Moderate**: Fix within a week - limited impact
- **Low**: Fix in next release cycle - minimal risk

### Additional Tools (Optional)

For enhanced security monitoring, consider:

1. **Snyk Integration**
   ```bash
   npm install -g snyk
   snyk auth
   snyk monitor  # Continuous monitoring
   ```

2. **License Checker**
   ```bash
   npm install -g license-checker
   license-checker --summary
   ```

3. **OWASP Dependency Check**
   - Use for Java dependencies if applicable
   - Integrates with CI/CD pipelines

## Admin Features

Access the admin integrations page at `/admin/integrations` to:
- View feature flag status
- Check integration configurations
- Review API endpoint documentation
- Monitor rate limiting settings

## License

MIT