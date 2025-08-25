"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useUserAuth } from "@/contexts/user-auth-context"
import { apiClient, type ChatSession } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Trash2, Plus, User, LogOut, UserPlus, Edit2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatHistorySidebarProps {
  currentSessionId: string | null
  onSessionSelect: (sessionId: string) => void
  onNewChat: () => void
  className?: string
  onShowLogin?: () => void
  onShowRegister?: () => void
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  currentSessionId,
  onSessionSelect,
  onNewChat,
  className,
  onShowLogin,
  onShowRegister,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)
  const { user, logout, isGuest } = useUserAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user && !isGuest) {
      loadSessions()
    }
  }, [user, isGuest])

  const loadSessions = async () => {
    if (!user || isGuest) return

    setIsLoading(true)
    try {
      const userSessions = await apiClient.getUserSessions(user.id)

      // Fetch metadata for each session to get the actual titles
      const sessionsWithMetadata = await Promise.all(
        userSessions.map(async (session) => {
          try {
            const metadata = await apiClient.getSessionMetadata(session.session_id, user.id)
            return {
              ...session,
              title: metadata.title,
            }
          } catch (error) {
            // If metadata fetch fails, use the original session data
            console.warn(`Failed to fetch metadata for session ${session.session_id}:`, error)
            return session
          }
        }),
      )

      setSessions(sessionsWithMetadata)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user || isGuest) return

    try {
      await apiClient.deleteSession(sessionId, user.id)
      setSessions(sessions.filter((s) => s.session_id !== sessionId))

      if (currentSessionId === sessionId) {
        onNewChat()
      }

      toast({
        title: "Session deleted",
        description: "Chat history has been removed",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      })
    }
  }

  const startRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSession(session.session_id)
    setEditTitle(session.title || session.preview || "New Chat")
  }

  const cancelRename = () => {
    setEditingSession(null)
    setEditTitle("")
  }

  const saveRename = async (sessionId: string) => {
    if (!user || isGuest || !editTitle.trim()) return

    setIsRenaming(true)
    try {
      await apiClient.renameSession(sessionId, user.id, editTitle.trim())

      // Update the local sessions state optimistically
      setSessions(sessions.map((s) => (s.session_id === sessionId ? { ...s, title: editTitle.trim() } : s)))

      setEditingSession(null)
      setEditTitle("")

      toast({
        title: "Session renamed",
        description: "Chat title has been updated",
      })

      // Optionally refresh the sessions to ensure data consistency
      // loadSessions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename session",
        variant: "destructive",
      })
      // Reset the title in case of error
      setSessions(
        sessions.map((s) =>
          s.session_id === sessionId
            ? { ...s, title: s.title } // Keep original title
            : s,
        ),
      )
    } finally {
      setIsRenaming(false)
    }
  }

  const handleRenameKeyPress = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === "Enter") {
      saveRename(sessionId)
    } else if (e.key === "Escape") {
      cancelRename()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  if (isGuest) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Guest Mode</h2>
          <p className="text-sm text-muted-foreground">Chat history is not saved in guest mode</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">Login to save and access your chat history</p>
          </div>

          <div className="w-full space-y-3">
            <Button onClick={() => onShowLogin?.()} className="w-full" size="sm">
              <User className="w-4 h-4 mr-2" />
              Login
            </Button>
            <Button onClick={() => onShowRegister?.()} variant="outline" className="w-full" size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Register
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">Or continue as guest to try the chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* User Info & Controls */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        <Button onClick={onNewChat} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-4">
        <h3 className="text-sm font-medium mb-3">Chat History</h3>
        <Separator />

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-16 animate-pulse bg-muted" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No chat history yet</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {sessions.map((session) => (
                <Card
                  key={session.session_id}
                  className={cn(
                    "p-3 cursor-pointer transition-colors hover:bg-accent group",
                    currentSessionId === session.session_id && "bg-accent border-primary",
                  )}
                  onClick={() => editingSession !== session.session_id && onSessionSelect(session.session_id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingSession === session.session_id ? (
                        <div className="space-y-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => handleRenameKeyPress(e, session.session_id)}
                            className="text-sm h-8"
                            placeholder="Enter chat title..."
                            disabled={isRenaming}
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => saveRename(session.session_id)}
                              disabled={isRenaming || !editTitle.trim()}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={cancelRename}
                              disabled={isRenaming}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium line-clamp-2 mb-1">
                            {session.title || session.preview || "New Chat"}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(session.last_active)}</p>
                        </>
                      )}
                    </div>
                    {editingSession !== session.session_id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={(e) => startRename(session, e)}
                          title="Rename chat"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={(e) => deleteSession(session.session_id, e)}
                          title="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
