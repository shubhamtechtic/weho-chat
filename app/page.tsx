/* eslint-disable @next/next/no-img-element */
"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar"
import { type DragEvent, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import { PlusCircle, SendIcon, Trash2, Paperclip, Bot, User, Upload, LogIn, LogOut } from "lucide-react"
import { nanoid } from "nanoid"
import { apiClient } from "@/lib/api-client"

function AttachmentIcon() {
  return <Paperclip className="h-4 w-4" />
}

function BotIcon() {
  return <Bot className="h-4 w-4" />
}

function UserIcon() {
  return <User className="h-4 w-4" />
}

function Markdown({ children }: { children: string }) {
  const formatText = (text: string) => {
    text = text.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>',
    )
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>")
    text = text.replace(/\n/g, "<br>")
    return text
  }

  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatText(children) }} />
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  created_at?: string
  data?: {
    attachments?: Array<{
      name: string
      contentType: string
      url: string
    }>
  }
}

type Chat = {
  id: string
  title: string
  messages: Message[]
  last_active?: string
  preview?: string
}

const getTextFromDataUrl = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1]
  try {
    return window.atob(base64)
  } catch (e) {
    console.error("Failed to decode base64 string", e)
    return ""
  }
}

function TextFilePreview({ file }: { file: File }) {
  const [content, setContent] = useState<string>("")

  useEffect(() => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      setContent(typeof text === "string" ? text.slice(0, 100) : "")
    }
    reader.readAsText(file)
  }, [file])

  return (
    <div>
      {content}
      {content.length >= 100 && "..."}
    </div>
  )
}

