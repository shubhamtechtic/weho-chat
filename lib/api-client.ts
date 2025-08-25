const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.weho.websitetestingbox.com/api/v1"

export interface AdminLoginRequest {
  email: string
  password: string
}

export interface UserRegistrationRequest {
  email: string
  name: string
  password: string
  confirm_password: string
}

export interface UserLoginRequest {
  email: string
  password: string
}

export interface UserLoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    name: string
    is_active: boolean
    is_verified: boolean
  }
}

export interface ChangePasswordRequest {
  old_password: string
  new_password: string
  confirm_password: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  new_password: string
}

export interface AdminLoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    is_superuser: boolean
    is_active: boolean
  }
}

export interface ChatRequest {
  query: string
  thread_id?: string
  language?: string
  session_id?: string
  is_guest?: boolean
  user_id?: string
}

export interface ChatSession {
  session_id: string
  last_active: string
  preview: string
  title?: string
}

export interface SessionMetadata {
  session_id: string
  title: string
  created_at: string
}

export interface ChatHistoryMessage {
  role: "user" | "assistant"
  content: string
  created_at: string
}

export interface MetricsResponse {
  upload_count: number
  query_count: number
  query_success: number
  query_errors: number
  avg_retrieve_latency: number
  avg_response_latency: number
  last_updated: string
}

export interface UploadedDoc {
  id: string
  filename: string
  uploaded_by: string
  uploaded_at: string
  thread_id: string
  file_size: number
  file_type: string
  path: string
}

export interface PromptCreate {
  name: string
  template: string
  variables?: Record<string, any>
}

export interface PromptUpdate {
  template?: string
  variables?: Record<string, any>
}

export interface PromptTestInput {
  template: string
  variables: Record<string, any>
  messages: string[]
  language?: string
}

export interface Prompt {
  id: string
  name: string
  template: string
  variables: Record<string, any>
  created_by: string
  is_active: boolean
  created_at: string
}

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("admin_access_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // ========== ADMIN AUTHENTICATION ==========
  async login(credentials: AdminLoginRequest): Promise<AdminLoginResponse> {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Login failed")
    }

    return response.json()
  }

  // ========== USER AUTHENTICATION ==========
  async registerUser(userData: UserRegistrationRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Registration failed")
    }

    return response.json()
  }

  async loginUser(credentials: UserLoginRequest): Promise<UserLoginResponse> {
    const response = await fetch(`${API_BASE_URL}/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Login failed")
    }

    return response.json()
  }

  async logout(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/logout`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Logout failed")
    }

    return response.json()
  }

  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/admin/profile`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to get profile")
    }

    return response.json()
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(passwordData),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Password change failed")
    }

    return response.json()
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/auth/forgot-password?email=${encodeURIComponent(email)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Failed to send reset email")
    }

    return response.json()
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/admin/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, new_password: newPassword }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Failed to reset password")
    }

    return response.json()
  }

  // ========== CHATBOT ==========
  async chat(request: ChatRequest): Promise<ReadableStream> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: request.query,
        thread_id: request.thread_id || "default",
        language: request.language || "English",
        session_id: request.session_id || "default",
        is_guest: request.is_guest || false,
        user_id: request.user_id || null,
      }),
    })

    if (!response.ok) {
      throw new Error("Chat request failed")
    }

    return response.body!
  }

  // ========== CHAT HISTORY ==========
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/history/sessions/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to fetch sessions")
    }

    return response.json()
  }

  async getSessionMessages(sessionId: string, userId: string): Promise<ChatHistoryMessage[]> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/history/session/${sessionId}/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to fetch messages")
    }

    return response.json()
  }

  async deleteSession(sessionId: string, userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/history/session/${sessionId}/${userId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to delete session")
    }

    return response.json()
  }

  async renameSession(sessionId: string, userId: string, title: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/history/session/${sessionId}/rename`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        title: title,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to rename session")
    }

    return response.json()
  }

  async getSessionMetadata(sessionId: string, userId: string): Promise<SessionMetadata> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/history/session/${sessionId}/metadata/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || "Failed to fetch session metadata")
    }

    return response.json()
  }

  async uploadDocument(file: File, threadId = "default"): Promise<{ message: string }> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("thread_id", threadId)

    const response = await fetch(`${API_BASE_URL}/chatbot-v2/upload-doc`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: formData,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Upload failed")
    }

    return response.json()
  }

  async getMetrics(): Promise<MetricsResponse> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/metrics`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to get metrics")
    }

    return response.json()
  }

  async getDocs(filters?: { uploaded_by?: string; thread_id?: string }): Promise<UploadedDoc[]> {
    const params = new URLSearchParams()
    if (filters?.uploaded_by) params.append("uploaded_by", filters.uploaded_by)
    if (filters?.thread_id) params.append("thread_id", filters.thread_id)

    const response = await fetch(`${API_BASE_URL}/chatbot-v2/docs?${params}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to get documents")
    }

    return response.json()
  }

  async getDoc(docId: string): Promise<UploadedDoc> {
    const response = await fetch(`${API_BASE_URL}/chatbot-v2/docs/${docId}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to get document")
    }

    return response.json()
  }

  // Prompt management endpoints
  async createPrompt(data: PromptCreate): Promise<{ id: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/prompts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Failed to create prompt")
    }

    return response.json()
  }

  async listPrompts(): Promise<Prompt[]> {
    const response = await fetch(`${API_BASE_URL}/prompts`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to get prompts")
    }

    return response.json()
  }

  async getPrompt(promptId: string): Promise<Prompt> {
    const response = await fetch(`${API_BASE_URL}/prompts/${promptId}`, {
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to get prompt")
    }

    return response.json()
  }

  async updatePrompt(promptId: string, data: PromptUpdate): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/prompts/${promptId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Failed to update prompt")
    }

    return response.json()
  }

  async deletePrompt(promptId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/prompts/${promptId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to delete prompt")
    }

    return response.json()
  }

  async setActivePrompt(promptId: string): Promise<{ message: string; id: string }> {
    const response = await fetch(`${API_BASE_URL}/prompts/set-active/${promptId}`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to set active prompt")
    }

    return response.json()
  }

  async testPrompt(input: PromptTestInput): Promise<{ response: string }> {
    const response = await fetch(`${API_BASE_URL}/prompts/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || "Prompt test failed")
    }

    return response.json()
  }
}

export const apiClient = new ApiClient()
