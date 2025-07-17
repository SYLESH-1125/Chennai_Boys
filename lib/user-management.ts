export interface User {
  id: string
  name: string
  email: string
  userType: "student" | "faculty"
  picture?: string
  createdAt: Date
  lastLogin: Date
  department?: string
  section?: string
  username?: string
  profileComplete?: boolean
}

// Add function to check if profile is complete
export function isProfileComplete(user: User): boolean {
  return !!(user.department && user.section && user.username)
}

class UserManager {
  private users: Map<string, User> = new Map()
  private emailIndex: Map<string, string> = new Map()

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return

    try {
      const stored = localStorage.getItem("quiz_app_users")
      if (stored) {
        const data = JSON.parse(stored)
        this.users = new Map(data.users || [])
        this.emailIndex = new Map(data.emailIndex || [])
      }
    } catch (error) {
      console.error("Error loading users from storage:", error)
    }
  }

  private saveToStorage() {
    if (typeof window === "undefined") return

    try {
      const data = {
        users: Array.from(this.users.entries()),
        emailIndex: Array.from(this.emailIndex.entries()),
      }
      localStorage.setItem("quiz_app_users", JSON.stringify(data))
    } catch (error) {
      console.error("Error saving users to storage:", error)
    }
  }

  createUser(id: string, name: string, email: string, userType: "student" | "faculty"): User {
    const user: User = {
      id,
      name,
      email,
      userType,
      createdAt: new Date(),
      lastLogin: new Date(),
    }

    this.users.set(id, user)
    this.emailIndex.set(email.toLowerCase(), id)
    this.saveToStorage()

    return user
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id)
  }

  getUserByEmail(email: string): User | undefined {
    const userId = this.emailIndex.get(email.toLowerCase())
    return userId ? this.users.get(userId) : undefined
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id)
    if (!user) return undefined

    const updatedUser = { ...user, ...updates }
    this.users.set(id, updatedUser)

    // Update email index if email changed
    if (updates.email && updates.email !== user.email) {
      this.emailIndex.delete(user.email.toLowerCase())
      this.emailIndex.set(updates.email.toLowerCase(), id)
    }

    this.saveToStorage()
    return updatedUser
  }

  deleteUser(id: string): boolean {
    const user = this.users.get(id)
    if (!user) return false

    this.users.delete(id)
    this.emailIndex.delete(user.email.toLowerCase())
    this.saveToStorage()
    return true
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values())
  }

  getUsersByType(userType: "student" | "faculty"): User[] {
    return this.getAllUsers().filter((user) => user.userType === userType)
  }

  updateLastLogin(id: string): void {
    const user = this.users.get(id)
    if (user) {
      user.lastLogin = new Date()
      this.users.set(id, user)
      this.saveToStorage()
    }
  }
}

// Create singleton instance
const userManager = new UserManager()

// Export convenience functions
export const createUser = (id: string, name: string, email: string, userType: "student" | "faculty") =>
  userManager.createUser(id, name, email, userType)

export const getUserById = (id: string) => userManager.getUserById(id)

export const getUserByEmail = (email: string) => userManager.getUserByEmail(email)

export const updateUser = (id: string, updates: Partial<User>) => userManager.updateUser(id, updates)

export const deleteUser = (id: string) => userManager.deleteUser(id)

export const getAllUsers = () => userManager.getAllUsers()

export const getUsersByType = (userType: "student" | "faculty") => userManager.getUsersByType(userType)

export const updateLastLogin = (id: string) => userManager.updateLastLogin(id)

export const saveUser = (user: User) => {
  userManager.updateUser(user.id, user)
}

export default userManager
