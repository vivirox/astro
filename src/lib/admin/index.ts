/**
 * Admin Service for Therapy Chat System
 *
 * Provides administrative capabilities for managing users, monitoring system usage,
 * and maintaining security across the application.
 */

import { getLogger } from '../logging'
import { verifyToken } from '../security/verification'
import type { User } from '../../types/user'
import type { AstroGlobal } from 'astro'

// Initialize logger
const logger = getLogger()

/**
 * Admin roles with different permission levels
 */
export enum AdminRole {
  SUPER_ADMIN = 'super_admin', // Full system access
  CLINICAL_ADMIN = 'clinical_admin', // Access to therapist accounts and clinical data
  SECURITY_ADMIN = 'security_admin', // Manage security settings and audit logs
  SUPPORT_ADMIN = 'support_admin', // Limited access for customer support
}

/**
 * Admin permission types
 */
export enum AdminPermission {
  // User management
  VIEW_USERS = 'view_users',
  CREATE_USER = 'create_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',

  // Session management
  VIEW_SESSIONS = 'view_sessions',
  MANAGE_SESSIONS = 'manage_sessions',

  // Security management
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SECURITY = 'manage_security',
  ROTATE_KEYS = 'rotate_keys',

  // System management
  VIEW_METRICS = 'view_metrics',
  CONFIGURE_SYSTEM = 'configure_system',
}

/**
 * Role-based permissions matrix
 */
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(AdminPermission),
  [AdminRole.CLINICAL_ADMIN]: [
    AdminPermission.VIEW_USERS,
    AdminPermission.CREATE_USER,
    AdminPermission.UPDATE_USER,
    AdminPermission.VIEW_SESSIONS,
    AdminPermission.MANAGE_SESSIONS,
    AdminPermission.VIEW_METRICS,
  ],
  [AdminRole.SECURITY_ADMIN]: [
    AdminPermission.VIEW_AUDIT_LOGS,
    AdminPermission.MANAGE_SECURITY,
    AdminPermission.ROTATE_KEYS,
    AdminPermission.VIEW_METRICS,
  ],
  [AdminRole.SUPPORT_ADMIN]: [
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_SESSIONS,
    AdminPermission.VIEW_METRICS,
  ],
}

/**
 * User with admin role
 */
export interface AdminUser extends User {
  role: AdminRole
  permissions?: AdminPermission[]
}

/**
 * Admin service for user management and system administration
 */
export class AdminService {
  private static instance: AdminService

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService()
    }
    return AdminService.instance
  }

  /**
   * Check if user has admin role
   */
  public async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.getAdminUser(userId)
      return !!user
    } catch (error) {
      logger.error('Error checking admin status:', error)
      return false
    }
  }

  /**
   * Get admin user details
   */
  public async getAdminUser(userId: string): Promise<AdminUser | null> {
    try {
      // In a real implementation, this would fetch from the database
      // For this example, we'll use a mock implementation
      return this.getMockAdminUser(userId)
    } catch (error) {
      logger.error('Error getting admin user:', error)
      return null
    }
  }

  /**
   * Check if user has specific permission
   */
  public async hasPermission(
    userId: string,
    permission: AdminPermission
  ): Promise<boolean> {
    try {
      const user = await this.getAdminUser(userId)
      if (!user) return false

      // Check custom permissions first if they exist
      if (user.permissions && user.permissions.includes(permission)) {
        return true
      }

      // Otherwise check role-based permissions
      return ROLE_PERMISSIONS[user.role].includes(permission)
    } catch (error) {
      logger.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Verify admin authentication token
   */
  public async verifyAdminToken(
    token: string
  ): Promise<{ userId: string; role: AdminRole } | null> {
    try {
      const payload = (await verifyToken(token)) as { userId: string }
      if (!payload || !payload.userId) return null

      const user = await this.getAdminUser(payload.userId)
      if (!user) return null

      return {
        userId: user.id,
        role: user.role,
      }
    } catch (error) {
      logger.error('Error verifying admin token:', error)
      return null
    }
  }

  /**
   * Get all admin users
   */
  public async getAllAdmins(): Promise<AdminUser[]> {
    try {
      // In a real implementation, this would fetch from the database
      // For this example, we'll return mock data
      return [
        this.getMockAdminUser('admin1'),
        this.getMockAdminUser('admin2'),
        this.getMockAdminUser('admin3'),
        this.getMockAdminUser('admin4'),
      ].filter(Boolean) as AdminUser[]
    } catch (error) {
      logger.error('Error getting all admins:', error)
      return []
    }
  }

  /**
   * Get system metrics for admin dashboard
   */
  public async getSystemMetrics(): Promise<unknown> {
    try {
      // In a real implementation, this would fetch metrics from the database or monitoring service
      return {
        activeUsers: 128,
        activeTherapists: 42,
        activeSessions: 35,
        messagesLast24Hours: 1250,
        averageResponseTime: 850, // ms
        serverLoad: 0.42,
        encryptionOperations: 9876,
        securityLevel: {
          standard: 15,
          hipaa: 65,
          maximum: 20,
        },
      }
    } catch (error) {
      logger.error('Error getting system metrics:', error)
      return {}
    }
  }

  /**
   * Mock admin user for development
   */
  private getMockAdminUser(userId: string): AdminUser | null {
    const mockUsers: Record<string, AdminUser> = {
      admin1: {
        id: 'admin1',
        name: 'Super Admin',
        email: 'super@example.com',
        role: AdminRole.SUPER_ADMIN,
      },
      admin2: {
        id: 'admin2',
        name: 'Clinical Director',
        email: 'clinical@example.com',
        role: AdminRole.CLINICAL_ADMIN,
      },
      admin3: {
        id: 'admin3',
        name: 'Security Officer',
        email: 'security@example.com',
        role: AdminRole.SECURITY_ADMIN,
      },
      admin4: {
        id: 'admin4',
        name: 'Support Specialist',
        email: 'support@example.com',
        role: AdminRole.SUPPORT_ADMIN,
      },
    }

    return mockUsers[userId] || null
  }

  /**
   * Check if the request is from an admin user
   * @param astro - Astro global object
   * @returns Boolean indicating if the request is from an admin
   */
  public async isAdminRequest(astro: AstroGlobal): Promise<boolean> {
    try {
      // Extract token from cookies or Authorization header
      const token =
        astro.cookies.get('token')?.value ||
        astro.request.headers.get('Authorization')?.replace('Bearer ', '')

      if (!token) {
        return false
      }

      // Verify admin token
      const adminInfo = await this.verifyAdminToken(token)
      return !!adminInfo
    } catch (error) {
      logger.error('Error checking admin request:', error)
      return false
    }
  }
}
