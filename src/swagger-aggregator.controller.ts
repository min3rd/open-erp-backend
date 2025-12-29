import { Controller, Get, Res, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

interface ServiceConfig {
  name: string;
  url: string;
  auth?: {
    type: 'basic' | 'bearer';
    credentials?: string; // base64 for basic auth, token for bearer
  };
}

@Controller()
export class SwaggerAggregatorController {
  private readonly logger = new Logger(SwaggerAggregatorController.name);
  private services: ServiceConfig[] = [];
  private cache: Map<string, { spec: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.loadServicesConfig();
  }

  private loadServicesConfig() {
    const servicesEnv = process.env.SWAGGER_AGGREGATOR_SERVICES;
    if (servicesEnv) {
      try {
        this.services = JSON.parse(servicesEnv);
        this.logger.log(`Loaded ${this.services.length} service(s) from configuration`);
      } catch (error) {
        this.logger.error('Failed to parse SWAGGER_AGGREGATOR_SERVICES', error);
      }
    } else {
      // Default configuration for local development
      this.services = [
        { name: 'Auth Service', url: 'http://localhost:3001/api-docs.json' },
        { name: 'User Service', url: 'http://localhost:3002/api-docs.json' },
        { name: 'Notification Service', url: 'http://localhost:3003/api-docs.json' },
      ];
      this.logger.log('Using default service configuration');
    }
  }

  @Get('docs')
  async serveDocs(@Res() res: Response) {
    const html = this.generateSwaggerUI();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('api/services')
  async getServices() {
    return this.services.map((service) => ({
      name: service.name,
      url: service.url,
    }));
  }

  @Get('api/spec')
  async fetchSpec(@Query('url') url: string, @Query('refresh') refresh: string) {
    if (!url) {
      throw new HttpException('URL parameter is required', HttpStatus.BAD_REQUEST);
    }

    // Check cache
    const forceRefresh = refresh === 'true';
    if (!forceRefresh) {
      const cached = this.cache.get(url);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        this.logger.log(`Returning cached spec for ${url}`);
        return cached.spec;
      }
    }

    // Find service config for auth
    const serviceConfig = this.services.find((s) => s.url === url);

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };

      // Add authentication if configured
      if (serviceConfig?.auth) {
        if (serviceConfig.auth.type === 'basic') {
          headers['Authorization'] = `Basic ${serviceConfig.auth.credentials}`;
        } else if (serviceConfig.auth.type === 'bearer') {
          headers['Authorization'] = `Bearer ${serviceConfig.auth.credentials}`;
        }
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const spec = await response.json();

      // Cache the result
      this.cache.set(url, { spec, timestamp: Date.now() });

      this.logger.log(`Fetched and cached spec from ${url}`);
      return spec;
    } catch (error) {
      this.logger.error(`Failed to fetch spec from ${url}`, error.message);
      throw new HttpException(
        {
          message: `Failed to fetch OpenAPI spec from ${url}`,
          error: error.message,
          hint: 'Make sure the service is running and ENABLE_SWAGGER=true is set',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private generateSwaggerUI(): string {
    const services = JSON.stringify(this.services.map((s) => ({ name: s.name, url: s.url })));
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open ERP - API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui.css" />
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .topbar {
      background-color: #1b1b1b;
      padding: 15px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .topbar-wrapper {
      max-width: 1460px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .topbar h1 {
      margin: 0;
      color: #fff;
      font-size: 24px;
      font-weight: 600;
    }
    .service-selector {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .service-selector label {
      color: #fff;
      font-size: 14px;
    }
    .service-selector select {
      padding: 8px 12px;
      border-radius: 4px;
      border: 1px solid #444;
      background-color: #2a2a2a;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      min-width: 200px;
    }
    .service-selector button {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      background-color: #4990e2;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .service-selector button:hover {
      background-color: #357abd;
    }
    .loading {
      text-align: center;
      padding: 40px;
      font-size: 18px;
      color: #666;
    }
    .error {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      background-color: #fee;
      border: 1px solid #fcc;
      border-radius: 4px;
      color: #c33;
    }
    .error h3 {
      margin-top: 0;
    }
    .hint {
      margin-top: 10px;
      font-size: 14px;
      color: #666;
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 4px;
    }
    #swagger-ui {
      max-width: 1460px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-wrapper">
      <h1>🚀 Open ERP - API Documentation</h1>
      <div class="service-selector">
        <label for="service-select">Service:</label>
        <select id="service-select">
          <option value="">-- Select a service --</option>
        </select>
        <button id="refresh-btn" onclick="loadSelectedService(true)">↻ Refresh</button>
      </div>
    </div>
  </div>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.5/swagger-ui-standalone-preset.js"></script>
  <script>
    const services = ${services};
    let currentUi = null;

    // Populate service selector
    const select = document.getElementById('service-select');
    services.forEach(service => {
      const option = document.createElement('option');
      option.value = service.url;
      option.textContent = service.name;
      select.appendChild(option);
    });

    // Load service on selection
    select.addEventListener('change', () => loadSelectedService(false));

    async function loadSelectedService(forceRefresh) {
      const url = select.value;
      if (!url) {
        document.getElementById('swagger-ui').innerHTML = '<div class="loading">Please select a service to view its API documentation.</div>';
        return;
      }

      document.getElementById('swagger-ui').innerHTML = '<div class="loading">Loading API documentation...</div>';

      try {
        const refreshParam = forceRefresh ? '&refresh=true' : '';
        const response = await fetch(\`/api/spec?url=\${encodeURIComponent(url)}\${refreshParam}\`);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to load specification');
        }

        const spec = await response.json();
        
        // Dispose existing UI if any
        if (currentUi) {
          // SwaggerUI doesn't have a dispose method, so we just clear the container
          document.getElementById('swagger-ui').innerHTML = '';
        }

        // Create new SwaggerUI instance
        currentUi = SwaggerUIBundle({
          spec: spec,
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          plugins: [
            SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout"
        });

      } catch (error) {
        console.error('Error loading specification:', error);
        document.getElementById('swagger-ui').innerHTML = \`
          <div class="error">
            <h3>⚠️ Failed to load API specification</h3>
            <p><strong>Error:</strong> \${error.message}</p>
            <div class="hint">
              <strong>💡 Troubleshooting tips:</strong>
              <ul>
                <li>Make sure the service is running</li>
                <li>Check that <code>ENABLE_SWAGGER=true</code> is set in the service environment</li>
                <li>Verify the service URL is correct: <code>\${url}</code></li>
                <li>Check the browser console for more details</li>
              </ul>
            </div>
          </div>
        \`;
      }
    }

    // Initial load
    loadSelectedService(false);
  </script>
</body>
</html>`;
  }
}
