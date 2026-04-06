# Offline Multimodal AI Agent: Architecture Definition

This document outlines the architectural design and core technology stack for the Privacy-First, Offline AI Personal Assistant application, derived directly from the primary project plan.

---

## 1. Core Technology Stack

- **UI Framework:** React Native.
- **Inference Engine:** `llama.rn` (React Native bindings for `llama.cpp`). This handles GGUF loading, hardware acceleration (Metal on iOS, Vulkan on Android), and tokenization.
- **Model Downloader:** `react-native-fs` or `expo-file-system`. Supports background downloading, resumable downloads, and calculating MD5 hashes to verify model integrity.
- **Local Storage:** `react-native-mmkv` for high-speed, encrypted local storage of chat history and application settings.
- **Native Device Access & Permissions:**
  - `react-native-permissions` (Unified OS permission management).
  - `react-native-contacts`
  - `react-native-calendar-events`
  - `react-native-vision-camera`

---

## 2. Architecture Layers

The architecture is composed of distinct layers designed to seamlessly orchestrate local LLMs while respecting the user's local hardware boundaries and privacy.

### A. The Native Device Layer
Handles hardware and OS-level API access.
- **Sensors:** Camera and Microphone.
- **Personal Data:** Contacts, Calendar, Storage/Gallery. 
*Note: Access to these components is completely dependent on explicit user grants.*

### B. The React Native Bridge & Tool Handlers
Acts as the secure intermediary between the Inference Engine (LLM) and the mobile operating system.
- **Tool Registry:** Contains predefined JSON schemas of available functions (e.g., `get_contacts`, `get_calendar_events`, `create_calendar_event`). Tools are dynamically enabled or disabled based on current permissions granted by the user.
- **Execution Logic:** Intercepts structured LLM tool call requests (JSON), executes the corresponding native OS fetches/actions, and formats the result back into a structured text/JSON format for the LLM to interpret.

### C. The Inference Layer (`llama.rn`)
The localized runtime environment powering the intelligence of the app.
- Loads the user-selected, hardware-optimized model (`.gguf`) directly from the device's local file system into memory.
- Handles dynamic model switching: gracefully unloads the current model from RAM and loads a new one when the user swaps models in the Model Hub.
- Manages vision projection for multimodal edge models (like Gemma 4 E2B or Qwen 3).

### D. Settings, Permissions, & Model Management Layer
An explicit control center dedicated to ensuring maximum user autonomy over models and OS connections.
- **Model Hub:** A UI interface fetching a static JSON list of curated models from trusted repositories (e.g., HuggingFace). Users can initiate, pause, resume, or delete downloaded `.gguf` files to effectively manage their device storage.
- **Permission Toggles:** Granular, real-time UI switches for Camera, Storage, Contacts, Calendar, and Notifications. Toggling these immediately manipulates the LLM's "System Prompt" payload, explicitly restricting or enabling the toolset the agent is allowed to use.

### E. The Orchestration Layer (App Logic)
Manages application state routing and the complex multi-turn conversational loop between the user, the LLM, and device native APIs.
- **Context Assembly:** Prepends the current System Prompt (fully aware of real-time granted permissions, device date, and time) and dynamically formats the recent chat history context window.
- **Inference (Pass 1):** The LLM analyzes the assembled prompt. It may natively output a structured tool call if real-time device data is necessary to fulfill the user's intent.
- **Tool Execution:** The orchestration layer pauses inference, intercepts the tool invocation request, and runs the Native API operation (if permission is granted).
- **Inference (Pass 2):** The app appends the raw OS API interaction results to the conversation context; the LLM then processes this new information to generate the final natural language answer to the user.

---

## 3. Privacy & Security Implementation (Strict Local Isolation)

Given the primary focus on user privacy, the architecture adheres to "Strict Local Isolation". To accomplish this while accommodating model downloads:

- **Isolated Download Module:** The only component of the entire application capable of making external HTTP network requests is the Model Downloader. This module is statically hardcoded to only communicate with trusted, predefined endpoints (e.g., HuggingFace model endpoints).
- **No Telemetry/Analytics:** The application build is entirely stripped of any third-party analytics SDKs (such as Firebase Analytics or Crashlytics) to guarantee zero baseline behavioral tracking.
- **Encrypted Local Storage:** Chat history, extracted conversational context, and cached OS data are locally secured using `react-native-mmkv`'s high-speed encryption features.
- **Strict Offline Mode Toggle:** A master security feature located in the Settings. When engaged, this toggle actively intercepts and blocks *any* network request directly at the application layer. This provides the user with absolute certainty that no queries, multimodal inputs, or generated answers are leaving the device sandbox during AI communication periods.
