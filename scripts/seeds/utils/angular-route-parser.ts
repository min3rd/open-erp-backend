/**
 * Utility to parse Angular route files and extract navigation structure
 * 
 * This is a simple parser that extracts routes from TypeScript files.
 * For complex route structures, consider creating a JSON manifest manually.
 */

import * as fs from 'fs';
import * as path from 'path';

interface RouteConfig {
  path: string;
  label?: string;
  icon?: string;
  children?: RouteConfig[];
  loadChildren?: string;
  data?: any;
}

interface ParsedRoute {
  path: string;
  fullPath: string;
  label: string;
  icon?: string;
  children: ParsedRoute[];
  data?: any;
}

/**
 * Parse a TypeScript route file to extract route configurations
 * 
 * Note: This is a basic parser that uses regex patterns.
 * For production use, consider using a TypeScript AST parser like ts-morph.
 * 
 * @param filePath Path to the TypeScript route file
 * @returns Array of parsed routes
 */
export function parseAngularRoutes(filePath: string): ParsedRoute[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Route file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract the routes array from the file
  const routesMatch = content.match(/export\s+const\s+routes:\s*Routes\s*=\s*\[([\s\S]*?)\];/);
  
  if (!routesMatch) {
    console.warn(`No routes array found in ${filePath}`);
    return [];
  }

  // This is a simplified parser - in production, use a proper TypeScript AST parser
  // For now, we'll just extract basic route information
  
  const routes: ParsedRoute[] = [];
  
  // Extract path values using regex
  const pathMatches = content.matchAll(/path:\s*['"]([^'"]*)['"]/g);
  for (const match of pathMatches) {
    const path = match[1];
    if (path && path !== '') {
      routes.push({
        path,
        fullPath: `/${path}`,
        label: formatLabel(path),
        children: [],
      });
    }
  }

  return routes;
}

/**
 * Convert path to label
 * Example: 'user-management' -> 'User Management'
 */
function formatLabel(path: string): string {
  return path
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse all route files in a directory recursively
 */
export function parseAngularRoutesDirectory(dirPath: string): ParsedRoute[] {
  const allRoutes: ParsedRoute[] = [];
  
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively parse subdirectories
      const subRoutes = parseAngularRoutesDirectory(fullPath);
      allRoutes.push(...subRoutes);
    } else if (file.endsWith('.routes.ts') || file === 'app.routes.ts') {
      // Parse route file
      try {
        const routes = parseAngularRoutes(fullPath);
        allRoutes.push(...routes);
      } catch (error) {
        console.error(`Error parsing ${fullPath}:`, error);
      }
    }
  }
  
  return allRoutes;
}

/**
 * Convert parsed routes to navigation manifest format
 */
export function convertRoutesToManifest(routes: ParsedRoute[]): any {
  const navigation = routes.map((route, index) => ({
    id: `nav-${route.path.replace(/\//g, '-')}`,
    label: route.label,
    labelKey: `navigation.${route.path.replace(/\//g, '.')}`,
    route: route.fullPath,
    icon: route.icon,
    scope: 'global',
    order: index,
  }));

  return { navigation };
}

/**
 * Example usage:
 * 
 * const routes = parseAngularRoutesDirectory('/path/to/frontend/src/app');
 * const manifest = convertRoutesToManifest(routes);
 * fs.writeFileSync('navigation-manifest.json', JSON.stringify(manifest, null, 2));
 */
