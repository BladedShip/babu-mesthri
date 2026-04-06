Offline Multimodal AI Agent: App Architecture

1. App Definition & User Experience

The application is a Privacy-First, Offline AI Personal Assistant. It acts as a local agent capable of understanding natural language, processing images, and interacting with the device's native data (calendar, contacts) without ever sending user data to the cloud.

Core UI/UX Components

Chat Interface: The primary interaction screen. It supports text input, voice transcription, and image attachments.

"Thinking Mode" Toggle: A UI switch allowing the user to explicitly enable deep reasoning for complex tasks (leveraging models like DeepSeek-R1 or Qwen 3's dual-mode). When enabled, the UI shows the model's step-by-step reasoning process before providing the final answer.

Agentic Action Cards: When the LLM performs an action (e.g., checking the calendar or drafting a new event), the UI renders a native React Native card showing the structured data, rather than just raw text.

Settings & Model Hub: A dedicated screen where users can manage their downloaded models, monitor device storage, and toggle OS-level permissions (Camera, Contacts, Calendar). Toggling a permission instantly updates the LLM's system prompt to reflect its available tools.

Key Use Cases

Schedule Management: "What meetings do I have tomorrow?" -> The LLM calls the calendar API, reads the schedule, and summarizes it.

Multimodal Queries: Taking a picture of a flyer and asking, "Add this event to my calendar." The vision model extracts the date, time, and title, and triggers the calendar creation tool.

Offline Knowledge Retrieval: Asking general knowledge questions or summarizing locally stored text documents while completely disconnected from the internet.

2. Model Tier List & Selection (2026 Edition)

To accommodate the vast landscape of mobile hardware, the app supports downloading multiple models in GGUF format (usually highly quantized to 4-bit or 5-bit precision to save memory).

Ultra-Low End / Background Tasks (< 1.5GB RAM):

FunctionGemma-270M: A tiny model from Google specifically trained only for tool calling. Perfect for routing commands on older devices.

Qwen3-0.5B (~400MB): Extremely fast, capable of basic text routing and simple queries. No vision support.

Low-End Tier (2GB - 4GB RAM):

Gemma 4 E2B (~1.5GB): Google's Edge 2B model. Highly optimized for smartphones with native multimodal (vision) support and a large context window.

DeepSeek-R1-Distill-Qwen-1.5B (~1.2GB): Excellent for complex step-by-step reasoning and logic on constrained hardware.

Llama-3.2-1B-Instruct (~800MB): Solid baseline reasoning, good for basic device queries and tool calling.

Mid-Range Tier / Sweet Spot (4GB - 8GB RAM):

Qwen3-8B (~4.5GB): Recommended default for modern devices. Features a dual-mode operation (seamless switching between fast chat and deep reasoning) and native multimodal capabilities. Exceptional at strict JSON generation for tool execution.

Gemma 4 E4B (~2.8GB): Google's Edge 4B model. Powerful multimodal capabilities and excellent instruction following for agentic workflows.

Phi-4-mini (3.8B, ~2.5GB): Microsoft's highly capable model. Punches above its weight class in reasoning and logic tasks.

Ministral 3B (~2GB): Mistral's edge-optimized model offering blazing fast inference for interactive, latency-sensitive tasks.

High-End / Flagship Devices (8GB+ RAM):

Mistral Nemo 12B (~7GB): Phenomenal reasoning and language generation, easily replacing cloud-based APIs for complex tasks.

DeepSeek-R1-Distill-Llama-8B (~5GB): Brings desktop-class reasoning and coding/logic capabilities to mobile.

Llama-3.3-8B-Instruct (~5GB): The industry standard baseline for 8B performance, offering highly reliable tool calling and natural conversation.

3. Core Technology Stack

UI Framework: React Native.

Inference Engine: llama.rn (React Native bindings for llama.cpp). This handles GGUF loading, hardware acceleration (Metal on iOS, Vulkan on Android), and tokenization.

Model Downloader: react-native-fs or expo-file-system (supports background downloading, resumable downloads, and calculating MD5 hashes to verify model integrity).

Local Storage: react-native-mmkv for high-speed, encrypted local storage of chat history and settings.

Native Device Access & Permissions:

react-native-permissions (Unified permission management).

react-native-contacts

react-native-calendar-events

react-native-vision-camera

4. Architecture Layers

A. The Native Device Layer

Handles hardware and OS-level API access.

Sensors: Camera and Microphone.

Personal Data: Contacts, Calendar, Storage/Gallery. Access is completely dependent on explicit user grants.

B. The React Native Bridge & Tool Handlers

The intermediary between the LLM and the OS.

Tool Registry: Predefined JSON schema of available functions (e.g., get_contacts, get_calendar_events, Calendar). Tools are dynamically enabled/disabled based on the permissions granted in the Settings page.

Execution Logic: Intercepts LLM tool call requests (JSON), executes the native OS fetch, and formats the result back into text/JSON for the LLM to read.

C. The Inference Layer (llama.rn)

The localized runtime environment.

Loads the user-selected model from the device's local file system into memory.

If the user swaps models in Settings, this layer gracefully unloads the current model from RAM and loads the new one.

Handles vision projection for multimodal models (like Gemma 4 E2B or Qwen 3).

D. Settings, Permissions, & Model Management Layer

A dedicated control center for the user.

Model Hub: A UI fetching a static JSON list of available models (from a trusted repo like HuggingFace). Allows users to initiate, pause, resume, or delete downloaded .gguf files to manage device storage.

Permission Toggles: Granular UI switches for Camera, Storage, Contacts, Calendar, and Notifications. Toggling these immediately updates the LLM's "System Prompt" so it knows which tools it is currently allowed to use.

E. The Orchestration Layer (App Logic)

Manages application state and the multi-turn conversational loop.

Context Assembly: Prepend System Prompt (aware of current permissions, date, and time) and chat history.

Inference (Pass 1): LLM analyzes prompt. Outputs structured tool call if device data is needed.

Tool Execution: App intercepts the generation, runs the Native API (if permission is granted).

Inference (Pass 2): App appends raw API data to context; LLM generates the final natural language answer.

5. Privacy & Security Implementation (Strict Local Isolation)

Because the app must connect to the internet to download models, we cannot completely remove network permissions. Instead, we implement "Strict Local Isolation":

Isolated Download Module: The only component of the application capable of making HTTP requests is the Model Downloader. This is statically hardcoded to only hit trusted URLs (e.g., HuggingFace model endpoints).

No Telemetry/Analytics: Ensure zero third-party analytics SDKs (like Firebase Analytics or Crashlytics) are included in the build.

Encrypted Local Storage: Chat history and cached OS data are heavily encrypted using react-native-mmkv's encryption engine.

Offline Mode Toggle: A master "Strict Offline Mode" toggle in the Settings. When enabled, the app actively blocks any network request at the application layer, giving the user absolute certainty that their queries and data are not leaving the device while communicating with the LLM.