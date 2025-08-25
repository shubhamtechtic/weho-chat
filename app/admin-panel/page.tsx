"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Eye,
  EyeOff,
  LogOut,
  User,
  Lock,
  Mail,
  BarChart3,
  FileText,
  MessageSquare,
  Upload,
  Trash2,
  Edit,
  Play,
  Plus,
  Download,
  Activity,
  Database,
  X,
  Info,
} from "lucide-react"

interface AdminUser {
  id: string
  email: string
  first_name: string
  last_name: string
  is_superuser: boolean
  is_active: boolean
  last_login: string | null
  created_at: string
}

interface MetricsData {
  upload_count: number
  query_count: number
  query_success: number
  query_errors: number
  avg_retrieve_latency: number
  avg_response_latency: number
  last_updated: string
}

interface UploadedDoc {
  id: string
  filename: string
  uploaded_by: string
  uploaded_at: string
  thread_id: string
  file_size: number
  file_type: string
  path: string
}

interface Prompt {
  id: string
  name: string
  template: string
  variables: Record<string, any>
  created_by: string
  is_active: boolean
  created_at: string
}

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [resetPasswordForm, setResetPasswordForm] = useState({
    token: "",
    new_password: "",
    confirm_password: "",
  })
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "change-password" | "analytics" | "documents" | "prompts">(
    "profile",
  )
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [documents, setDocuments] = useState<UploadedDoc[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [isCreatingPrompt, setIsCreatingPrompt] = useState(false)
  const [promptForm, setPromptForm] = useState({
    name: "",
    template: "",
    variables: "{}",
  })
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  })

  const [uploadForm, setUploadForm] = useState({
    threadId: "default",
    file: null as File | null,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      setUploadForm({ ...uploadForm, file: files[0] })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadForm({ ...uploadForm, file: files[0] })
    }
  }

  const handleDocumentUpload = async () => {
    if (!uploadForm.file) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", uploadForm.file)
      formData.append("thread_id", uploadForm.threadId)

      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/docs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        toast.success("Document uploaded successfully!")
        setUploadForm({ threadId: "default", file: null })
        fetchDocuments()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to upload document")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload document")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuthStatus()
    const urlParams = new URLSearchParams(window.location.search)
    const resetToken = urlParams.get("token")
    if (resetToken) {
      setResetPasswordForm({ ...resetPasswordForm, token: resetToken })
      setShowResetPassword(true)
    }
  }, [])

  const checkAuthStatus = async () => {
    const token = localStorage.getItem("admin_access_token")
    if (token) {
      try {
        const response = await fetch("/api/admin/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setAdminUser(userData)
          setIsLoggedIn(true)
        } else {
          localStorage.removeItem("admin_access_token")
          localStorage.removeItem("admin_refresh_token")
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        localStorage.removeItem("admin_access_token")
        localStorage.removeItem("admin_refresh_token")
      }
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem("admin_access_token", data.access_token)
        localStorage.setItem("admin_refresh_token", data.refresh_token)
        setIsLoggedIn(true)
        await checkAuthStatus()
        toast.success("Login successful!")
      } else {
        toast.error(data.detail || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("admin_access_token")
      await fetch("/api/admin/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      localStorage.removeItem("admin_access_token")
      localStorage.removeItem("admin_refresh_token")
      setIsLoggedIn(false)
      setAdminUser(null)
      toast.success("Logged out successfully")
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    const token = localStorage.getItem("admin_access_token")
    if (!token) {
      toast.error("Please log in first")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: loginForm.password,
          new_password: resetPasswordForm.new_password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Password changed successfully!")
        setLoginForm({ email: "", password: "" })
        setResetPasswordForm({ token: "", new_password: "", confirm_password: "" })
        setShowResetPassword(false)
      } else {
        toast.error(data.detail || "Failed to change password")
      }
    } catch (error) {
      console.error("Change password error:", error)
      toast.error("Failed to change password")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Password reset link has been sent to your email!")
        setShowForgotPassword(false)
        setForgotPasswordEmail("")
      } else {
        toast.error(data.message || "Failed to send reset email")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      toast.error("Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (resetPasswordForm.new_password !== resetPasswordForm.confirm_password) {
      toast.error("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: resetPasswordForm.token,
          new_password: resetPasswordForm.new_password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Password has been reset successfully!")
        setShowResetPassword(false)
        setResetPasswordForm({ token: "", new_password: "", confirm_password: "" })
        window.history.replaceState({}, document.title, window.location.pathname)
      } else {
        toast.error(data.message || "Failed to reset password")
      }
    } catch (error) {
      console.error("Reset password error:", error)
      toast.error("Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/metrics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/docs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
    }
  }

  const fetchPrompts = async () => {
    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/prompts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPrompts(data)
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error)
    }
  }

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: promptForm.name,
          template: promptForm.template,
          variables: JSON.parse(promptForm.variables || "{}"),
        }),
      })

      if (response.ok) {
        toast.success("Prompt created successfully!")
        setPromptForm({ name: "", template: "", variables: "{}" })
        setIsCreatingPrompt(false)
        fetchPrompts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create prompt")
      }
    } catch (error) {
      console.error("Create prompt error:", error)
      toast.error("Failed to create prompt")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm("Are you sure you want to delete this prompt?")) return

    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch(`/api/admin/prompts/${promptId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("Prompt deleted successfully!")
        fetchPrompts()
      } else {
        toast.error("Failed to delete prompt")
      }
    } catch (error) {
      console.error("Delete prompt error:", error)
      toast.error("Failed to delete prompt")
    }
  }

  const handleSetActivePrompt = async (promptId: string) => {
    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch(`/api/admin/prompts/set-active/${promptId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        toast.success("Prompt set as active successfully!")
        fetchPrompts()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to set active prompt")
      }
    } catch (error) {
      console.error("Set active prompt error:", error)
      toast.error("Failed to set active prompt")
    }
  }

  const handleTestPrompt = async (prompt: Prompt) => {
    try {
      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/prompts/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          template: prompt.template,
          variables: prompt.variables,
          messages: ["Hello, this is a test message"],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Prompt test completed!")
        alert(`Test Response: ${data.response}`)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to test prompt")
      }
    } catch (error) {
      console.error("Test prompt error:", error)
      toast.error("Failed to test prompt")
    }
  }

  const handleFileDropEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      handleFileSelectEvent(file)
    }
  }

  const handleDragOverEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeaveEvent = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleFileSelectEvent = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size exceeds 50MB")
      return
    }

    setUploadForm({ ...uploadForm, file: file })
  }

  const handleDocumentUploadEvent = async () => {
    if (!uploadForm.file) {
      toast.error("Please select a file to upload")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("file", uploadForm.file)
      formData.append("thread_id", uploadForm.threadId)

      const token = localStorage.getItem("admin_access_token")
      const response = await fetch("/api/admin/docs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        toast.success("Document uploaded successfully!")
        setUploadForm({ file: null, threadId: "default" })
        fetchDocuments()
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to upload document")
      }
    } catch (error) {
      console.error("Upload document error:", error)
      toast.error("Failed to upload document")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === "analytics") fetchMetrics()
      if (activeTab === "documents") fetchDocuments()
      if (activeTab === "prompts") fetchPrompts()
    }
  }, [isLoggedIn, activeTab])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          {showResetPassword ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                <CardDescription className="text-center">Enter your new password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="new_password"
                        type="password"
                        placeholder="Enter new password"
                        value={resetPasswordForm.new_password}
                        onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, new_password: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="confirm_password"
                        type="password"
                        placeholder="Confirm new password"
                        value={resetPasswordForm.confirm_password}
                        onChange={(e) =>
                          setResetPasswordForm({ ...resetPasswordForm, confirm_password: e.target.value })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowResetPassword(false)}>
                    Back to Login
                  </Button>
                </form>
              </CardContent>
            </>
          ) : showForgotPassword ? (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
                <CardDescription className="text-center">Enter your email to receive a reset link</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot_email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="forgot_email"
                        type="email"
                        placeholder="admin@example.com"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowForgotPassword(false)}>
                    Back to Login
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">Admin Login</CardTitle>
                <CardDescription className="text-center">
                  Enter your credentials to access the admin panel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className="pl-10 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-gray-600 hover:text-gray-900"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {adminUser?.first_name || adminUser?.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  <Button
                    variant={activeTab === "profile" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("profile")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  <Button
                    variant={activeTab === "change-password" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("change-password")}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button
                    variant={activeTab === "analytics" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("analytics")}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                  <Button
                    variant={activeTab === "documents" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("documents")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Documents
                  </Button>
                  <Button
                    variant={activeTab === "prompts" ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("prompts")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Prompts
                  </Button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && adminUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your admin account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input value={adminUser.email} disabled />
                    </div>
                    <div>
                      <Label>First Name</Label>
                      <Input value={adminUser.first_name || "N/A"} disabled />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input value={adminUser.last_name || "N/A"} disabled />
                    </div>
                    <div>
                      <Label>Account Type</Label>
                      <Input value={adminUser.is_superuser ? "Super Admin" : "Admin"} disabled />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Input value={adminUser.is_active ? "Active" : "Inactive"} disabled />
                    </div>
                    <div>
                      <Label>Last Login</Label>
                      <Input
                        value={adminUser.last_login ? new Date(adminUser.last_login).toLocaleString() : "Never"}
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "change-password" && (
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <Label htmlFor="old_password">Current Password</Label>
                      <Input
                        id="old_password"
                        type="password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="new_password">New Password</Label>
                      <Input
                        id="new_password"
                        type="password"
                        value={resetPasswordForm.new_password}
                        onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, new_password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <Input
                        id="confirm_password"
                        type="password"
                        value={resetPasswordForm.confirm_password}
                        onChange={(e) =>
                          setResetPasswordForm({ ...resetPasswordForm, confirm_password: e.target.value })
                        }
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Changing Password..." : "Change Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {activeTab === "analytics" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Analytics</CardTitle>
                    <CardDescription>Overview of chatbot performance and usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {metrics ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <Upload className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Documents</p>
                              <p className="text-2xl font-bold text-gray-900">{metrics.upload_count}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <MessageSquare className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Total Queries</p>
                              <p className="text-2xl font-bold text-gray-900">{metrics.query_count}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <Activity className="h-8 w-8 text-purple-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Success Rate</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {metrics.query_count > 0
                                  ? Math.round((metrics.query_success / metrics.query_count) * 100)
                                  : 0}
                                %
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <Database className="h-8 w-8 text-orange-600" />
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-600">Avg Response</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {metrics.avg_response_latency.toFixed(3)}s
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p>Loading metrics...</p>
                    )}
                  </CardContent>
                </Card>

                {metrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Metrics</CardTitle>
                      <CardDescription>Comprehensive analytics for your chatbot system</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-gray-700">Upload Count:</span>
                            <span className="font-bold text-gray-900">{metrics.upload_count}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-gray-700">Query Count:</span>
                            <span className="font-bold text-gray-900">{metrics.query_count}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-gray-700">Successful Queries:</span>
                            <span className="font-bold text-gray-900">{metrics.query_success}</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="font-medium text-gray-700">Failed Queries:</span>
                            <span className="font-bold text-gray-900">{metrics.query_errors}</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-gray-700">Avg Retrieve Latency:</span>
                            <span className="font-bold text-gray-900">{metrics.avg_retrieve_latency.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b">
                            <span className="font-medium text-gray-700">Avg Response Latency:</span>
                            <span className="font-bold text-gray-900">{metrics.avg_response_latency.toFixed(3)}s</span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="font-medium text-gray-700">Last Updated:</span>
                            <span className="font-bold text-gray-900">
                              {new Date(metrics.last_updated).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Documents</CardTitle>
                    <CardDescription>
                      Upload PDF, TXT, or DOCX files to enhance the chatbot's knowledge base
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="thread_id">Thread ID</Label>
                      <Input
                        id="thread_id"
                        value={uploadForm.threadId}
                        onChange={(e) => setUploadForm({ ...uploadForm, threadId: e.target.value })}
                        placeholder="default"
                        className="max-w-md"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Documents with the same thread ID will be grouped together
                      </p>
                    </div>

                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onDrop={handleFileDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Drag and drop your file here</h3>
                      <p className="text-gray-500 mb-4">or</p>
                      <Button variant="outline">Choose File</Button>
                      <p className="text-sm text-gray-500 mt-4">Supports PDF, TXT, DOCX files up to 50MB</p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {uploadForm.file && (
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{uploadForm.file.name}</p>
                            <p className="text-sm text-gray-600">
                              {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button onClick={() => setUploadForm({ ...uploadForm, file: null })} variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <Button
                      onClick={handleDocumentUpload}
                      disabled={!uploadForm.file || isLoading}
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isLoading ? "Uploading..." : "Upload Document"}
                    </Button>

                    <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
                      <div>
                        <div className="flex items-center space-x-2 mb-3">
                          <Info className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium">Upload Guidelines</h4>
                        </div>
                        <div>
                          <h5 className="font-medium text-sm mb-2">Supported Formats</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• PDF documents</li>
                            <li>• Plain text files (.txt)</li>
                            <li>• Word documents (.docx)</li>
                          </ul>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm mb-2">Best Practices</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>• Keep files under 50MB</li>
                          <li>• Use descriptive filenames</li>
                          <li>• Group related docs in same thread</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Document Management</CardTitle>
                    <CardDescription>Manage uploaded documents and files</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-medium">{doc.filename}</h3>
                            <p className="text-sm text-gray-600">
                              Uploaded by {doc.uploaded_by} • {new Date(doc.uploaded_at).toLocaleDateString()} •
                              {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Badge variant="secondary" className="mt-1">
                              {doc.file_type}
                            </Badge>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 bg-transparent">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {documents.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No documents uploaded yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Prompt Management</h2>
                    <p className="text-gray-600">Manage and test your AI prompts</p>
                  </div>
                  <Button onClick={() => setIsCreatingPrompt(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Prompt
                  </Button>
                </div>

                {isCreatingPrompt && (
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedPrompt ? "Edit Prompt" : "Create New Prompt"}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleCreatePrompt} className="space-y-4">
                        <div>
                          <Label htmlFor="prompt_name">Name</Label>
                          <Input
                            id="prompt_name"
                            value={promptForm.name}
                            onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="prompt_template">Template</Label>
                          <Textarea
                            id="prompt_template"
                            rows={8}
                            value={promptForm.template}
                            onChange={(e) => setPromptForm({ ...promptForm, template: e.target.value })}
                            placeholder="You are WEHO AI, a helpful assistant. Provide accurate answers in {language} based on the context below.

Context:
{context}"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="prompt_variables">Variables (JSON)</Label>
                          <Textarea
                            id="prompt_variables"
                            rows={3}
                            value={promptForm.variables}
                            onChange={(e) => setPromptForm({ ...promptForm, variables: e.target.value })}
                            placeholder='{"language": "English", "context": "", "messages": []}'
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Saving..." : selectedPrompt ? "Update Prompt" : "Create Prompt"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsCreatingPrompt(false)
                              setSelectedPrompt(null)
                              setPromptForm({ name: "", template: "", variables: "{}" })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  {prompts.map((prompt) => (
                    <Card key={prompt.id} className={`${prompt.is_active ? "border-blue-500 border-2" : "border"}`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold">{prompt.name}</h3>
                            {prompt.is_active && <Badge className="bg-blue-600 text-white">Active</Badge>}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleTestPrompt(prompt)} title="Test">
                              <Play className="h-4 w-4 mr-1" />
                              Test
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPrompt(prompt)
                                setPromptForm({
                                  name: prompt.name,
                                  template: prompt.template,
                                  variables: JSON.stringify(prompt.variables, null, 2),
                                })
                                setIsCreatingPrompt(true)
                              }}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            {!prompt.is_active && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetActivePrompt(prompt.id)}
                                title="Set Active"
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <Activity className="h-4 w-4 mr-1" />
                                Set Active
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                              onClick={() => handleDeletePrompt(prompt.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                          Created by {prompt.created_by} • {new Date(prompt.created_at).toLocaleDateString()}
                        </p>

                        <div className="mb-4">
                          <h4 className="font-medium mb-2">Template</h4>
                          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                            {prompt.template}
                          </div>
                        </div>

                        {Object.keys(prompt.variables).length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Variables</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.keys(prompt.variables).map((key) => (
                                <Badge key={key} variant="secondary" className="bg-blue-100 text-blue-800">
                                  {key}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {prompts.length === 0 && (
                    <Card>
                      <CardContent className="text-center py-12">
                        <p className="text-gray-500">No prompts created yet</p>
                        <Button onClick={() => setIsCreatingPrompt(true)} className="mt-4" variant="outline">
                          Create Your First Prompt
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
