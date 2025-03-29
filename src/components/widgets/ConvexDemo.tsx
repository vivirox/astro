'use client'

import { useState } from 'react'
import { withConvex } from '@/lib/providers/ConvexProvider'
import { useMessages, useUsers } from '@/lib/hooks/useConvex'

/**
 * Demo component showcasing Convex real-time data sync capabilities
 */
function ConvexDemoComponent() {
  const { messages, sendMessage, deleteMessage } = useMessages()
  const { users, upsertUser } = useUsers()
  const [messageText, setMessageText] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const handleSendMessage = async () => {
    if (!messageText.trim()) return

    try {
      await sendMessage({ text: messageText, author: userName || 'Anonymous' })
      setMessageText('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleAddUser = async () => {
    if (!userName.trim() || !userEmail.trim()) return

    try {
      await upsertUser({
        name: userName,
        email: userEmail,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
      })
      setUserName('')
      setUserEmail('')
    } catch (error) {
      console.error('Error adding user:', error)
    }
  }

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteMessage({ id })
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">Convex Real-time Demo</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Users</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Name"
            className="px-3 py-2 border rounded flex-1"
          />
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={handleAddUser}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Add User
          </button>
        </div>

        <div className="max-h-40 overflow-y-auto">
          {users?.map((user) => (
            <div
              key={user._id}
              className="flex items-center gap-2 p-2 border-b"
            >
              {user.avatar && (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Messages</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Send
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {messages?.map((message) => (
            <div key={message._id} className="p-2 border-b">
              <div className="flex justify-between">
                <span className="font-medium">{message.author}</span>
                <button
                  onClick={() => handleDeleteMessage(message._id)}
                  className="text-red-600 text-xs"
                >
                  Delete
                </button>
              </div>
              <p>{message.text}</p>
              <span className="text-xs text-gray-500">
                {new Date(message.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Export with Convex provider wrapper
export const ConvexDemo = withConvex(ConvexDemoComponent)
export default ConvexDemo
