import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../health'

// Mock dependencies
vi.mock('node:os', () => ({
  totalmem: vi.fn(() => 16000000000), // 16GB
  freemem: vi.fn(() => 8000000000), // 8GB
  cpus: vi.fn(() => Array(8).fill({ model: 'Intel(R) Core(TM) i7-10700K' })),
  loadavg: vi.fn(() => [1.5, 1.2, 0.9]),
  platform: vi.fn(() => 'linux'),
  release: vi.fn(() => '5.10.0-15-amd64'),
  uptime: vi.fn(() => 86400), // 1 day
}))

vi.mock('node:process', () => ({
  version: 'v16.14.0',
  memoryUsage: vi.fn(() => ({
    rss: 200000000,
    heapTotal: 100000000,
    heapUsed: 80000000,
    external: 10000000,
  })),
  uptime: vi.fn(() => 86400), // 1 day
}))

vi.mock('../../../../lib/redis', () => ({
  getRedisHealth: vi.fn(() => Promise.resolve({ status: 'healthy' })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { status: 'healthy' }, error: null }),
          ),
        })),
      })),
    })),
  })),
}))

// Mock environment variables
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', 'public-key')

describe('GET /api/v1/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-04-10T12:00:00Z'))
  })

  it('should return healthy status when all services are healthy', async () => {
    const request = new Request('https://example.com/api/v1/health')
    const response = await GET({ request } as any)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('healthy')
    expect(data.api.status).toBe('healthy')
    expect(data.api.version).toBe('v1')
    expect(data.supabase.status).toBe('healthy')
    expect(data.redis.status).toBe('healthy')

    // Check system information
    expect(data.system).toBeDefined()
    expect(data.system.memory).toBeDefined()
    expect(data.system.memory.usagePercent).toBe(50) // 8GB / 16GB = 50%
    expect(data.system.cpu).toBeDefined()
    expect(data.system.cpu.cores).toBe(8)
    expect(data.system.os).toBeDefined()
    expect(data.system.os.platform).toBe('linux')
    expect(data.system.runtime).toBeDefined()
    expect(data.system.runtime.nodeVersion).toBe('v16.14.0')
  })

  it('should return unhealthy status when database is unhealthy', async () => {
    // Mock database error
    const supabaseMock = require('@supabase/supabase-js')
    supabaseMock.createClient.mockReturnValueOnce({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              }),
            ),
          })),
        })),
      })),
    })

    const request = new Request('https://example.com/api/v1/health')
    const response = await GET({ request } as any)

    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.api.status).toBe('healthy')
    expect(data.supabase.status).toBe('unhealthy')
    expect(data.redis.status).toBe('healthy')
  })

  it('should return unhealthy status when Redis is unhealthy', async () => {
    // Mock Redis error
    const redisMock = require('../../../../lib/redis')
    redisMock.getRedisHealth.mockResolvedValueOnce({
      status: 'unhealthy',
      details: { message: 'Redis error' },
    })

    const request = new Request('https://example.com/api/v1/health')
    const response = await GET({ request } as any)

    expect(response.status).toBe(503)

    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.api.status).toBe('healthy')
    expect(data.supabase.status).toBe('healthy')
    expect(data.redis.status).toBe('unhealthy')
  })

  it('should handle missing Supabase credentials', async () => {
    // Clear environment variables
    vi.stubEnv('PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('PUBLIC_SUPABASE_ANON_KEY', '')

    const request = new Request('https://example.com/api/v1/health')
    const response = await GET({ request } as any)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('healthy') // Overall healthy since Redis is OK
    expect(data.api.status).toBe('healthy')
    expect(data.supabase.status).toBe('unknown')
    expect(data.supabase.message).toBe('No credentials available')
  })
})
