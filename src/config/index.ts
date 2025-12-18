/**
 * Configuration exports
 *
 * Central export point for all configuration modules.
 * Import from '@/config' instead of individual files.
 */

// Deployment configuration
export {
  // Constants
  LANDING_PAGE,
  MAIN_APP,
  DEPLOYMENTS,

  // Types
  type DeploymentRole,
  type DeploymentConfig,

  // Utility functions
  getAppUrl,
  getLandingUrl,
  getAllowedOrigins,
  isAllowedOrigin,
  getCurrentDeployment,
} from './deployments';
