interface MarkdownProps {
  children: string
}

export function Markdown({ children }: MarkdownProps) {
  // Simple markdown-like rendering for basic formatting
  const formatText = (text: string) => {
    // Handle code blocks
    text = text.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>',
    )

    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')

    // Handle bold text
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")

    // Handle italic text
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>")

    // Handle line breaks
    text = text.replace(/\n/g, "<br>")

    return text
  }

  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatText(children) }} />
}
