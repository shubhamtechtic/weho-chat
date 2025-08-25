"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Eye,
  EyeOff,
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
  Settings,
  TrendingUp,
  Clock,
} from "lucide-react"

import { apiClient } from "@/lib/api-client"

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
  const [activeTab, setActiveTab] = useState<
    "profile" | "change-password" | "analytics" | "documents" | "prompts" | "upload"
  >("profile")
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

  const fetchPrompts = async () => {
    try {
      const data = await apiClient.listPrompts()
      setPrompts(data)
    } catch (error) {
      console.error("Failed to fetch prompts:", error)
      toast.error("Failed to fetch prompts")
    }
  }

  const fetchMetrics = async () => {
    try {
      const data = await apiClient.getMetrics()
      setMetrics(data)
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
      toast.error("Failed to fetch metrics")
    }
  }

  const fetchDocuments = async () => {
    try {
      const data = await apiClient.getDocs()
      setDocuments(data)
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      toast.error("Failed to fetch documents")
    }
  }

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let variables = {}
      if (promptForm.variables.trim()) {
        variables = JSON.parse(promptForm.variables)
      }

      if (selectedPrompt) {
        await apiClient.updatePrompt(selectedPrompt.id, {
          template: promptForm.template,
          variables,
        })
        toast.success("Prompt updated successfully")
      } else {
        await apiClient.createPrompt({
          name: promptForm.name,
          template: promptForm.template,
          variables,
        })
        toast.success("Prompt created successfully")
      }

      setIsCreatingPrompt(false)
      setSelectedPrompt(null)
      setPromptForm({ name: "", template: "", variables: "{}" })
      fetchPrompts()
    } catch (error) {
      console.error("Failed to save prompt:", error)
      toast.error("Failed to save prompt")
    }
  }

  const handleDeletePrompt = async (promptId: string) => {
    if (confirm("Are you sure you want to delete this prompt?")) {
      try {
        await apiClient.deletePrompt(promptId)
        toast.success("Prompt deleted successfully")
        fetchPrompts()
      } catch (error) {
        console.error("Failed to delete prompt:", error)
        toast.error("Failed to delete prompt")
      }
    }
  }

  const handleSetActivePrompt = async (promptId: string) => {
    try {
      await apiClient.setActivePrompt(promptId)
      toast.success("Prompt set as active")
      fetchPrompts()
    } catch (error) {
      console.error("Failed to set active prompt:", error)
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
      // Load all data immediately on login
      fetchMetrics()
      fetchDocuments()
      fetchPrompts()
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === "analytics") fetchMetrics()
      if (activeTab === "documents") fetchDocuments()
      if (activeTab === "prompts") fetchPrompts()
    }
  }, [activeTab])

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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Document Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700">{adminUser?.email || "admin@example.com"}</span>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">Super Admin</span>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Uploads</h3>
              <Upload className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics?.upload_count || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Documents uploaded</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Queries</h3>
              <MessageSquare className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{metrics?.query_count || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Chat interactions</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics ? Math.round((metrics.query_success / metrics.query_count) * 100) : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Successful queries</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Avg Response</h3>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics?.avg_response_latency ? `${metrics.avg_response_latency.toFixed(2)}s` : "0s"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Response latency</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "upload", label: "Upload Documents", icon: Upload },
                { id: "documents", label: "Manage Documents", icon: FileText },
                { id: "prompts", label: "Prompt Management", icon: MessageSquare },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
                { id: "profile", label: "Profile", icon: User },
                { id: "change-password", label: "Change Password", icon: Lock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "upload" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
                  <p className="text-sm text-gray-500">
                    Upload PDF, TXT, or DOCX files to enhance the chatbot's knowledge base
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="threadId" className="text-sm font-medium text-gray-700">
                      Thread ID
                    </Label>
                    <Input
                      id="threadId"
                      value={uploadForm.threadId}
                      onChange={(e) => setUploadForm({ ...uploadForm, threadId: e.target.value })}
                      placeholder="default"
                      className="mt-1 max-w-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Documents with the same thread ID will be grouped together
                    </p>
                  </div>

                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors"
                    onDrop={handleFileDropEvent}
                    onDragOver={handleDragOverEvent}
                    onDragLeave={handleDragLeaveEvent}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Drag and drop your file here</h3>
                    <p className="text-gray-500 mb-4">or</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="mb-4">
                      Choose File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.docx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500">Supports PDF, TXT, DOCX files up to 50MB</p>
                    {uploadForm.file && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">Selected: {uploadForm.file.name}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleDocumentUploadEvent}
                    disabled={!uploadForm.file || isLoading}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isLoading ? "Uploading..." : "Upload Document"}
                  </Button>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Supported Formats
                    </h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• PDF documents</li>
                      <li>• Plain text files (.txt)</li>
                      <li>• Word documents (.docx)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Best Practices</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Keep files under 50MB</li>
                      <li>• Use descriptive filenames</li>
                      <li>• Group related docs in same thread</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Manage Documents</h2>
                    <p className="text-sm text-gray-500">View and manage uploaded documents</p>
                  </div>
                  <Button onClick={fetchDocuments} variant="outline">
                    Refresh
                  </Button>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded yet</h3>
                    <p className="text-gray-500 mb-4">Upload your first document to get started</p>
                    <Button onClick={() => setActiveTab("upload")} variant="outline">
                      Upload Document
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <div>
                              <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                              <p className="text-sm text-gray-500">
                                Thread: {doc.thread_id} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB •{" "}
                                {doc.file_type}
                              </p>
                              <p className="text-xs text-gray-400">
                                Uploaded by {doc.uploaded_by} on {new Date(doc.uploaded_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "analytics" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
                  <p className="text-sm text-gray-500">Comprehensive analytics for your chatbot system</p>
                </div>

                {metrics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Upload Count:</h3>
                        <p className="text-2xl font-bold text-gray-900">{metrics.upload_count}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Query Count:</h3>
                        <p className="text-2xl font-bold text-gray-900">{metrics.query_count}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Successful Queries:</h3>
                        <p className="text-2xl font-bold text-gray-900">{metrics.query_success}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Failed Queries:</h3>
                        <p className="text-2xl font-bold text-gray-900">{metrics.query_errors}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Retrieve Latency:</h3>
                        <p className="text-2xl font-bold text-gray-900">{metrics.avg_retrieve_latency.toFixed(3)}s</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Response Latency:</h3>
                        <p className="text-2xl font-bold text-gray-900">{metrics.avg_response_latency.toFixed(3)}s</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated:</h3>
                      <p className="text-lg text-gray-900">{new Date(metrics.last_updated).toLocaleString()}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
                    <p className="text-gray-500">Analytics data will appear here once you start using the chatbot</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
                  <p className="text-sm text-gray-500">View your admin profile information</p>
                </div>

                {adminUser && (
                  <div className="bg-white p-6 rounded-lg border space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Email</Label>
                      <p className="text-gray-900">{adminUser.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Name</Label>
                      <p className="text-gray-900">
                        {adminUser.first_name} {adminUser.last_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Role</Label>
                      <p className="text-gray-900">{adminUser.is_superuser ? "Super Admin" : "Admin"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Status</Label>
                      <p className="text-gray-900">{adminUser.is_active ? "Active" : "Inactive"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Last Login</Label>
                      <p className="text-gray-900">
                        {adminUser.last_login ? new Date(adminUser.last_login).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Created At</Label>
                      <p className="text-gray-900">{new Date(adminUser.created_at).toLocaleString()}</p>
                    </div>
                    <div className="pt-4">
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="text-red-600 hover:text-red-700 bg-transparent"
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "change-password" && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                  <p className="text-sm text-gray-500">Update your admin password</p>
                </div>

                <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
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
                    <Label htmlFor="confirm_new_password">Confirm New Password</Label>
                    <Input
                      id="confirm_new_password"
                      type="password"
                      value={resetPasswordForm.confirm_password}
                      onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirm_password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Changing..." : "Change Password"}
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "prompts" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Prompt Management</h2>
                    <p className="text-sm text-gray-500">Manage and test your AI prompts</p>
                  </div>
                  <Button onClick={() => setIsCreatingPrompt(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Prompt
                  </Button>
                </div>

                {prompts.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts created yet</h3>
                    <p className="text-gray-500 mb-4">Create your first prompt to get started</p>
                    <Button onClick={() => setIsCreatingPrompt(true)} variant="outline">
                      Create Your First Prompt
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {prompts.map((prompt) => (
                      <div key={prompt.id} className="border border-blue-200 rounded-lg p-6 bg-blue-50/30">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{prompt.name}</h3>
                            {prompt.is_active && (
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestPrompt(prompt)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Test
                            </Button>
                            <Button
                              variant="ghost"
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
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            {!prompt.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetActivePrompt(prompt.id)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                <Clock className="w-4 h-4 mr-1" />
                                Set Active
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">
                            Created by {prompt.created_by} • {new Date(prompt.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Template</h4>
                          <div className="bg-gray-50 p-3 rounded border text-sm font-mono text-gray-800">
                            {prompt.template}
                          </div>
                        </div>

                        {Object.keys(prompt.variables).length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Variables</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.keys(prompt.variables).map((variable) => (
                                <span key={variable} className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                  {variable}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
