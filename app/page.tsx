/* eslint-disable @next/next/no-img-element */
"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
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
import { PlusCircle, SendIcon, Trash2, Paperclip, Bot, User } from "lucide-react"
import { nanoid } from "nanoid"

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
}: {
  chats: Chat[]
  activeChatId: string | null
  setActiveChat: (id: string) => void
  deleteChat: (id: string) => void
  newChat: () => void
}) {
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
                <SidebarMenuButton
                  onClick={() => setActiveChat(chat.id)}
                  isActive={activeChatId === chat.id}
                  className="w-full text-left justify-start pr-8"
                >
                  <span className="truncate">{chat.title}</span>
                </SidebarMenuButton>
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

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const currentChat = chats.find((chat) => chat.id === activeChatId)
  const messages = currentChat?.messages || []

  useEffect(() => {
    const savedChats = localStorage.getItem("weho_ai_chats")
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
  }, [])

  useEffect(() => {
    if (chats.length > 0) {
      const nonEmptyChats = chats.filter((chat) => chat.messages.length > 0)
      if (nonEmptyChats.length > 0) {
        localStorage.setItem("weho_ai_chats", JSON.stringify(nonEmptyChats))
      } else {
        localStorage.removeItem("weho_ai_chats")
      }
    } else {
      localStorage.removeItem("weho_ai_chats")
    }
  }, [chats])

  const createNewChat = () => {
    const newChatId = nanoid()
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
    }
    setChats((prevChats) => [newChat, ...prevChats])
    setActiveChatId(newChatId)
  }

  const deleteChat = (chatId: string) => {
    setChats((prev) => {
      const newChats = prev.filter((chat) => chat.id !== chatId)
      if (activeChatId === chatId) {
        if (newChats.length > 0) {
          setActiveChatId(newChats[0].id)
        } else {
          createNewChat()
        }
      }
      return newChats
    })
  }

  const updateChatTitle = (chatId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage
    setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !files) return
    if (!activeChatId) return

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

    setChats((prev) =>
      prev.map((chat) => (chat.id === activeChatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat)),
    )

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

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId ? { ...chat, messages: [...chat.messages, assistantMessage] } : chat,
        ),
      )

      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          const chunk = decoder.decode(value, { stream: true })

          setChats((prev) =>
            prev.map((chat) =>
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: chat.messages.map((msg) =>
                      msg.id === assistantMessage.id ? { ...msg, content: msg.content + chunk } : msg,
                    ),
                  }
                : chat,
            ),
          )
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      toast.error("Failed to get response. Please try again.")
      setChats((prev) =>
        prev.map((chat) =>
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
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (chats.length === 0) {
      createNewChat()
    }
  }, [])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <ChatHistory
          chats={chats}
          activeChatId={activeChatId}
          setActiveChat={setActiveChatId}
          deleteChat={deleteChat}
          newChat={createNewChat}
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
          </header>
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
