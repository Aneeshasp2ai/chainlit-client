import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { LanguageSelector } from "../components/ui/LanguageSelector";
import { useChatInteract, useChatMessages } from "@chainlit/react-client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { marked } from "marked";
import {
  ArrowUp,
  Copy,
  Check,
  QrCode,
  Plus,
  Paperclip,
  AudioLines,
  X,
} from "lucide-react";
import { QRModal } from "../components/ui/QR-Modal";
import { useNavigate, useParams } from "react-router-dom";
import { UserDropdown } from "../components/ui/UserDropDown";

// Helper: Flatten messages
function flattenMessages(messages, condition) {
  return messages.reduce((acc, node) => {
    if (condition(node)) acc.push(node);
    if (node.steps?.length) acc.push(...flattenMessages(node.steps, condition));
    return acc;
  }, []);
}

// Hook: Manage dark/light theme toggle
function useThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      // Check both localStorage and system preference
      return (
        localStorage.theme === "dark" ||
        (!localStorage.theme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return { isDark, toggleTheme };
}

export function ChainlitUI() {
  const { threadId: urlThreadId } = useParams();
  const [activeThreadId, setActiveThreadId] = useState();
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const { sendMessage, uploadFile, clear, sendAudioChunk, stopTask } =
    useChatInteract();
  const { messages, threadId, firstInteraction } = useChatMessages();
  const { isDark, toggleTheme } = useThemeToggle();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrId, setQrId] = useState("");
  const navigate = useNavigate();

  // State to track which messages have been saved to avoid duplicates
  const [savedMessageIds, setSavedMessageIds] = useState(new Set());

  // State to hold backend messages
  const [backendMessages, setBackendMessages] = useState([]);

  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Microphone access granted");

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      console.log("Backend stream started");

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          await sendAudioChunk(e.data);
          console.log("Sent audio chunk");
        }
      };

      mediaRecorder.onstop = () => {
        console.log("Recorder stopped");
        stream.getTracks().forEach((track) => track.stop());
        stopTask(); // Optional backend notifier
      };

      mediaRecorder.start(1000);
      console.log("Recording started");
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const logout = () => {
    // Your logout logic here
    window.location.reload();
  };

  // Navigate to thread URL when threadId changes
  useEffect(() => {
    if (threadId) {
      navigate(`/thread/${threadId}`, { replace: true });
    }
  }, [threadId, navigate]);

  // Fetch chat history from backend when threadId changes
  useEffect(() => {
    if (threadId) {
      setSavedMessageIds(new Set()); // Reset saved message tracking for new thread

      fetch(`http://localhost:5000/api/chat/${threadId}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Loaded messages from backend:", data);
          setBackendMessages(data);

          // Mark all loaded messages as saved
          const loadedIds = data.filter((msg) => msg.id).map((msg) => msg.id);
          setSavedMessageIds(new Set(loadedIds));
        })
        .catch((error) => {
          console.error("Error loading chat history:", error);
          setBackendMessages([]);
        });
    }
  }, [threadId]);

  // Use backendMessages if available, otherwise fallback to messages from useChatMessages
  const flatMessages = useMemo(() => {
    const source = backendMessages.length > 0 ? backendMessages : messages;
    return flattenMessages(source, (m) => m.type.includes("message"));
  }, [backendMessages, messages]);

  // Save new messages to backend
  useEffect(() => {
    if (messages.length > 0 && threadId) {
      const saveNewMessages = async () => {
        for (const message of messages) {
          // Skip if message doesn't have content, ID, or is already saved
          if (
            !message.output ||
            !message.id ||
            savedMessageIds.has(message.id)
          ) {
            continue;
          }

          try {
            const messageToSave = {
              id: message.id,
              name: message.name,
              type: message.type,
              output: message.output,
              createdAt: message.createdAt || new Date().toISOString(),
            };

            console.log("Saving message to backend:", messageToSave);

            const response = await fetch(
              `http://localhost:5000/api/chat/${threadId}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: messageToSave }),
              }
            );

            if (response.ok) {
              // Mark this message as saved
              setSavedMessageIds((prev) => new Set([...prev, message.id]));
              console.log(`Message ${message.id} saved successfully`);
            } else {
              console.error(
                `Failed to save message ${message.id}:`,
                response.statusText
              );
            }
          } catch (error) {
            console.error(`Error saving message ${message.id}:`, error);
          }
        }
      };

      saveNewMessages();
    }
  }, [messages, threadId, savedMessageIds]);

  // Update chat history when new messages arrive
  useEffect(() => {
    if (flatMessages.length > 0 && threadId) {
      const lastMessage = flatMessages[flatMessages.length - 1];
      const preview =
        lastMessage.output?.substring(0, 30) +
        (lastMessage.output?.length > 30 ? "..." : "");

      setChatHistory((prev) => {
        // Check if this thread already exists in history
        const existingIndex = prev.findIndex((item) => item.id === threadId);

        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            preview,
            createdAt: new Date(),
          };
          return updated;
        } else {
          // Add new entry
          return [
            {
              id: threadId,
              preview,
              createdAt: new Date(),
            },
            ...prev,
          ];
        }
      });
    }
  }, [flatMessages, threadId]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("chatHistory");
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setChatHistory(parsed);
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
  }, []);

  // Save chat history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Function to load a specific chat from history
  const loadChat = (threadId) => {
    navigate(`/thread/${threadId}`);
  };

  // Create a new chat session
  const handleNewChat = useCallback(async () => {
    try {
      setSavedMessageIds(new Set()); // Clear saved message tracking
      setBackendMessages([]); // Clear backend messages

      const response = await clear();
      const newThreadId = response?.threadId || generateNewThreadId();
      navigate(`/thread/${newThreadId}`, { replace: true });
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  }, [clear, navigate]);

  // Helper function if clear() doesn't return threadId
  const generateNewThreadId = () => {
    return crypto.randomUUID();
  };

  // Handle sending messages
  const handleSendMessage = async () => {
    const content = inputValue.trim();
    if (content) {
      const userMessage = {
        id: crypto.randomUUID(), // Generate unique ID
        name: "user",
        type: "user_message",
        output: content,
        createdAt: new Date().toISOString(),
        files: [selectedFile],
      };
      // Send message to Chainlit - this will trigger the useEffect to save it
      await sendMessage(userMessage, []);
      setInputValue("");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const response = await uploadFile(file);
        console.log("File uploaded:", response);
        setSelectedFile(file);
        console.log("File uploaded successfully");
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }
  };

  // When you want to show the QR modal
  const handleShowQR = (id) => {
    setQrId(id);
    setQrOpen(true);
  };

  // Track copied states per message ID
  const [copiedMap, setCopiedMap] = useState({});

  const handleCopy = (messageId, content) => {
    navigator.clipboard.writeText(content);
    setCopiedMap((prev) => ({ ...prev, [messageId]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [messageId]: false }));
    }, 2000);
  };

  const renderMessage = (message) => {
    const isUser = message.name === "user";
    const formattedText = marked.parse(message.output || "");

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}
      >
        {!isUser && (
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-400 dark:bg-[#424242] flex-shrink-0 mr-2">
            <span className="text-white font-bold">A</span>
          </div>
        )}
        <div className="max-w-3xl px-4 py-2">
          <div
            className={`rounded-full break-words text-sm px-4 py-2 ${
              isUser
                ? "bg-gray-200 text-black dark:bg-[#424242] dark:text-white"
                : "bg-gray-100 text-black dark:bg-[#212121] dark:text-white"
            }`}
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
          {/* Action buttons */}
          {!isUser && message.output && (
            <div className="flex justify-start mt-1 gap-2">
              {/* Copy button */}
              <button
                onClick={() => handleCopy(message.id, message.output)}
                className="p-1 rounded bg-[#212121] hover:bg-[#333] text-white transition flex items-center justify-center"
                aria-label="Copy message"
                title="Copy message"
              >
                {copiedMap[message.id] ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </button>

              {/* QR Button */}
              <button
                onClick={() => handleShowQR(message.output)}
                className="p-1 rounded bg-[#212121] hover:bg-[#333] text-white transition flex items-center justify-center"
                aria-label="Show QR"
                title="Show QR"
              >
                <QrCode size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#212121] text-black dark:text-white transition-colors duration-300 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
        <Button
          onClick={handleNewChat}
          className="w-full mb-4 flex items-center justify-start gap-2"
          variant="outline"
        >
          <Plus size={16} />
          New Chat
        </Button>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">
            Chat History
          </h3>
          <div className="space-y-1">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`w-full text-left p-2 rounded-md text-sm truncate ${
                  threadId === chat.id
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {chat.preview}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(chat.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-end items-center p-4 dark:border-gray-700 gap-4">
          <LanguageSelector />
          <Button onClick={toggleTheme} variant="outline">
            {isDark ? "Light Theme" : "Dark Theme"}
          </Button>
          <UserDropdown onLogout={logout} />
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col dark:bg-[#212121]">
          <div className="flex-1 overflow-auto px-4 py-6 flex justify-center">
            <div className="space-y-4 w-full max-w-2xl">
              {flatMessages.map((message) => renderMessage(message))}
            </div>
          </div>

          {/* Sticky Input */}
          {/* Sticky Input */}
          <div className="sticky bottom-0 w-full dark:bg-[#212121] px-4 py-4 flex justify-center">
            <div className="relative w-full max-w-2xl flex flex-col items-start gap-2">
              {/* Show Selected File */}
              {selectedFile && (
                <div className="flex items-start justify-start left-80 bg-gray-100 dark:bg-[#333] text-sm text-black dark:text-white px-4 py-2 rounded-xl">
                  <span className="truncate max-w-[85%]">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-700 ml-2"
                    title="Remove file"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Main Input Row */}
              <div className="relative w-full flex items-center">
                {/* File Upload */}
                <label className="absolute left-3 z-10 cursor-pointer">
                  <Paperclip
                    size={18}
                    className="text-gray-500 dark:text-gray-300 -rotate-45"
                  />
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Record Icon */}
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="absolute left-10 z-10 text-red-600"
                    title="Stop Recording"
                  >
                    <AudioLines size={18} />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="absolute left-10 z-10 text-gray-500 dark:text-gray-300"
                    title="Start Recording"
                  >
                    <AudioLines size={18} />
                  </button>
                )}

                {/* Input Field */}
                <Input
                  autoFocus
                  className="bg-[#F2F2F2] dark:bg-[#424242] text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-300 rounded-3xl pl-20 pr-14 py-8 text-base border-none shadow-none focus:outline-none focus:ring-0 focus-visible:ring-0"
                  id="message-input"
                  placeholder="Type a message"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                />

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white text-black w-10 h-10 p-0 hover:bg-gray-100 shadow"
                  variant="ghost"
                >
                  <ArrowUp size={18} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      <QRModal qrId={qrId} isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
}
