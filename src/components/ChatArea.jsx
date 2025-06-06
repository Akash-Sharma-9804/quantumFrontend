import React from "react";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Send,
  Mic,
  Copy,
  MicOff,
  CircleUserRound,
  Paperclip,
  X,
  CheckCircle,
  CirclePause,
  AudioLines,
  ArrowDown,
  CircleArrowDown,
  Sparkles,
} from "lucide-react";
//
// import { FaMicrophone, FaStop, FaPlayCircle } from 'react-icons/fa';
// import { IoClose } from 'react-icons/io5';
import { motion } from "framer-motion";
import VoiceVisualizer from "./VoiceVisualizer";
import RecordRTC from "recordrtc";
import Navbar from "./Navbar";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { streamAudio } from "../utils/streamAudio";
// import { useSelector, useDispatch } from "react-redux";
import ChatbotMarkdown from "./ChatbotMarkdown";
import {
  fetchConversationHistory,
  sendMessage,
  uploadFiles,
  fetchConversations,
  uploadFinalAudio,
  sendGuestMessage,
} from "../api_Routes/api";
import {
  setMessages,
  addMessage,
  setActiveConversation,
  updateMessage,
  renameConversationRedux,
  setConversations,
  addConversation,
  removeMessage,
} from "../store/chatSlice2";
import { toast } from "react-toastify";
import MessageFiles from "./MessageFiles";
import { v4 as uuidv4 } from "uuid";
// import AudioVisualizer from 'react-audio-visualize';
import RadialVisualizer from "./RadialVisualizer";
import { FaMicrophone, FaStop, FaPause, FaPlay } from "react-icons/fa";
const ChatArea = ({ isGuest }) => {
  const [loading, setLoading] = useState(false);
  const [botTyping, setBotTyping] = useState("");
  const [greeting, setGreeting] = useState("");
  const chatEndRef = useRef(null);
  const [copied, setCopied] = useState(false);
  // greeting text
  const [showGreeting, setShowGreeting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const navigate = useNavigate();
  const [lastBotMessage, setLastBotMessage] = useState(null);
  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [scrollTooltip, setscrollTooltip] = useState(false);
  const [voiceTooltip, setvoiceTooltip] = useState(false);

  const fileInputRef = useRef(null);
  const buttonRef = useRef(null);
  const textareaRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const dispatch = useDispatch();
  const { activeConversation, messages } = useSelector((state) => state.chat);
  const { user, token } = useSelector((state) => state.auth);
  const [inputMessage, setInputMessage] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const conversations = useSelector((state) => state.chat.conversations);

  // guest mode

  const guestConversationId = useSelector(
    (state) => state.chat.guestConversationId
  );

  const socketRef = useRef(null);
  const recorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptBuffer, setTranscriptBuffer] = useState("");

  const [isUploading, setIsUploading] = useState(false); // For final transcription

  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);

  // scroll button prop
  const chatContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // const API_BASE_URL = "https://quantumhash-backend-1.onrender.com/api"; // Replace with your backend URL

  const WSS_BASE_URL = import.meta.env.VITE_WSS_API_BASE_URL;

  // copy button
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleLoginPrompt = () => setShowLoginPrompt(true);

  // 1st useeffect
  useEffect(() => {
    const storedConversationId = localStorage.getItem("conversation_id");

    if (storedConversationId) {
      dispatch(setActiveConversation(parseInt(storedConversationId))); // Make sure it's a number
    }
  }, [dispatch]);

  // 2nd useeffect
  useEffect(() => {
    if (!activeConversation || !token) return;

    fetchConversationHistory(activeConversation, token)
      .then((data) => {
        // console.log("Fetched history:", data.history);
        const history = Array.isArray(data.history)
          ? data.history
          : [data.history];

        dispatch(
          setMessages({ conversationId: activeConversation, messages: history })
        );

        // ✅ Auto-scroll to bottom after fetching messages
        setTimeout(() => {
          const chatContainer = document.getElementById("chat-container");
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
      })
      .catch((err) => console.error("❌ Error fetching chat history:", err));
  }, [activeConversation, token, dispatch]);

  // 3rd useeffect

  useEffect(() => {
    if (activeConversation) {
      localStorage.setItem("conversation_id", activeConversation);
    }
  }, [activeConversation]);

  // const conversationMessages = messages[activeConversation] || [];
  const conversationMessages = isGuest
    ? messages["guest"] || []
    : messages[activeConversation] || [];

  // greeting text function starts

  // const generateGreeting = () => {
  //   const greetingText = " Hacking the Quantum, no limits!....";
  //   let index = 0;
  //   let typedText = "";

  //   const interval = setInterval(() => {
  //     if (index < greetingText.length) {
  //       typedText += greetingText[index];
  //       setGreeting(typedText);
  //       index++;
  //     } else {
  //       clearInterval(interval);
  //       setGreeting(greetingText); // Keep the full greeting
  //     }
  //   }, 60);
  // };
  // test
  // const generateGreeting = () => {
  //   const greetingOptions = [
  //     "Explore Like Never Before. The Quantum Way!!!",
  //     "Say Hello to the Quantum Future",
  //     "I'm QuantumAI, bringing intelligence to the conversation.",
  //   ];

  //   const selectedGreeting =
  //     greetingOptions[Math.floor(Math.random() * greetingOptions.length)];

  //   let index = 0;
  //   let typedText = "";

  //   const interval = setInterval(() => {
  //     if (index < selectedGreeting.length) {
  //       typedText += selectedGreeting[index];
  //       setGreeting(typedText + '<span class="blinker">|</span>');
  //       index++;
  //     } else {
  //       clearInterval(interval);
  //       setGreeting(selectedGreeting + '<span class="blinker">|</span>');
  //     }
  //   }, 60);
  // };
  const generateGreeting = () => {
    const greetingOptions = [
      "Explore Like Never Before. The Quantum Way!!!",
      "Say Hello to the Quantum Future",
      "bringing intelligence to the conversation.",
    ];

    const selectedGreeting =
      greetingOptions[Math.floor(Math.random() * greetingOptions.length)];

    let index = 0;
    let typedText = "";

    const typingInterval = setInterval(() => {
      if (index < selectedGreeting.length) {
        typedText += selectedGreeting[index];
        setGreeting(typedText);
        index++;
      } else {
        clearInterval(typingInterval);

        // Start blinking cursor after typing finishes
        setInterval(() => {
          setShowCursor((prev) => !prev);
        }, 500);
      }
    }, 60);
  };

  // const getTimeBasedGreeting = () => {
  //   const hour = new Date().getHours();
  //   if (hour < 12) return "Good morning";
  //   if (hour < 18) return "Good afternoon";
  //   return "Night owl";
  // };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    if (hour >= 21 && hour < 24) return "Night owl";
    if (hour >= 0 && hour < 3) return "Midnight coder";
    return "Early bird"; // 3-5 AM
  };

  // greeting text function ends

  // 4th useeffect
  useEffect(() => {
    const currentMessages = messages[activeConversation];

    // Don't do anything until data is fetched
    if (currentMessages === undefined) return;

    // If no messages in conversation, show greeting
    if (currentMessages.length === 0) {
      setShowGreeting(true);

      // Only run typing animation once
      if (!greeting) {
        generateGreeting();
      }
    } else {
      // Hide greeting when there's at least one message
      if (showGreeting) setShowGreeting(false);
      if (greeting) setGreeting(""); // Reset greeting so it's fresh next time
    }
  }, [activeConversation, messages]);

  // greeting text function ends

  // 5th useeffect
  // useEffect(() => {
  //   chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, [messages, botTyping]);

  // 5th useEffect - Scroll to bottom when messages update or bot is typing
  // useEffect(() => {
  //   const messagesForConversation = messages[activeConversation];

  //   if (!messagesForConversation || messagesForConversation.length === 0)
  //     return;

  //   const scrollToBottom = () => {
  //     // Wait for DOM to update first
  //     setTimeout(() => {
  //       if (chatEndRef.current) {
  //         chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  //         console.log("Scrolled to bottom after switching conversation.");
  //       }
  //     }, 100); // 100ms gives React time to render
  //   };

  //   scrollToBottom();
  // }, [activeConversation, messages[activeConversation]?.length]);

  useEffect(() => {
    // Get current conversation messages based on mode
    const currentMessages = conversationMessages; // This already handles guest vs user mode

    if (!currentMessages || currentMessages.length === 0) return;

    const scrollToBottom = () => {
      // Wait for DOM to update first
      setTimeout(() => {
        if (chatEndRef.current) {
          chatEndRef.current.scrollIntoView({ behavior: "smooth" });
          // console.log("Scrolled to bottom after message update.");
        }
      }, 100);
    };

    scrollToBottom();
  }, [conversationMessages.length, botTyping]);

  // 6th useEffect
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom =
        container.scrollHeight - container.scrollTop <=
        container.clientHeight + 50;
      setShowScrollButton(!isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // initialize

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activeConversation]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const stored = localStorage.getItem("last_ai_message");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.suggestions?.length > 0) {
          setLastBotMessage(parsed);
        }
      } catch (err) {
        console.error("Failed to parse stored AI message:", err);
      }
    }
  }, []);

  // working handlesend message function starts

  const handleSendMessage = async (customText) => {
    //  console.log("💥 handleSendMessage fired", { customText });
    const messageText =
      typeof customText === "string"
        ? customText.trim()
        : inputMessage.trim?.() || "";

    if (!messageText && files.length === 0) return;

    textareaRef.current.style.height = "44px";

    // const plainText = messageText.trim();
    const plainText =
      typeof customText === "string" && customText.trim()
        ? customText.trim()
        : inputMessage.trim();

    if (!plainText && files.length === 0) return;

    // ✅ Guest Mode
    if (isGuest) {
      const userMessage = {
        id: Date.now(),
        conversationId: guestConversationId || "guest",
        message: plainText,
        sender: "user",
        files: [],
      };

      setInputMessage("");
      setFiles([]);
      setBotTyping(true);
      setLoading(true); // 🔐 Disable send button here
      dispatch(
        addMessage({
          conversationId: guestConversationId || "guest",
          message: userMessage,
        })
      );
      console.log("📤 Sending guest message:", plainText);
      try {
        const res = await sendGuestMessage(plainText);

        const aiResponse = res.response || "🧠 No AI response received.";
        const suggestions = res.suggestions || [];

        const botMessage = {
          id: Date.now() + 1,
          conversationId: guestConversationId || "guest",
          message: aiResponse,
          sender: "bot",
          response: aiResponse,
          isNewMessage: true,
          suggestions, // ✅ Include suggestions if needed
        };

        dispatch(
          addMessage({
            conversationId: guestConversationId || "guest",
            message: botMessage,
          })
        );

        setBotTyping(false);

        const prevGuestChat = JSON.parse(
          localStorage.getItem("guest_chat") || "[]"
        );
        localStorage.setItem(
          "guest_chat",
          JSON.stringify([...prevGuestChat, userMessage, botMessage])
        );

        return;
      } catch (error) {
        console.error("❌ Guest mode error:", error);
        setBotTyping(false);
        toast.error("❌ Failed to get guest response.");
      } finally {
        setLoading(false); // 🔓 Re-enable send button here
      }
      return;
    }

    // ✅ Logged-in user flow

    const token = localStorage.getItem("token");
    const user_id = user?.user_id || localStorage.getItem("user_id");
    const conv_id =
      activeConversation || localStorage.getItem("conversation_id");

    if (!token) {
      console.error("🚨 Missing token.");
      return;
    }

    if (!user_id) {
      console.error("🚨 Missing user_id.");
      return;
    }

    // ✅ 1. Prepare user message text (without appending file names - we'll show them separately)
    // const plainText = inputMessage.trim();

    // Create user message without embedding file names in the text
    const userMessage = {
      id: Date.now(),
      message: plainText,
      sender: "user",
      files: files.map((f) => ({ name: f.name, type: f.type })),
    };

    dispatch(addMessage({ conversationId: conv_id, message: userMessage }));
    setLoading(true); // 🔐 Disable send button here
    setInputMessage("");
    setBotTyping(true);
    setFiles([]);
    try {
      // ✅ 2. Prepare FormData for upload
      const formData = new FormData();
      if (plainText) formData.append("message", plainText);
      formData.append("user_id", user_id);
      if (conv_id) formData.append("conversation_id", conv_id);
      files.forEach((file) => {
        formData.append("files", file);
      });

      // ✅ 3. Upload files
      const uploadResponse = await uploadFiles(formData, token, (event) => {
        const percent = Math.round((event.loaded * 100) / event.total);
        const progressMap = {};
        files.forEach((file) => {
          progressMap[file.name] = percent;
        });
        setUploadProgress(progressMap);
      });

      const finalConversationId =
        uploadResponse?.data?.conversation_id ||
        uploadResponse?.conversation_id ||
        conv_id;

      if (!activeConversation && finalConversationId) {
        dispatch(setActiveConversation(finalConversationId));
      }

      // ✅ 4. Extract metadata to send to chatbot
      const uploaded_file_metadata = uploadResponse?.data?.files || [];

      // Update the user message in redux with the proper file metadata
      if (uploaded_file_metadata.length > 0) {
        // Update the message with file names from the backend
        dispatch(
          updateMessage({
            conversationId: finalConversationId,
            id: userMessage.id,
            files: uploaded_file_metadata,
          })
        );
      }

      // ✅ 5. Send message to chatbot if there's a user message
      if (plainText || files.length > 0) {
        const chatRes = await sendMessage(
          finalConversationId,
          plainText,
          user_id,
          token,
          uploadResponse?.data?.extracted_summary_raw,
          uploaded_file_metadata
        );

        const aiResponse = chatRes?.response || "🧠 No AI response received.";
        const responseFiles = chatRes?.files || [];
        const suggestions = chatRes?.suggestions || []; // 👈 new

        const botMessage = {
          id: Date.now() + 1,
          message: aiResponse,
          sender: "bot",
          response: aiResponse,
          files: responseFiles,
          suggestions: suggestions, // 👈 attach suggestions
          isNewMessage: true,
        };

        dispatch(
          addMessage({
            conversationId: finalConversationId,
            message: botMessage,
          })
        );

        // ✅ stop typing immediately after bot response is added
        setBotTyping(false);

        // ✅ 6. Rename is handled by the backend — now refresh conversations list in Sidebar
        const updatedConversations = await fetchConversations(token);
        dispatch(setConversations(updatedConversations?.conversations || []));

        // ✅ 7. Fetch updated conversation list after rename
        const currentConv = conversations.find(
          (c) => c.id === finalConversationId
        );
        if (currentConv?.name === "New Conversation") {
          const updatedData = await fetchConversations(token);
          if (updatedData?.conversations) {
            dispatch(setConversations(updatedData.conversations));
            const currentId = localStorage.getItem("conversation_id");
            if (currentId) {
              dispatch(setActiveConversation(Number(currentId)));
            }
          }
        }
      } else if (files.length > 0) {
        // ✅ 8. No user message, only files
        toast.info(
          uploadResponse?.data?.extracted_summary ||
            "🧠 Files received, but no text was extractable.",
          { position: "bottom-right" }
        );
        setBotTyping(false); // ✅ stop here too
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      dispatch(
        addMessage({
          conversationId: conv_id,
          message: {
            id: Date.now() + 1,
            message: "❌ Failed to get a response.",
            sender: "bot",
            response: "❌ Failed to get a response.",
          },
        })
      );
      toast.error("❌ Message or file upload failed.");
      setBotTyping(false); // ✅ also stop here in error
      setLoading(false); // 🔓 Re-enable send button here
    } finally {
      // ✅ 9. Cleanup
      setUploadProgress({});
      setLoading(false); // 🔓 Re-enable send button here
    }
  };

  // handle suggestion click
  // const handleSuggestionClick = (text) => {
  //   setInputMessage(text);
  //   setTimeout(() => {
  //     handleSendMessage();
  //   }, 50);
  // };
  const handleSuggestionClick = (text) => {
    // Remove leading dot if present
    const cleanText = text.replace(/^\.+\s*/, "");

    setInputMessage(cleanText);
    setTimeout(() => {
      handleSendMessage(cleanText); // Pass the clean text directly
    }, 50);
  };
  // working handlesend message ends

  // ✅ Remove selected file
  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  };

  // ✅ Handle file upload selection
  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  // text area resize starts

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputMessage(value);

    const el = textareaRef.current;
    if (!el) return;

    // Reset height to minimum before recalculating
    el.style.height = "auto"; // ← crucial to allow shrinking
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [inputMessage, transcriptBuffer]);

  // text area resize ends

  // textarea animation
  const canvasRef = useRef(null);

  // voice functions dictation part starts

  // ✅ Call this to start recording
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recorderRef.current = RecordRTC(stream, {
      type: "audio",
      mimeType: "audio/webm;codecs=opus",
      recorderType: RecordRTC.StereoAudioRecorder,
      timeSlice: 1000,
      ondataavailable: (blob) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(blob);
        }
      },
    });

    const token = localStorage.getItem("token");
    console.log("🎙️ Token:", token);
    socketRef.current = new WebSocket(`${WSS_BASE_URL}?token=${token}`);

    socketRef.current.onopen = () => {
      console.log("🎙️ Voice WebSocket connected");
      recorderRef.current.startRecording();
      setIsRecording(true);
    };

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "transcript") {
        const transcript = data.transcript;

        if (transcript) {
          console.log("📝 Live transcription:", transcript);

          if (voiceMode) {
            // Optional: live display or buffer — or just ignore for pure realtime AI
            setTranscriptBuffer(transcript);
          } else {
            // Dictation mode (untouched)
            setTranscriptBuffer((prev) => prev + " " + transcript + " ");
          }
        }
      }
    };

    socketRef.current.onclose = () => {
      console.log("🔌 WebSocket closed");
    };

    socketRef.current.onerror = (err) => {
      console.error("❌ WebSocket Error:", err);
    };
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      setIsUploading(true);
      setIsRecording(false);
      recorderRef.current.stopRecording(async () => {
        const blob = recorderRef.current.getBlob();
        const token = localStorage.getItem("token");

        try {
          const finalTranscript = await uploadFinalAudio(blob, token);

          const trimmedTranscript = finalTranscript.trim();

          if (trimmedTranscript) {
            if (voiceMode) {
              startRealtimeAI({
                conversationId: activeConversation,
                userMessage: trimmedTranscript,
              });
            } else {
              setInputMessage((prev) => prev + " " + trimmedTranscript);
            }
          } else {
            setInputMessage(""); // Ensure placeholder falls back to "Ask me anything..."
          }
        } catch (err) {
          console.error("⚠️ Upload or transcription error", err);
        } finally {
          setIsUploading(false);
          setTranscriptBuffer("");

          setVoiceMode(false); // reset
        }
      });
    }

    setTimeout(() => {
      if (socketRef.current) socketRef.current.close();
    }, 1000);
  };
  // voice functions dictation part ends

  // test2 working 14-05-25
  const [isLiveRecording, setIsliveRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const voiceWsRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isSilenceDetectedRef = useRef(false);
  const silenceEndConfirmTimerRef = useRef(null);
  const hasAudioBeenSentRef = useRef(false);

  const startAiVoice = async () => {
    try {
      // 🧠 Noise suppression enabled
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      const token = localStorage.getItem("token");
      const ws = new WebSocket(
        // `ws://localhost:5001/api/voice/ws?token=${token}`
        // `wss://quantumhash-backend-1.onrender.com/api/voice/ws?token=${token}`
        `${WSS_BASE_URL}?token=${token}`
      );
      voiceWsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected");

        const storedConversationId = localStorage.getItem("conversation_id");
        if (storedConversationId) {
          ws.send(
            JSON.stringify({
              type: "control",
              conversation_id: storedConversationId,
            })
          );
        }
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        const conversationId =
          data.conversation_id || localStorage.getItem("conversation_id");

        if (!conversationId) {
          console.error("❌ Missing conversation_id in WebSocket data.");
          return;
        }

        // Ensure active conversation is set
        if (!activeConversation) {
          localStorage.setItem("conversation_id", conversationId);
          dispatch(setActiveConversation(Number(conversationId)));
        }

        // 🧑 User Message
        if (data.type === "userMessage") {
          console.log("🧑 You:", data.message);
          dispatch(
            addMessage({
              conversationId,
              message: {
                id: Date.now(),
                message: data.message,
                sender: "user",
                timestamp: new Date().toISOString(),
                files: [],
              },
            })
          );
        }

        // 🤖 AI Message with TTS playback
        else if (data.type === "aiMessage") {
          console.log("🤖 AI:", data.message);
          setIsTTSPlaying(true);

          // Stop recording while playing TTS
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = () => {
              console.log("🎤 Recording paused for TTS playback.");
            };
            mediaRecorderRef.current.stop();
          }

          try {
            await streamAudio(data.message); // ⏯️ Play audio first
          } catch (err) {
            console.error("❌ Error during TTS playback:", err);
          }

          // Now display AI response
          dispatch(
            addMessage({
              conversationId,
              message: {
                id: Date.now() + 1,
                message: data.message,
                sender: "bot",
                response: data.message,
                timestamp: new Date().toISOString(),
                files: data.files || [],
              },
            })
          );

          setIsTTSPlaying(false);
          setIsResponding(false);
          setIsProcessing(false);
          continueVoiceLoop();

          if (data.refreshSidebar) {
            const token = localStorage.getItem("token");
            fetchConversations(token).then((updated) =>
              dispatch(setConversations(updated.conversations))
            );
          }
        }

        // ⚠️ Short Transcription
        else if (data.type === "transcriptionTooShort") {
          console.warn("⚠️ Transcription too short");
          setIsResponding(false);
          setIsProcessing(false);
          continueVoiceLoop();
        }

        // ⏳ AI is processing
        else if (data.type === "processing") {
          setIsResponding(true);
        }

        // ❌ Error handling
        else if (data.type === "error") {
          console.error("❌ Error:", data.error);
          alert(data.error);
          setIsResponding(false);
          setIsProcessing(false);
          continueVoiceLoop();
        }
      };

      startRecorder(stream);
      detectSilence(stream);
    } catch (err) {
      console.error("🎤 Voice error:", err);
    }
  };

  const startRecorder = (stream) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm",
      audioBitsPerSecond: 64000,
    });

    hasAudioBeenSentRef.current = false;

    mediaRecorder.ondataavailable = (event) => {
      if (
        event.data.size > 0 &&
        !isSilenceDetectedRef.current &&
        voiceWsRef.current?.readyState === 1
      ) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result.split(",")[1];
          if (base64Audio.length > 50) {
            voiceWsRef.current.send(
              JSON.stringify({
                type: "transcribe", // 🚀 Match backend: send for transcription
                audio_data: base64Audio,
              })
            );
            hasAudioBeenSentRef.current = true;
            setIsProcessing(true);
          }
        };
        reader.readAsDataURL(event.data);
      }
    };

    mediaRecorder.onstart = () => {
      console.log("🎙️ Recording started");
      setIsliveRecording(true);
    };

    mediaRecorder.onstop = () => {
      console.log("⏹️ Recording stopped");
      setIsliveRecording(false);

      if (!hasAudioBeenSentRef.current) {
        console.warn("⚠️ No audio sent. Retrying...");
        continueVoiceLoop();
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(3000); // 🔄 send audio every 3 seconds
  };

  const continueVoiceLoop = () => {
    if (!audioStreamRef.current) return;
    startRecorder(audioStreamRef.current); // 🔁 restart recording
  };

  const detectSilence = (stream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const data = new Uint8Array(analyser.frequencyBinCount);

    analyser.fftSize = 2048;
    microphone.connect(analyser);

    const checkSilence = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;

      if (volume < 10) {
        if (!isSilenceDetectedRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            isSilenceDetectedRef.current = true;
            console.log("🔇 Silence detected, waiting for confirmation...");

            silenceEndConfirmTimerRef.current = setTimeout(() => {
              console.log("🛑 Confirmed silence — stopping recorder");
              mediaRecorderRef.current?.stop();
            }, 2000);
          }, 3000);
        }
      } else {
        if (isSilenceDetectedRef.current) {
          console.log("🎤 User resumed speaking — cancelling silence stop");
        }
        isSilenceDetectedRef.current = false;
        clearTimeout(silenceTimerRef.current);
        clearTimeout(silenceEndConfirmTimerRef.current);
      }

      requestAnimationFrame(checkSilence);
    };

    checkSilence();
  };

  const stopAiVoice = () => {
    mediaRecorderRef.current?.stop();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());

    if (voiceWsRef.current?.readyState === 1) {
      voiceWsRef.current.send(
        JSON.stringify({ type: "control", action: "stop" })
      );
      voiceWsRef.current.close();
    }

    setIsliveRecording(false);
    setIsProcessing(false);
    setIsResponding(false);
  };

  // try
  // State and Refs
  // const [isLiveRecording, setIsliveRecording] = useState(false);
  // const [isProcessing, setIsProcessing] = useState(false);
  // const [isResponding, setIsResponding] = useState(false);
  // const [isTTSPlaying, setIsTTSPlaying] = useState(false);

  // const audioContextRef = useRef(null);
  // const audioStreamRef = useRef(null);
  // const processorRef = useRef(null);
  // const sourceRef = useRef(null);
  // const wsRef = useRef(null);
  // const silenceTimeoutRef = useRef(null);
  // const speakingTimeoutRef = useRef(null);

  // const VOLUME_THRESHOLD = 0.01;
  // const SILENCE_DELAY = 2000;
  // const CHUNK_DURATION_MS = 3000;

  // // Start AI Voice
  // const startAiVoice = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
  //     });

  //     const audioContext = new AudioContext();
  //     const source = audioContext.createMediaStreamSource(stream);
  //     const processor = audioContext.createScriptProcessor(2048, 1, 1);

  //     audioContextRef.current = audioContext;
  //     sourceRef.current = source;
  //     processorRef.current = processor;
  //     audioStreamRef.current = stream; // ✅ Fixed

  //     const token = localStorage.getItem("token");
  //     const ws = new WebSocket(`
  //      ws://localhost:5001/api/voice/ws?token=${token}`
  //         // `wss://quantumhash-backend-1.onrender.com/api/voice/ws?token=${token}`
  //         // `${WSS_BASE_URL}?token=${token}`
  //       );
  //     wsRef.current = ws;

  //     ws.onopen = () => {
  //       console.log("✅ WebSocket connected");
  //       const conversationId = localStorage.getItem("conversation_id");
  //       if (conversationId) {
  //         ws.send(JSON.stringify({ type: "control", conversation_id: conversationId }));
  //       }
  //     };

  //     ws.onclose = () => {
  //       console.log("🔌 WebSocket disconnected");
  //       wsRef.current = null;
  //     };

  //     ws.onerror = (err) => {
  //       console.error("❌ WebSocket error:", err);
  //     };

  //     ws.onmessage = async (event) => {
  //       const data = JSON.parse(event.data);
  //       const conversationId = data.conversation_id || localStorage.getItem("conversation_id");
  //       if (!conversationId) return;

  //       if (!activeConversation) {
  //         localStorage.setItem("conversation_id", conversationId);
  //         dispatch(setActiveConversation(Number(conversationId)));
  //       }

  //       if (data.type === "userMessage") {
  //         dispatch(addMessage({
  //           conversationId,
  //           message: {
  //             id: Date.now(),
  //             message: data.message,
  //             sender: "user",
  //             timestamp: new Date().toISOString(),
  //             files: [],
  //           },
  //         }));
  //       }

  //       else if (data.type === "aiMessage") {
  //         console.log("🤖 AI:", data.message);
  //         await stopStream(); // Stop mic for TTS playback
  //         setIsTTSPlaying(true);

  //         try {
  //           await streamAudio(data.message);
  //         } catch (err) {
  //           console.error("❌ TTS playback failed", err);
  //         }

  //         dispatch(addMessage({
  //           conversationId,
  //           message: {
  //             id: Date.now() + 1,
  //             message: data.message,
  //             sender: "bot",
  //             response: data.message,
  //             timestamp: new Date().toISOString(),
  //             files: data.files || [],
  //           },
  //         }));

  //         setIsTTSPlaying(false);
  //         setIsProcessing(false);
  //         setIsResponding(false);
  //         restartVoiceStream(); // Resume mic
  //       }

  //       else if (data.type === "processing") {
  //         setIsProcessing(true);
  //         setIsResponding(true);
  //       }

  //       else if (data.type === "transcriptionTooShort") {
  //         setIsProcessing(false);
  //         setIsResponding(false);
  //         restartVoiceStream();
  //       }

  //       else if (data.type === "error") {
  //         console.error("❌ WebSocket error:", data.error);
  //         alert(data.error);
  //         setIsProcessing(false);
  //         setIsResponding(false);
  //         restartVoiceStream();
  //       }
  //     };

  //     // Audio processor setup
  //     let audioBuffer = [];
  //     processor.onaudioprocess = (event) => {
  //       if (isTTSPlaying || isProcessing || isResponding) return;

  //       const input = event.inputBuffer.getChannelData(0);
  //       const volume = input.reduce((sum, val) => sum + val ** 2, 0) / input.length;

  //       if (volume > VOLUME_THRESHOLD) {
  //         clearTimeout(silenceTimeoutRef.current);
  //         clearTimeout(speakingTimeoutRef.current);

  //         speakingTimeoutRef.current = setTimeout(() => {
  //           console.log("📤 Sending speech chunk");
  //           sendAudio(audioBuffer);
  //           audioBuffer = [];
  //         }, CHUNK_DURATION_MS);
  //       } else {
  //         clearTimeout(silenceTimeoutRef.current);
  //         silenceTimeoutRef.current = setTimeout(() => {
  //           console.log("🛑 Silence detected, stopping stream...");
  //           stopStream();
  //         }, SILENCE_DELAY);
  //       }

  //       const pcm = new Float32Array(input);
  //       audioBuffer.push(...pcm);
  //     };

  //     source.connect(processor);
  //     processor.connect(audioContext.destination);
  //     setIsliveRecording(true);
  //   } catch (err) {
  //     console.error("🎤 Error starting voice:", err);
  //   }
  // };

  // // Convert Float32 PCM to Int16 and send to WebSocket
  // const sendAudio = (float32Pcm) => {
  //   if (wsRef.current?.readyState !== 1) return;

  //   const int16Array = floatTo16BitPCM(float32Pcm);
  //   const blob = new Blob([int16Array], { type: "audio/webm" });
  //   const reader = new FileReader();

  //   reader.onloadend = () => {
  //     const base64 = reader.result.split(",")[1];
  //     if (base64.length > 50) {
  //       wsRef.current.send(JSON.stringify({
  //         type: "transcribe",
  //         audio_data: base64,
  //       }));
  //     }
  //   };

  //   reader.readAsDataURL(blob);
  // };

  // const floatTo16BitPCM = (float32Array) => {
  //   const int16Array = new Int16Array(float32Array.length);
  //   for (let i = 0; i < float32Array.length; i++) {
  //     int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7fff;
  //   }
  //   return int16Array;
  // };

  // // Stop voice stream safely
  // const stopStream = async () => {
  //   try {
  //     if (processorRef.current) {
  //       processorRef.current.disconnect();
  //       processorRef.current = null;
  //     }

  //     if (sourceRef.current) {
  //       sourceRef.current.disconnect();
  //       sourceRef.current = null;
  //     }

  //     if (audioContextRef.current && audioContextRef.current.state !== "closed") {
  //       await audioContextRef.current.close();
  //       audioContextRef.current = null;
  //     }

  //     if (audioStreamRef.current) {
  //       audioStreamRef.current.getTracks().forEach(track => track.stop());
  //       audioStreamRef.current = null;
  //     }

  //     clearTimeout(silenceTimeoutRef.current);
  //     clearTimeout(speakingTimeoutRef.current);
  //     setIsliveRecording(false);
  //   } catch (err) {
  //     console.warn("⚠️ Error during stopStream:", err);
  //   }
  // };

  // const restartVoiceStream = async () => {
  //   await stopStream();
  //   setTimeout(startAiVoice, 300);
  // };

  // const stopAiVoice = async () => {
  //   await stopStream();
  //   if (wsRef.current?.readyState === 1) {
  //     wsRef.current.send(JSON.stringify({ type: "control", action: "stop" }));
  //     wsRef.current.close();
  //   }
  //   setIsResponding(false);
  //   setIsProcessing(false);
  //   setIsTTSPlaying(false);
  // };

  return (
    <div className="flex flex-col w-full h-screen overflow-y-auto bg-white dark:bg-[#121212] transition-colors duration-300">
      <Navbar isGuest={isGuest} />
      {/* Chat Area starts */}
      <div
        ref={chatContainerRef}
        className=" relative flex-1 h-[calc(100vh-160px)] w-full scrollbar-hover  md:p-4  mt-20 md:mt-0 space-y-6 overflow-auto mx-auto bg-white  dark:bg-[#121212] transition-colors duration-300">
        <div className="  md:w-[70%] w-full  mx-auto">
          {/* chats section starts */}
          {/* final  */}

          {conversationMessages.length > 0 ? (
            <>
              {conversationMessages
                .filter((msg) => msg && (msg.message || msg.response))
                .map((msg, index) => (
                  <div key={msg.id} className="p-2 my-2 rounded">
                    {/* display file  */}

                    {msg.sender === "user" && msg.files?.length > 0 && (
                      <MessageFiles files={msg.files} />
                    )}

                    {/* USER MESSAGE */}
                    {(msg.sender === "user" ||
                      (!msg.sender && msg.message)) && (
                      // <motion.div
                      //   initial={{ opacity: 0, y: 10 }}
                      //   animate={{ opacity: 1, y: 0 }}
                      //   className="relative p-3 rounded-lg mt-2 break-words text-sm shadow-md bg-[#f4f4f5] dark:bg-indigo-500 text-[#1e293b] dark:text-white max-w-2xl w-fit self-end ml-auto">
                      //   <div className="flex items-start gap-2">
                      //     <div className="p-1 rounded-full">
                      //       {/* <CircleUserRound
                      //         size={20}
                      //         color="black"
                      //         strokeWidth={2.25}
                      //       /> */}
                      //       <img src={user?.user_img} className="h-8 w-8 rounded-full object-cover" alt="" />
                      //     </div>
                      //     <div className="flex flex-col w-full mr-7 overflow-auto text-justify text-xs md:text-base space-y-2 font-centurygothic">
                      //       <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      //         {msg.message}
                      //       </ReactMarkdown>
                      //       {/* <ChatbotMarkdown content={msg.message} /> */}
                      //     </div>
                      //   </div>
                      // </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative p-3 rounded-lg mt-2 break-words text-sm shadow-md hover:dark:bg-gradient-to-r hover:dark:from-[#0076FF] hover:dark:to-[#0000b591]  dark:bg-gradient-to-r dark:from-[#0000B5] dark:to-[#0076FF] text-[#1e293b] dark:text-white max-w-2xl w-fit self-end ml-auto">
                        <div className="flex items-start gap-2">
                          <div className="p-1 rounded-full flex-shrink-0">
                            {/* Fallback to default circle icon if user_img is not available */}
                            {user?.user_img ? (
                              <img
                                src={user?.user_img}
                                className="h-5 w-5 md:h-7 md:w-7 rounded-full object-cover border-2 border-gray-300"
                                alt="User Avatar"
                                onError={(e) => {
                                  e.target.onerror = null; // Prevent infinite loop if fallback image also fails
                                  e.target.src = "./user.png"; // Trigger fallback icon display
                                }}
                              />
                            ) : (
                              <div className="h-7 w-7 md:h-8 md:w-8 rounded-full flex items-center justify-center bg-gray-200">
                                {/* Default User Icon */}
                                <CircleUserRound
                                  size={20} // Set the icon size to fit inside the circle
                                  color="black"
                                  strokeWidth={2.25}
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col w-full mr-7  mt-1  overflow-auto text-justify text-xs md:text-base space-y-2 font-centurygothic">
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                              {msg.message}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* BOT RESPONSE */}
                    {/* {msg.response && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="relative p-3 rounded-lg break-words text-sm shadow-md backdrop-blur-2xl bg-white/10 border border-white/20 text-gray-800 dark:text-white max-w-full self-start mr-auto mt-3">
                          <div className="flex items-start gap-2">
                            <div className="p-1 rounded-full">
                              <img
                                src="./logo.png"
                                className="h-5 w-5"
                                alt="Bot Logo"
                              />
                            </div>
                            <div className="flex flex-col w-full mr-7 overflow-auto text-xs md:text-base select-text text-justify space-y-2 font-centurygothic">
                              <ChatbotMarkdown content={msg.response} />
                              <ChatbotMarkdown
                                content={msg.response}
                                messageId={msg.id}
                                isNewMessage={msg.isNewMessage || false}
                              />
                            </div>
                          </div>
                          copy button 
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(msg.response)
                            }
                            className="absolute top-2 right-2 z-10 p-1 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition">
                            <Copy size={14} />
                          </button>
                        </motion.div>
                      )} */}
                    {msg.response && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative p-3 rounded-lg break-words dark:bg-[#282828]  text-sm shadow-md backdrop-blur-2xl bg-white/10 border border-white/20 text-gray-800 dark:text-white max-w-full self-start mr-auto mt-3 select-text">
                        <div className="flex items-start gap-2">
                          <div className="p-1 rounded-full select-none">
                            <img
                              src="./logo.png"
                              className="h-5 w-5"
                              alt="Bot Logo"
                            />
                          </div>
                          <div className="flex flex-col w-full mr-7 text-xs md:text-lg select-text space-y-2 font-centurygothic">
                            {/* <ChatbotMarkdown
                              content={msg.response}
                              messageId={msg.id}
                              isNewMessage={msg.isNewMessage || false}
                            /> */}
                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                              {msg.response}
                            </ReactMarkdown>
                            {/* <ChatbotMarkdown content={msg.response}  /> */}
                          </div>
                        </div>
                        {/* copy button  */}
                        <button
                          onClick={() => handleCopyCode(msg.response)}
                          className="absolute top-2 right-2 z-10 p-1 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition select-none">
                          {copied ? (
                            <span className="flex items-center">
                              <CheckCircle size={16} color="#4cd327" />
                              <span className="ml-2">Copied!</span>
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Copy size={16} />
                              {/* <span className="ml-2">Copy</span> */}
                            </span>
                          )}
                        </button>
                      </motion.div>
                    )}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-2  p-4  font-centurygothic ">
                        <p className="text-xs md:text-base text-gray-800 text-bold dark:text-gray-300 mb-2 font-medium">
                          Would you like to know more?
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                const cleanSuggestion = suggestion.replace(
                                  /^\.+\s*/,
                                  ""
                                ); // Remove leading dots
                                setInputMessage(cleanSuggestion);
                                handleSendMessage(cleanSuggestion);
                              }}
                              className="px-4 py-1.5  flex justify-between text-left w-full font-bold rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 text-gray-900 dark:text-white text-xs md:text-sm   shadow-sm hover:text-blue-500 transition-all duration-200 ease-in-out">
                              {suggestion.replace(/^[.]/, "")} <span>+</span>
                              {/* {suggestion} */}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.response && (
                      <hr className="border-t-[1px] border-gray-600 dark:border-gray-600 w-full mx-auto my-5 opacity-50" />
                    )}
                  </div>
                ))}

              {/* ✅ Bot Typing Animation */}
              {(botTyping || isProcessing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="p-3 rounded-lg w-44 md:w-80 bg-gray-500 font-centurygothic text-white self-start ml-2 mb-2  md:ml-0 mr-auto mt-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-500 p-1 rounded-full">
                      <img
                        src="./logo.png"
                        className="h-5 w-5 text-2xl animate-walkingBot"
                        alt="Bot Logo"
                      />
                    </div>
                    <span className="text-xs md:text-lg font-mono">Thinking</span>
                    <span className="animate-typingDots text-xs md:text-lg font-mono">
                      
                    </span>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            // ✅ Greeting when no messages yet
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className={`absolute md:right-80  bottom-44 md:bottom-24 w-full gap-3 md:w-3/5 flex font-centurygothic flex-col items-center justify-center text-center text-gray-800 dark:text-white`}>
                <img
                  src="./logo.png"
                  className="w-16 h-16 block dark:hidden"
                  alt="Logo"
                />
                <img
                  src="./q.png"
                  className="w-16 h-16 hidden dark:block"
                  alt="Logo"
                />
                <span className="md:text-3xl font-centurygothic text-base font-extrabold mb-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 text-transparent bg-clip-text">
                  Quantum<span className="text-base md:text-4xl">Ai</span>
                </span>

                <h2 className="md:text-3xl text-base font-bold mb-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 text-transparent bg-clip-text">
                  {greeting}
                  <span>
                    {isGuest && (
                      <p className="text-xs md:text-base bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 text-transparent bg-clip-text">
                        You are in guest mode. Your messages won't be saved.
                      </p>
                    )}
                  </span>
                  {/* <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 text-transparent bg-clip-text">{showCursor ? "|" : ""}</span> */}
                </h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.5 }}
                  className="text-base md:text-2xl font-bold text-gray-500 dark:text-gray-300 font-centurygothic">
                  {getTimeBasedGreeting()} {user?.username}
                </motion.p>
                {/* <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.5 }}
                    className="text-base md:text-lg text-gray-500 dark:text-gray-300">
                    How can i help you today?
                  </motion.p> */}
              </motion.div>
            </>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>
      {showScrollButton && (
        <button
          onMouseEnter={() => setscrollTooltip(true)}
          onMouseLeave={() => setscrollTooltip(false)}
          onClick={scrollToBottom}
          className={`absolute bottom-[150px]  right-0 md:right-10 transform -translate-x-1/2 z-50 p-1  rounded-full shadow-lg bg-white dark:bg-gray-800 border border-black dark:border-white transition text-black dark:text-white`}
          aria-label="Scroll to bottom">
          {/* <CircleArrowDown /> */}
          <span className="hidden md:block">
            <ArrowDown />
          </span>
          <span className="block md:hidden">
            <ArrowDown size={16} />
          </span>
          {scrollTooltip && (
            <div className="hidden sm:block absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-zinc-900 rounded-lg shadow-md whitespace-nowrap">
              Scroll Down
              <div
                className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 
                  border-l-[6px] border-l-transparent 
                  border-r-[6px] border-r-transparent 
                  border-t-[6px] border-t-zinc-900"
              />
            </div>
          )}
        </button>
      )}
      {/* chat area ends*/}
      {/* Input Section div starts */}
      <div className="flex flex-col  mx-auto    mb-3 mt-2 w-[95%] sm:w-[70%] shadow-2xl rounded-3xl bg-white dark:bg-[#282828]  p-2 transition-colors duration-300">
        {/* File Previews Section — ✅ UPDATED LIKE CHATGPT */}

        {/* test  */}
        <div className="w-full flex gap-3 mb-1 md:mb-3 flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible">
          {files.map((file, index) => (
            <div
              key={index}
              className="relative p-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 rounded-xl shadow-sm w-[150px] flex-shrink-0 flex items-center gap-2">
              {/* 📸 Image Preview */}
              {file?.type?.startsWith("image/") ||
              /\.(jpg|jpeg|png|gif|webp)$/i.test(file?.name) ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-14 h-14 object-cover rounded-md hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="flex flex-col items-start text-black dark:text-white text-xs font-medium">
                  <span className="truncate max-w-[120px] flex items-center gap-1">
                    📄 {file.name}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    {file.name.split(".").pop()?.toUpperCase()}
                  </span>
                </div>
              )}

              {/* ❌ Remove Button */}
              <button
                className="text-red-600 hover:text-red-400 absolute top-1 right-1"
                onClick={() => removeFile(index)}>
                <X size={14} />
              </button>

              {/* ⏳ Upload Progress */}
              {uploadProgress[file.name] && (
                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-gray-300 dark:bg-gray-600 rounded-b-md overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-200"
                    style={{ width: `${uploadProgress[file.name]}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Textarea Input */}

        {/* 
<div className="relative w-full">
  {/* Textarea Input */}
        {/* <textarea
    ref={textareaRef}
    className="w-full h-auto max-h-36 min-h-[44px] p-3  rounded-2xl bg-white dark:bg-gray-700 text-black dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 placeholder:text-gray-400 dark:placeholder-gray-300 transition-all duration-300 resize-none overflow-y-auto scrollbar-hide leading-relaxed relative z-10"
    value={inputMessage + (isRecording ? transcriptBuffer : "")}
    onChange={handleInputChange}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }}
    rows="1"
    placeholder={isRecording ? "" : "Ask me anything..."}
  /> */}

        {/* Text Area with Voice Visualizer */}
        <div className="relative w-full">
          {/* Textarea Input */}
          <textarea
            ref={textareaRef}
            className="w-full h-auto text-xs md:text-base max-h-36 min-h-[35px] md:min-h-[44px] p-2 md:p-3  rounded-2xl bg-white dark:bg-[#717171] transition-all duration-200 ease-in-out text-black dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 placeholder:text-gray-400 dark:placeholder-gray-300   resize-none overflow-y-auto scrollbar-hide leading-relaxed relative z-10"
            value={inputMessage + (isRecording ? transcriptBuffer : "")}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading) {
                  handleSendMessage();
                }
              }
            }}
            rows="1"
            placeholder={
              isUploading ? "" : isRecording ? "" : "Explore anything...."
            }
          />

          {/* Voice Visualizer */}
          {isRecording &&
            inputMessage.length === 0 &&
            transcriptBuffer.length === 0 && (
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <VoiceVisualizer isRecording={true} />
              </div>
            )}
          {isUploading && inputMessage.length === 0 && (
            <div className="absolute top-3 left-3 flex items-center text-sm font-bold font-centurygothic text-black dark:text-white z-20 animate-pulse pointer-events-none">
              <svg
                className="w-4 h-4 mr-2 animate-spin"
                fill="none"
                viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Transcribing...
            </div>
          )}
        </div>

        {/* Buttons Section */}
        <div className="buttons flex justify-between  ">
          <div className="flex w-2/4 gap-2 md:gap-3 md:p-2 ">
            {/* Upload Button */}
            <div className="relative">
              <div
                className="cursor-pointer border-[0.5px] border-gray-800 dark:border-gray-300 rounded-full p-2 text-black dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  if (isGuest) return handleLoginPrompt();
                  fileInputRef.current.click();
                }}
                onMouseEnter={() => setShowUploadTooltip(true)}
                onMouseLeave={() => setShowUploadTooltip(false)}>
                <span className="md:block hidden">
                  <Paperclip size={16} />
                </span>
                <span className="block md:hidden">
                  <Paperclip size={12} />
                </span>
              </div>
              {showLoginPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center shadow-2xl">
                    <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
                      Login Required
                    </h2>
                    <p className="mb-6 text-gray-700 dark:text-gray-300">
                      Please login or sign up to use this feature.
                    </p>
                    <button
                      onClick={() => navigate("/login")}
                      className="bg-blue-500 text-white px-4 py-2 rounded mr-2">
                      Login
                    </button>
                    <button
                      onClick={() => setShowLoginPrompt(false)}
                      className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showUploadTooltip && (
                <div className="absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-1 md:px-2 py-1 text-[9px] md:text-xs text-white bg-zinc-900 rounded-lg shadow-md whitespace-nowrap">
                  Upload file
                  <div
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 
                  border-l-[6px] border-l-transparent 
                  border-r-[6px] border-r-transparent 
                  border-t-[6px] border-t-zinc-900"
                  />
                </div>
              )}
            </div>

            {/* Mic Button */}
            {/* Mic Button */}
<div className="relative">
  <div
    className={`cursor-pointer border-[0.5px] text-black dark:text-white border-gray-800 dark:border-gray-300 rounded-full p-2 
${
  isRecording
    ? "bg-red-500 animate-pulse text-white"
    : "hover:bg-gray-300 dark:hover:bg-gray-700"
} transition-all duration-300 ${!isGuest ? 'opacity-50 cursor-not-allowed' : ''}`}
    onClick={() => {
      if (isGuest) {
        handleLoginPrompt();
        return;
      }
      if (!isGuest) return; // Disable for logged-in users
      isRecording ? stopRecording() : startRecording();
    }}
    onMouseEnter={() => setShowMicTooltip(true)}
    onMouseLeave={() => setShowMicTooltip(false)}>
    {/* {isRecording ? <MicOff size={16} /> : <Mic size={16} />} */}
    <span className="md:block hidden">
      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}{" "}
    </span>

    <span className="block md:hidden">
      {isRecording ? <MicOff size={12} /> : <Mic size={12} />}{" "}
    </span>
  </div>

  {showMicTooltip && (
    <div className="absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-zinc-900  rounded-lg shadow-md">
      {!isGuest ? "Coming Soon" : (isRecording ? "Stop" : "Dictate")}
      <div
        className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 
      border-l-[6px] border-l-transparent 
      border-r-[6px] border-r-transparent 
      border-t-[6px] border-t-zinc-900"
      />
    </div>
  )}
</div>


            {/* <div className=" voice mode working commented for live users"> */}
            {/* <div className="relative voice-controls text-gray-800 dark:text-white">
              <button
                onMouseEnter={() => setvoiceTooltip(true)}
                onMouseLeave={() => setvoiceTooltip(false)}
                onClick={() => {
                  if (isGuest) return handleLoginPrompt();
                  startAiVoice();
                  setShowVoiceOverlay(true);
                }}
                className="btn-start font-bold px-4 py-2 bg-green-600  text-white rounded-xl shadow-md">
                <span className="md:block hidden text-xs md:text-base   items-center gap-2">
                  <AudioLines size={20} />
                </span>
                <span className="block md:hidden text-xs md:text-base    items-center gap-2">
                  <AudioLines size={12} />
                </span>
                {voiceTooltip && (
                  <div className="absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-zinc-900  rounded-lg shadow-md whitespace-nowrap">
                    Voice Mode
                    <div
                      className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 
                  border-l-[6px] border-l-transparent 
                  border-r-[6px] border-r-transparent 
                  border-t-[6px] border-t-zinc-900"
                    />
                  </div>
                )}
              </button>
            </div> */}
            {/* voice overlay container  */}
            {/* {showVoiceOverlay && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-0 left-0 md:left-60 transform -translate-x-1/2 w-full md:w-[80%] h-[180px]  bg-gradient-to-t from-gray-800 via-gray-500 to-transparent backdrop-blur-lg   rounded-2xl text-white z-50 flex flex-col items-center justify-center shadow-2xl transition-all">
                <div className="md:flex items-center justify-center gap-10 mb-4">
                  <div className=" w-52 flex items-center justify-center flex-col">
                    <div className=" w-20 h-20  md:w-40 md:h-40  ">
                      <RadialVisualizer audioStream={audioStreamRef.current} />
                    </div> */}
            {/* Voice status */}
            {/* <div className="  text-sm font-semibold text-center h-6 flex items-center">
                      {isProcessing && (
                        <p className="text-yellow-400 animate-pulse">
                          ⏳ AI thinking...
                        </p>
                      )}
                      {isResponding && (
                        <p className="text-green-400 animate-pulse">
                          🤖 Responding...
                        </p>
                      )}
                      {!isProcessing && !isResponding && isLiveRecording && (
                        <div className="text-blue-400 flex items-center gap-1">
                          <span>🎧 Listening</span>
                          <span className="animate-typingDots ml-1"></span>
                        </div>
                      )}
                    </div>
                  </div> */}

            {/* Stop button */}
            {/* <button
                    onClick={() => {
                      stopAiVoice();
                      setShowVoiceOverlay(false);
                    }}
                    className=" mt-5 md:mt-0 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg transition duration-300">
                    🛑 Stop Voice
                  </button>
                </div>
              </motion.div> */}
            {/* )} */}
            {/* </div> */}
            {/* Hidden File Input */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Send Button */}
          <div className="flex justify-center items-center">
            <button
              onClick={handleSendMessage}
              className="ml-2 p-2 border border-blue-500 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
              disabled={loading}>
              {loading ? (
                // 🌀 Rotating icon while loading (disabled)
                <CirclePause className="w-5 h-5 animate-spin  text-white" />
              ) : (
                <>
                  {/* Show different size icons for responsive views */}
                  <span className="md:block hidden">
                    <Send size={16} />
                  </span>
                  <span className="block md:hidden">
                    <Send size={12} />
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
<p className="mx-auto text-gray-400 dark:text-gray-700 text-xs md:text-sm font-mono font-bold">AI generated content for reference only</p>
      {/* Tailwind Typing Animation */}
      <style>
        {`
  /* Typing Animation */
  @keyframes typingDots {
    0%, 20% {
      content: '';
    }
    40% {
      content: '.';
    }
    60% {
      content: '..';
    }
    80%, 100% {
      content: '...';
    }
  }

  .animate-typingDots::after {
  display: inline-block;
  content: '...';
  animation: typingDots 1.5s steps(4, end) infinite;
  font-size: 1.5rem; /* Increase size */
  font-weight: bold; /* Make it bold */
  line-height: 1;
}


  // .animate-typingDots::after {
  //   display: inline-block;
  //   content: '';
  //   animation: typingDots 1.5s steps(4, end) infinite;
  // }

  /* Customize scrollbar for modern and slim look */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #888;
    border-radius: 10px;
    transition: background-color 0.3s;
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: #555;
  }

  ::-webkit-scrollbar-track {
    background-color: #f1f1f1;
    border-radius: 10px;
  }

  /* Dark mode scrollbar */
  .dark ::-webkit-scrollbar-track {
    background-color: #1f2937;
  }

  .dark ::-webkit-scrollbar-thumb {
    background-color: #4b5563;
  }

  .dark ::-webkit-scrollbar-thumb:hover {
    background-color: #6b7280;
  }
    /* Hide scrollbar for textarea */
.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari */
}

.scrollbar-hide {
  -ms-overflow-style: none; /* IE/Edge */
  scrollbar-width: none; /* Firefox */
}
  /* Expand scrollbar on container hover */
.scrollbar-hover:hover::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}


@keyframes wave1 {
  0%, 100% { height: 20%; }
  50% { height: 100%; }
}

@keyframes wave2 {
  0%, 100% { height: 40%; }
  50% { height: 90%; }
}

@keyframes wave3 {
  0%, 100% { height: 60%; }
  50% { height: 70%; }
}

@keyframes wave4 {
  0%, 100% { height: 30%; }
  50% { height: 80%; }
}

.animate-wave1 {
  animation: wave1 1s infinite ease-in-out;
}

.animate-wave2 {
  animation: wave2 1s infinite ease-in-out;
}

.animate-wave3 {
  animation: wave3 1s infinite ease-in-out;
}

.animate-wave4 {
  animation: wave4 1s infinite ease-in-out;
}

// voice part 

.voice-assistant {
  margin-bottom: 1rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  background-color: #e5e7eb;
  font-size: 0.875rem;
}

.status-badge.recording {
  background-color: #ef4444;
  color: white;
  animation: pulse 1.5s infinite;
}

.interim-transcript {
  padding: 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  max-height: 100px;
  overflow-y: auto;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes botWalk {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}

.animate-walkingBot {
  animation: botWalk 0.8s infinite;
}

// greeting animation blinker 
.blinker {
  display: inline-block;
  width: 1ch;
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

//realtime ai animation

.btn-start {
  @apply px-4 py-2 bg-green-600 text-white rounded-xl shadow-md;
}

.btn-stop {
  @apply px-4 py-2 bg-red-600 text-white rounded-xl shadow-md;
}
@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes typingDots {
  0% {
    content: '';
  }
  33% {
    content: '.';
  }
  66% {
    content: '..';
  }
  100% {
    content: '...';
  }
}

.animate-float {
  animation: float 2s ease-in-out infinite;
}

.animate-typingDots::after {
  content: '';
  animation: typingDots 1s steps(3, end) infinite;
}

// response select css 
.select-text {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.select-none {
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
}


`}
      </style>
    </div>
  );
};

export default ChatArea;
