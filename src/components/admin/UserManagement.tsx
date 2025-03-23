import React, { useEffect, useState } from 'react'
import { getLogger } from '../../lib/logging'

// Initialize logger
const logger = getLogger()

// User interface
interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  lastActive: Date
}

// API response user interface
interface RawUser {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  lastActive: string
}

// Filter state interface
interface FilterState {
  role: string
  search: string
}

/**
 * UserManagement component
 * Provides interface for managing users in the admin panel
 */
export default function UserManagement() {
  // State for users data
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])

  // Pagination state
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    hasMore: false,
  })

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    role: '',
    search: '',
  })

  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Load users on mount and when filters/pagination change
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)

        // Build query params
        const params = new URLSearchParams({
          limit: pagination.limit.toString(),
          offset: pagination.offset.toString(),
        })

        if (filters.role) {
          params.append('role', filters.role)
        }

        // Fetch users from API
        const response = await fetch(`/api/admin/users?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch users')
        }

        const data = await response.json()

        // Transform API dates to Date objects
        const transformedUsers = data.users.map((user: RawUser) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          lastActive: new Date(user.lastActive),
        }))

        setUsers(transformedUsers)
        setFilteredUsers(transformedUsers)
        setPagination(data.pagination)
      } catch (err) {
        logger.error('Error fetching users:', err)
        setError('Failed to load users. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [filters.role, pagination.limit, pagination.offset])

  // Apply search filter locally
  useEffect(() => {
    if (!filters.search.trim()) {
      setFilteredUsers(users)
      return
    }

    const search = filters.search.toLowerCase()
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search)
    )

    setFilteredUsers(filtered)
  }, [filters.search, users])

  // Handle role filter change
  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({
      ...filters,
      role: e.target.value,
    })

    // Reset pagination when filter changes
    setPagination({
      ...pagination,
      offset: 0,
    })
  }

  // Handle search filter change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      search: e.target.value,
    })
  }

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination({
        ...pagination,
        offset: pagination.offset + pagination.limit,
      })
    }
  }

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination({
        ...pagination,
        offset: Math.max(0, pagination.offset - pagination.limit),
      })
    }
  }

  // Open user modal
  const handleUserClick = (user: User) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Handle loading state
  if (loading && users.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  // Handle error state
  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    )
  }

  return (
    <div className="user-management">
      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 w-full md:w-64"
              placeholder="Search users..."
              value={filters.search}
              onChange={handleSearchChange}
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              search
            </span>
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              value={filters.role}
              onChange={handleRoleFilterChange}
            >
              <option value="">All Roles</option>
              <option value="therapist">Therapists</option>
              <option value="client">Clients</option>
              <option value="admin">Admins</option>
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
              filter_lis
            </span>
          </div>
        </div>

        {/* Add user button */}
        <button className="flex items-center justify-center px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white">
          <span className="material-symbols-outlined mr-2">add</span>
          Add User
        </button>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700">
        <table className="min-w-full bg-white dark:bg-gray-800">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Active
              </th>
              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-4 px-6 text-center text-gray-500 dark:text-gray-400"
                >
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => handleUserClick(user)}
                >
                  <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200">
                    {user.name}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200">
                    {user.email}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'therapist'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : user.role === 'admin'
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-200">
                    {formatDate(user.lastActive)}
                  </td>
                  <td className="py-4 px-6 text-sm">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleUserClick(user)
                        }}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Handle delete
                        }}
                      >
                        <span className="material-symbols-outlined">
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {pagination.offset + 1} to{' '}
          {Math.min(pagination.offset + filteredUsers.length, pagination.total)}{' '}
          of {pagination.total} users
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50"
            onClick={handlePrevPage}
            disabled={pagination.offset === 0}
          >
            Previous
          </button>
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 disabled:opacity-50"
            onClick={handleNextPage}
            disabled={!pagination.hasMore}
          >
            Nex
          </button>
        </div>
      </div>

      {/* User modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full m-4">
            {/* Modal header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Edit User: {selectedUser.name}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setIsModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {/* Modal body */}
            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    defaultValue={selectedUser.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    defaultValue={selectedUser.email}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                    defaultValue={selectedUser.role}
                  >
                    <option value="client">Client</option>
                    <option value="therapist">Therapist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {/* Additional fields would go here */}
              </form>
            </div>
            {/* Modal footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 gap-4">
              <button
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  // Handle save
                  setIsModalOpen(false)
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