function ChatHistory({
  chats,
  activeChatId,
  setActiveChat,
  deleteChat,
  newChat,
  renameChat,
}: {
  chats: Chat[]
  activeChatId: string | null
  setActiveChat: (id: string) => void
  deleteChat: (id: string) => void
  newChat: () => void
  renameChat: (id: string, title: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")

  const handleRename = (chat: Chat) => {
    setEditingId(chat.id)
    setEditTitle(chat.title)
  }

  const saveRename = async (chatId: string) => {
    if (editTitle.trim()) {
      await renameChat(chatId, editTitle.trim())
    }
    setEditingId(null)
    setEditTitle("")
  }

  const nonEmptyChats = chats.filter((chat) => chat.messages.length > 0)
  return (
    <div className="flex flex-col h-full">
      <SidebarHeader>
        <h2 className="text-lg font-semibold">History</h2>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto">
        <SidebarMenu>
          {nonEmptyChats.length > 0 ? (
            nonEmptyChats.map((chat) => (
              <SidebarMenuItem key={chat.id} className="relative">
                {editingId === chat.id ? (
                  <div className="flex items-center gap-1 p-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveRename(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(chat.id)
                        if (e.key === "Escape") setEditingId(null)
                      }}
                      className="flex-1 bg-transparent border-b border-border text-sm"
                      autoFocus
                    />
                  </div>
                ) : (
                  <SidebarMenuButton
                    onClick={() => setActiveChat(chat.id)}
                    onDoubleClick={() => handleRename(chat)}
                    isActive={activeChatId === chat.id}
                    className="w-full text-left justify-start pr-8"
                  >
                    <span className="truncate">{chat.title}</span>
                  </SidebarMenuButton>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteChat(chat.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </SidebarMenuItem>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">No chat history yet.</p>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <Button variant="outline" className="w-full justify-center bg-transparent" onClick={newChat}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </SidebarFooter>
    </div>
  )
}

interface AuthUser {
  id: string
  email: string
  name: string
  access_token: string
  refresh_token: string
}

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isGuest, setIsGuest] = useState(true)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [authLoading, setAuthLoading] = useState(false)

  const currentChat = chats.find((chat) => chat.id === activeChatId)
  const messages = currentChat?.messages || []

  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
        setIsGuest(false)
      } catch (error) {
        console.error("Failed to parse saved user data:", error)
        localStorage.removeItem("user")
      }
    }
  }, [])

  useEffect(() => {
    if (!isGuest && user) {
      loadChatHistory()
    } else if (isGuest) {
      loadGuestChatHistory()
    } else {
      createNewChat()
    }
  }, [user, isGuest])

  const loadGuestChatHistory = () => {
    try {
      const savedChats = localStorage.getItem("guest_chats")
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats)
        setChats(parsedChats)
        if (parsedChats.length > 0) {
          setActiveChatId(parsedChats[0].id)
        } else {
          createNewChat()
        }
      } else {
        createNewChat()
      }
    } catch (error) {
      console.error("Failed to load guest chat history:", error)
      createNewChat()
    }
  }

  const saveGuestChats = (chats: Chat[]) => {
    if (isGuest) {
      localStorage.setItem("guest_chats", JSON.stringify(chats))
    }
  }

  const loadChatHistory = async () => {
    if (!user?.id) return

    try {
      console.log("[v0] Loading chat history for user:", user.id)
      const sessions = await apiClient.getUserSessions(user.id)
      console.log("[v0] Fetched sessions:", sessions)

      const chatsFromBackend: Chat[] = await Promise.all(
        sessions.map(async (session: any) => {
          try {
            const messages = await apiClient.getSessionMessages(session.session_id, user.id)
            return {
              id: session.session_id,
              title: session.title || session.preview || "New Chat",
              messages: messages.map((msg: any) => ({
                id: nanoid(),
                role: msg.role,
                content: msg.content,
                created_at: msg.created_at,
              })),
              last_active: session.last_active,
              preview: session.preview,
            }
          } catch (error) {
            console.error(`[v0] Failed to load messages for session ${session.session_id}:`, error)
            return {
              id: session.session_id,
              title: session.title || session.preview || "New Chat",
              messages: [],
              last_active: session.last_active,
              preview: session.preview,
            }
          }
        }),
      )

      console.log("[v0] Processed chats:", chatsFromBackend)
      setChats(chatsFromBackend)
      if (chatsFromBackend.length > 0) {
        setActiveChatId(chatsFromBackend[0].id)
      } else {
        createNewChat()
      }
    } catch (error) {
      console.error("[v0] Failed to load chat history:", error)
      createNewChat()
    }
  }

  const createNewChat = () => {
    const newChatId = nanoid()
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
    }
    setChats((prevChats) => {
      const newChats = [newChat, ...prevChats]
      saveGuestChats(newChats)
      return newChats
    })
    setActiveChatId(newChatId)
  }

  const deleteChat = async (chatId: string) => {
    try {
      if (!isGuest && user?.id) {
        // For logged-in users, delete from backend
        await apiClient.deleteSession(chatId, user.id)
      }

      // Update local state for both guest and logged-in users
      setChats((prev) => {
        const newChats = prev.filter((chat) => chat.id !== chatId)
        saveGuestChats(newChats)

        if (activeChatId === chatId) {
          if (newChats.length > 0) {
            setActiveChatId(newChats[0].id)
          } else {
            createNewChat()
          }
        }
        return newChats
      })
      toast.success("Chat deleted successfully")
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast.error("Failed to delete chat")
    }
  }

  const renameChat = async (chatId: string, title: string) => {
    try {
      if (!isGuest && user?.id) {
        // For logged-in users, rename in backend
        await apiClient.renameSession(chatId, user.id, title)
      }

      // Update local state for both guest and logged-in users
      setChats((prev) => {
        const newChats = prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
        saveGuestChats(newChats)
        return newChats
      })
      toast.success("Chat renamed successfully")
    } catch (error) {
      console.error("Error renaming chat:", error)
      toast.error("Failed to rename chat")
    }
  }

  const updateChatTitle = (chatId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage
    setChats((prev) => {
      const newChats = prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat))
      saveGuestChats(newChats)
      return newChats
    })
  }

  const [files, setFiles] = useState<FileList | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items
    if (items) {
      const files = Array.from(items)
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)
      if (files.length > 0) {
        const validFiles = files.filter((file) => file.type.startsWith("image/") || file.type.startsWith("text/"))
        if (validFiles.length === files.length) {
          const dataTransfer = new DataTransfer()
          validFiles.forEach((file) => dataTransfer.items.add(file))
          setFiles(dataTransfer.files)
        } else {
          toast.error("Only image and text files are allowed")
        }
      }
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFiles = event.dataTransfer.files
    const droppedFilesArray = Array.from(droppedFiles)
    if (droppedFilesArray.length > 0) {
      const validFiles = droppedFilesArray.filter(
        (file) => file.type.startsWith("image/") || file.type.startsWith("text/"),
      )
      if (validFiles.length === droppedFilesArray.length) {
        const dataTransfer = new DataTransfer()
        validFiles.forEach((file) => dataTransfer.items.add(file))
        setFiles(dataTransfer.files)
      } else {
        toast.error("Only image and text files are allowed!")
      }
    }
    setIsDragging(false)
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (selectedFiles) {
      const validFiles = Array.from(selectedFiles).filter(
        (file) => file.type.startsWith("image/") || file.type.startsWith("text/"),
      )
      if (validFiles.length === selectedFiles.length) {
        const dataTransfer = new DataTransfer()
        validFiles.forEach((file) => dataTransfer.items.add(file))
        setFiles(dataTransfer.files)
      } else {
        toast.error("Only image and text files are allowed")
      }
    }
  }

  const uploadFiles = async (filesToUpload: FileList) => {
    setIsUploading(true)
    try {
      const uploadPromises = Array.from(filesToUpload).map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("thread_id", "default")

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Upload failed")
        }

        return await response.json()
      })

      await Promise.all(uploadPromises)
      toast.success(`${filesToUpload.length} file(s) uploaded successfully`)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload files")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !files) return
    if (!activeChatId) return

    if (files && files.length > 0) {
      await uploadFiles(files)
    }

    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: input.trim(),
      data: {
        attachments: files
          ? Array.from(files).map((file) => ({
              name: file.name,
              contentType: file.type,
              url: URL.createObjectURL(file),
            }))
          : undefined,
      },
    }

    setChats((prev) => {
      const newChats = prev.map((chat) =>
        chat.id === activeChatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat,
      )
      saveGuestChats(newChats)
      return newChats
    })

    if (messages.length === 0) {
      updateChatTitle(activeChatId, input.trim())
    }

    setInput("")
    setFiles(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          id: activeChatId,
          user_id: user?.id,
          guest: isGuest,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const assistantMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: "",
      }

      setChats((prev) => {
        const newChats = prev.map((chat) =>
          chat.id === activeChatId ? { ...chat, messages: [...chat.messages, assistantMessage] } : chat,
        )
        saveGuestChats(newChats)
        return newChats
      })

      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value, { stream: true })

          setChats((prev) => {
            const newChats = prev.map((chat) =>
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessage.id ? { ...msg, content: msg.content + chunk } : msg,
                    ),
                  }
                : chat,
            )
            saveGuestChats(newChats)
            return newChats
          })
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      toast.error("Failed to get response. Please try again.")
      setChats((prev) => {
        const newChats = prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: nanoid(),
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                  },
                ],
              }
            : chat,
        )
        saveGuestChats(newChats)
        return newChats
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data)
        setIsGuest(false)
        localStorage.setItem("user", JSON.stringify(data))
        setShowAuthDialog(false)
        setAuthForm({ name: "", email: "", password: "", confirmPassword: "" })
        toast.success("Logged in successfully!")
      } else {
        toast.error(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Login failed")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (authForm.password !== authForm.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }

    setAuthLoading(true)

    try {
      const response = await fetch("/api/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Registration successful! Please login.")
        setAuthMode("login")
        setAuthForm({ name: "", email: "", password: "", confirmPassword: "" })
      } else {
        toast.error(data.error || "Registration failed")
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast.error("Registration failed")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    setIsGuest(true)
    localStorage.removeItem("user")
    setChats([])
    createNewChat()
    toast.success("Logged out successfully!")
  }

  const continueAsGuest = () => {
    setIsGuest(true)
    setShowAuthDialog(false)
    createNewChat()
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <ChatHistory
          chats={chats}
          activeChatId={activeChatId}
          setActiveChat={setActiveChatId}
          deleteChat={deleteChat}
          newChat={createNewChat}
          renameChat={renameChat}
        />
      </Sidebar>
      <SidebarInset>
        <div
          className="flex flex-col h-dvh bg-background"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <header className="flex items-center p-4 border-b">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-bold ml-4">Weho AI Chat</h1>
            <div className="ml-auto flex items-center gap-2">
              {isUploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mr-4">
                  <Upload className="h-4 w-4 animate-spin" />
                  Uploading...
                </div>
              )}
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Welcome, {user.name}</span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {isGuest && <span className="text-sm text-muted-foreground">Guest Mode</span>}
                  <Button variant="outline" size="sm" onClick={() => setShowAuthDialog(true)}>
                    <LogIn className="h-4 w-4 mr-1" />
                    Login
                  </Button>
                </div>
              )}
            </div>
          </header>
          <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{authMode === "login" ? "Login" : "Register"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <form onSubmit={authMode === "login" ? handleLogin : handleRegister} className="space-y-4">
                  {authMode === "register" && (
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  {authMode === "register" && (
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={authForm.confirmPassword}
                        onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={authLoading}>
                    {authLoading ? "Loading..." : authMode === "login" ? "Login" : "Register"}
                  </Button>
                </form>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "register" : "login")
                      setAuthForm({ name: "", email: "", password: "", confirmPassword: "" })
                    }}
                    className="w-full"
                  >
                    {authMode === "login" ? "Need an account? Register" : "Have an account? Login"}
                  </Button>
                  <Button variant="ghost" onClick={continueAsGuest} className="w-full">
                    Continue as Guest
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <AnimatePresence>
            {isDragging && (
              <motion.div
                className="fixed pointer-events-none bg-background/90 h-dvh w-dvw z-10 flex flex-row justify-center items-center flex-col gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div>Drag and drop files here</div>
                <div className="text-sm text-muted-foreground">{"(images and text)"}</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex-1 flex flex-col justify-between gap-4 p-4">
            {messages.length > 0 ? (
              <div className="flex flex-col gap-2 h-full items-center overflow-y-auto">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className="flex flex-row gap-2 px-4 w-full"
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-muted-foreground">
                      {message.role === "assistant" ? <BotIcon /> : <UserIcon />}
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <div className="text-foreground flex flex-col gap-4">
                        <Markdown>{message.content}</Markdown>
                      </div>
                      <div className="flex flex-row gap-2 flex-wrap">
                        {message.data?.attachments?.map((attachment) =>
                          attachment.contentType?.startsWith("image") ? (
                            <img
                              className="rounded-md w-40 mb-3"
                              key={attachment.name}
                              src={attachment.url || "/placeholder.svg"}
                              alt={attachment.name}
                            />
                          ) : attachment.contentType?.startsWith("text") ? (
                            <div
                              key={attachment.name}
                              className="text-xs w-40 h-24 overflow-hidden text-muted-foreground border p-2 rounded-md bg-secondary mb-3"
                            >
                              {getTextFromDataUrl(attachment.url)}
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex flex-row gap-2 px-4 w-full">
                    <div className="size-[24px] flex flex-col justify-center items-center flex-shrink-0 text-muted-foreground">
                      <BotIcon />
                    </div>
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <div>hmm...</div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <motion.div className="flex-1 flex flex-col justify-center items-center">
                <div className="border rounded-lg p-6 flex flex-col gap-4 text-muted-foreground text-sm max-w-md w-full">
                  <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2 text-foreground">
                    <BotIcon />
                    Weho AI Chat
                  </h1>
                  <p>
                    Start a new conversation by typing a message below. You can also attach files to ask questions about
                    them.
                  </p>
                </div>
              </motion.div>
            )}
            <form className="flex flex-col gap-2 relative items-center" onSubmit={handleSubmit}>
              <AnimatePresence>
                {files && files.length > 0 && (
                  <div className="flex flex-row gap-2 absolute bottom-20 px-4 w-full md:w-full">
                    {Array.from(files).map((file) =>
                      file.type.startsWith("image") ? (
                        <div key={file.name}>
                          <motion.img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="rounded-md w-16"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{
                              y: -10,
                              scale: 1.1,
                              opacity: 0,
                              transition: { duration: 0.2 },
                            }}
                          />
                        </div>
                      ) : (
                        <motion.div
                          key={file.name}
                          className="text-[8px] leading-1 w-28 h-16 overflow-hidden text-muted-foreground border p-2 rounded-lg bg-secondary flex flex-col items-center justify-center"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{
                            y: -10,
                            scale: 1.1,
                            opacity: 0,
                            transition: { duration: 0.2 },
                          }}
                        >
                          <TextFilePreview file={file} />
                        </motion.div>
                      ),
                    )}
                  </div>
                )}
              </AnimatePresence>
              <input
                type="file"
                multiple
                accept="image/*,text/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center w-full bg-secondary rounded-full px-2 py-1">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="text-muted-foreground hover:text-foreground focus:outline-none p-2"
                  aria-label="Upload Files"
                >
                  <AttachmentIcon />
                </button>
                <input
                  ref={inputRef}
                  className="bg-transparent flex-grow outline-none text-foreground placeholder-muted-foreground px-2"
                  placeholder="Send a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full"
                  disabled={(!input.trim() && !files) || isLoading}
                >
                  <SendIcon className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
