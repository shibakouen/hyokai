/**
 * Deployment Configuration
 *
 * Defines the relationship between the Landing Page and Main Application.
 * Used for navigation links, CORS configuration, and domain setup.
 */

// ============================================================================
// DEPLOYMENT IDENTIFIERS
// ============================================================================

/**
 * Landing Page - Marketing/intro page
 * Vercel Project: hyokai---curveball-edition (1)
 */
export const LANDING_PAGE = {
  /** Vercel project identifier */
  projectName: 'hyokai---curveball-edition',

  /** Human-readable name */
  displayName: 'Hyokai Landing Page',

  /** Production domain (to be configured) */
  productionDomain: 'hyokai.io', // placeholder - update when domain is set

  /** Vercel preview domain pattern */
  previewDomainPattern: 'hyokai-curveball-edition-*.vercel.app',

  /** Current Vercel deployment URL */
  vercelUrl: 'https://hyokai-curveball-edition.vercel.app', // placeholder

  /** Role description */
  role: 'landing' as const,
} as const;

/**
 * Main Application - The actual Hyokai tool
 * Vercel Project: Hyokai-Vercel
 */
export const MAIN_APP = {
  /** Vercel project identifier */
  projectName: 'Hyokai-Vercel',

  /** Human-readable name */
  displayName: 'Hyokai App',

  /** Production domain (to be configured) */
  productionDomain: 'app.hyokai.io', // placeholder - update when domain is set

  /** Vercel preview domain pattern */
  previewDomainPattern: 'hyokai-vercel-*.vercel.app',

  /** Current Vercel deployment URL */
  vercelUrl: 'https://hyokai-vercel.vercel.app', // placeholder

  /** Role description */
  role: 'app' as const,
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type DeploymentRole = 'landing' | 'app';

export interface DeploymentConfig {
  projectName: string;
  displayName: string;
  productionDomain: string;
  previewDomainPattern: string;
  vercelUrl: string;
  role: DeploymentRole;
}

// ============================================================================
// COMBINED CONFIGURATION
// ============================================================================

/**
 * All deployments indexed by role
 */
export const DEPLOYMENTS: Record<DeploymentRole, DeploymentConfig> = {
  landing: LANDING_PAGE,
  app: MAIN_APP,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the URL to launch the main app from the landing page
 * @param path - Optional path to append (e.g., '/library')
 * @returns Full URL to the main application
 */
export function getAppUrl(path: string = ''): string {
  // In production, use the production domain
  // In development/preview, use the Vercel URL
  const baseUrl = import.meta.env.PROD
    ? `https://${MAIN_APP.productionDomain}`
    : MAIN_APP.vercelUrl;

  return `${baseUrl}${path}`;
}

/**
 * Get the URL to the landing page from the main app
 * @param path - Optional path to append
 * @returns Full URL to the landing page
 */
export function getLandingUrl(path: string = ''): string {
  const baseUrl = import.meta.env.PROD
    ? `https://${LANDING_PAGE.productionDomain}`
    : LANDING_PAGE.vercelUrl;

  return `${baseUrl}${path}`;
}

/**
 * Get allowed origins for CORS configuration
 * Includes both production domains and Vercel preview URLs
 */
export function getAllowedOrigins(): string[] {
  return [
    // Production domains
    `https://${LANDING_PAGE.productionDomain}`,
    `https://${MAIN_APP.productionDomain}`,

    // Vercel URLs
    LANDING_PAGE.vercelUrl,
    MAIN_APP.vercelUrl,

    // Local development
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
}

/**
 * Check if a given origin is allowed (for CORS)
 * @param origin - The origin to check
 * @returns true if the origin is allowed
 */
export function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = getAllowedOrigins();

  // Direct match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check Vercel preview URL patterns
  const vercelPreviewPatterns = [
    /^https:\/\/hyokai-curveball-edition-[\w-]+\.vercel\.app$/,
    /^https:\/\/hyokai-vercel-[\w-]+\.vercel\.app$/,
  ];

  return vercelPreviewPatterns.some(pattern => pattern.test(origin));
}

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Detect which deployment we're currently running in
 * @returns The current deployment role, or null if unknown
 */
export function getCurrentDeployment(): DeploymentRole | null {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;

  // Check production domains
  if (hostname === LANDING_PAGE.productionDomain ||
      hostname.includes('curveball-edition')) {
    return 'landing';
  }

  if (hostname === MAIN_APP.productionDomain ||
      hostname.includes('hyokai-vercel')) {
    return 'app';
  }

  // Local development defaults to app
  if (hostname === 'localhost') {
    return 'app';
  }

  return null;
}
