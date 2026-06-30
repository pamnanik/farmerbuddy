// FarmBridge Chat Application with Voice Support
(function () {
  "use strict";

  // --- DOM Elements ---
  const chatContainer = document.getElementById("chatContainer");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const micBtn = document.getElementById("micBtn");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const attachBtn = document.getElementById("attachBtn");
  const fileInput = document.getElementById("fileInput");
  const imagePreviewContainer = document.getElementById("imagePreviewContainer");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImageBtn");

  // --- State ---
  let sessionId = "";
  let isListening = false;
  let recognition = null;
  let attachedImageBase64 = "";
  let isImmersiveEnabled = false;

  const immersiveToggle = document.getElementById("immersiveToggle");
  if (immersiveToggle) {
    immersiveToggle.addEventListener("click", function () {
      isImmersiveEnabled = !isImmersiveEnabled;
      if (isImmersiveEnabled) {
        immersiveToggle.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        immersiveToggle.title = "Disable Voice Response";
      } else {
        immersiveToggle.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        immersiveToggle.title = "Enable Voice Response";
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      }
    });
  }

  // --- Speech Recognition Setup ---
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function () {
      isListening = true;
      micBtn.classList.add("listening");
      recordingIndicator.classList.remove("hidden");
    };

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
      sendMessage(transcript);
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error:", event.error);
      stopListening();
      if (event.error === "not-allowed") {
        addMessage(
          "Microphone access was denied. Please allow microphone access in your browser settings.",
          "bot"
        );
      }
    };

    recognition.onend = function () {
      stopListening();
    };
  } else {
    // Browser doesn't support Speech Recognition
    micBtn.disabled = true;
    micBtn.title = "Voice input not supported in this browser";
    micBtn.style.opacity = "0.5";
  }

  function stopListening() {
    isListening = false;
    micBtn.classList.remove("listening");
    recordingIndicator.classList.add("hidden");
  }

  // --- Speech Synthesis (Text-to-Speech) ---
  function detectLanguage(text) {
    if (/[\u0900-\u097F]/.test(text)) return "hi-IN"; // Hindi
    if (/[\u0600-\u06FF]/.test(text)) return "ar-AE"; // Arabic
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) return "ja-JP"; // Japanese
    if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(text)) return "ko-KR"; // Korean
    if (/[\u4E00-\u9FFF]/.test(text)) return "zh-CN"; // Chinese
    if (/[\u0400-\u04FF]/.test(text)) return "ru-RU"; // Russian
    if (/[¿¡áéíóúüñ]/i.test(text)) return "es-ES"; // Spanish
    if (/[àâæçéèêëîïôœùûüÿ]/i.test(text)) return "fr-FR"; // French
    if (/[äöüß]/i.test(text)) return "de-DE"; // German
    return "en-US";
  }

  function cleanTextForSpeech(text) {
    if (!text) return "";
    let clean = text;
    // Remove code blocks
    clean = clean.replace(/```[\s\S]*?```/g, "");
    // Remove inline code
    clean = clean.replace(/`([^`]+)`/g, "$1");
    // Remove markdown links [text](url) -> text
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Remove headers (#, ##, etc.)
    clean = clean.replace(/^#+\s+/gm, "");
    // Remove bold/italic markers
    clean = clean.replace(/[\*_~]{1,3}/g, "");
    // Remove bullet points/lists numbering or dashes at start of lines
    clean = clean.replace(/^\s*[\-\*\+]\s+/gm, "");
    clean = clean.replace(/^\s*\d+\.\s+/gm, "");
    // Clean up extra whitespace/newlines
    clean = clean.replace(/\n+/g, " ");
    return clean.trim();
  }

  function speakText(text) {
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const detectedLang = detectLanguage(cleanedText);
    utterance.lang = detectedLang;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Find voice matching the detected language prefix
      let voice = voices.find(v => v.lang.toLowerCase().startsWith(detectedLang.toLowerCase()));
      if (!voice) {
        const shortLang = detectedLang.substring(0, 2).toLowerCase();
        voice = voices.find(v => v.lang.toLowerCase().startsWith(shortLang));
      }
      if (voice) {
        utterance.voice = voice;
      }
    }

    window.speechSynthesis.speak(utterance);
  }

  // Ensure voices are loaded (they load asynchronously in some browsers)
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = function () {
      window.speechSynthesis.getVoices();
    };
  }

  // --- Chat Functions ---
  function addMessage(text, type, imageSrc) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${type}-message`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    
    if (text) {
      const textDiv = document.createElement("div");
      textDiv.textContent = text;
      bubble.appendChild(textDiv);
    }
    
    if (imageSrc) {
      const img = document.createElement("img");
      img.src = imageSrc;
      bubble.appendChild(img);
    }

    msgDiv.appendChild(bubble);
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function addTypingIndicator() {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot-message typing-indicator";
    msgDiv.id = "typingIndicator";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerHTML =
      '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

    msgDiv.appendChild(bubble);
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById("typingIndicator");
    if (indicator) indicator.remove();
  }

  async function sendMessage(text) {
    const message = text || messageInput.value.trim();
    if (!message && !attachedImageBase64) return;

    if (message.length > 500) {
      alert("Error: Message exceeds maximum length of 500 characters.");
      return;
    }

    messageInput.value = "";
    
    // Capture the attached image to send and show in user message bubble
    const imageToSend = attachedImageBase64;
    
    // Clear attachment state immediately
    attachedImageBase64 = "";
    fileInput.value = "";
    imagePreviewContainer.style.display = "none";
    imagePreview.src = "";

    addMessage(message, "user", imageToSend);
    addTypingIndicator();
    sendBtn.disabled = true;

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message, image: imageToSend, session_id: sessionId }),
      });

      const data = await response.json();
      removeTypingIndicator();

      if (data.response) {
        addMessage(data.response, "bot");
        if (isImmersiveEnabled) {
          speakText(data.response);
        }
      } else {
        addMessage("Temporary unavailable.", "bot");
      }

      if (data.session_id) {
        sessionId = data.session_id;
      }
    } catch (error) {
      removeTypingIndicator();
      console.error("Error:", error);
      addMessage(
        "Temporary unavailable.",
        "bot"
      );
    }

    sendBtn.disabled = false;
    messageInput.focus();
  }

  // --- Event Listeners ---
  sendBtn.addEventListener("click", function () {
    sendMessage();
  });

  messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });

  micBtn.addEventListener("click", function () {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });

  attachBtn.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (10 MB = 10 * 1024 * 1024 bytes)
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Error: Image size exceeds maximum limit of 10MB.");
      fileInput.value = "";
      return;
    }

    // Validate format
    const allowedExtensions = ["jpg", "jpeg", "png"];
    const extension = file.name.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      alert("Error: Unsupported image format. Only JPG, JPEG, and PNG are supported.");
      fileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      attachedImageBase64 = event.target.result;
      imagePreview.src = attachedImageBase64;
      imagePreviewContainer.style.display = "flex";
    };
    reader.readAsDataURL(file);
  });

  removeImageBtn.addEventListener("click", function () {
    attachedImageBase64 = "";
    fileInput.value = "";
    imagePreviewContainer.style.display = "none";
    imagePreview.src = "";
  });
})();
