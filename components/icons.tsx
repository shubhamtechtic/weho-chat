import { MessageSquare, Paperclip, Bot, User } from "lucide-react"

export function AttachmentIcon() {
  return <Paperclip className="h-4 w-4" />
}

export function BotIcon() {
  return <Bot className="h-4 w-4" />
}

export function UserIcon() {
  return <User className="h-4 w-4" />
}

export function ChatIcon() {
  return <MessageSquare className="h-4 w-4" />
}
