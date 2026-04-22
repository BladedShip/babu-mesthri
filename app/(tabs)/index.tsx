import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InferenceService, ChatMessage } from '../../services/InferenceService';
import { ModelManager, AVAILABLE_MODELS } from '../../services/ModelManager';
import { useAppStore } from '../../store/appStore';
import { Colors } from '@/constants/theme';
import ChatSidebar from '../../components/ChatSidebar';
import ToolConsentModal from '../../components/ToolConsentModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { 
    isOfflineMode, activeModelId, activeChatId, chats, 
    createChat, appendMessageToActiveChat, setAutoTitle 
  } = useAppStore();
  
  const [inputText, setInputText] = useState('');
  const [isInferencing, setIsInferencing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!activeChatId && Object.keys(chats).length === 0) {
      createChat();
    } else if (!activeChatId && Object.keys(chats).length > 0) {
      const latest = Object.values(chats).sort((a,b) => b.createdAt - a.createdAt)[0];
      useAppStore.getState().switchChat(latest.id);
    }

    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [activeChatId, chats]);

  const activeChat = activeChatId ? chats[activeChatId] : null;
  const messages = activeChat?.messages || [];

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const showError = useCallback((message: string) => {
    setErrorBanner(message);
    setTimeout(() => setErrorBanner(null), 8000);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    // Guard: No model selected
    if (!activeModelId) {
      showError('No model selected. Go to the Models tab to download and activate a model.');
      return;
    }

    // Guard: Check if model file is actually downloaded
    const modelConfig = AVAILABLE_MODELS.find(m => m.id === activeModelId);
    if (modelConfig) {
      const isDownloaded = await ModelManager.isModelDownloaded(modelConfig.filename);
      if (!isDownloaded) {
        if (isOfflineMode) {
          showError('The selected model is not downloaded, and Strict Offline Mode is enabled. Disable offline mode in Settings to download it.');
        } else {
          showError(`Model "${modelConfig.name}" is not downloaded yet. Go to the Models tab to download it.`);
        }
        return;
      }
    }

    const userMessage = { role: 'user', content: inputText.trim() } as ChatMessage;
    
    if (activeChat && activeChat.title === 'New Chat' && messages.length <= 1) {
      const shortTitle = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
      setAutoTitle(activeChat.id, shortTitle);
    }

    appendMessageToActiveChat(userMessage);
    setInputText('');
    setIsInferencing(true);
    setStreamingText('');
    setActiveToolName(null);
    setErrorBanner(null);

    try {
      await InferenceService.loadModel(activeModelId);
      
      const currentMessages = [...messages, userMessage];
      const updatedMessages = await InferenceService.runChatTurn(
        currentMessages,
        // onToken: stream tokens to the UI in real time
        (token) => {
          setStreamingText(prev => prev + token);
        },
        // onToolAction: show which tool is being run
        (toolName) => {
          setActiveToolName(toolName);
          setStreamingText(''); // reset streaming for the next LLM pass
        }
      );
      
      useAppStore.getState().updateActiveChatHistory(updatedMessages);
      
    } catch (e: any) {
      const errorMsg = e?.message || 'An unknown error occurred during inference.';
      showError(errorMsg);
    } finally {
      setIsInferencing(false);
      setStreamingText('');
      setActiveToolName(null);
      scrollToBottom();
    }
  };

  // Filter messages for display (hide system prompts, raw tool JSON, etc.)
  const visibleMessages = messages.filter(m => {
    if (m.role === 'system' || m.role === 'tool') return false;
    const content = m.content.trim();
    if (content.startsWith('```json') || (content.startsWith('{') && content.includes('"tool"'))) return false;
    return true;
  });

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <ToolConsentModal />
      
      {/* TopAppBar */}
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.iconBtn}>
            <Ionicons name="menu" size={24} color={Colors.dark.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Babu Mesthri</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.offlineBadge, !isOfflineMode && styles.onlineBadge]}>
            <View style={[styles.pulseDot, !isOfflineMode && styles.onlineDot]} />
            <Text style={[styles.offlineText, !isOfflineMode && styles.onlineText]}>{isOfflineMode ? 'OFFLINE' : 'ONLINE'}</Text>
          </View>
        </View>
      </View>
      
      {/* Error Banner */}
      {errorBanner && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={Colors.dark.error} />
          <Text style={styles.errorBannerText}>{errorBanner}</Text>
          <TouchableOpacity onPress={() => setErrorBanner(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={16} color={Colors.dark.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Inference Header */}
        <View style={styles.inferenceHeader}>
          <View style={styles.inferenceRow}>
            <View>
              <Text style={styles.labelSmall}>Active Model</Text>
              <Text style={styles.headlineTitle}>
                {activeModelId 
                  ? `Inference: ${AVAILABLE_MODELS.find(m => m.id === activeModelId)?.name || activeModelId}`
                  : 'No Model Selected'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chatCanvas}>
          {/* Empty State */}
          {visibleMessages.length === 0 && !isInferencing && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="terminal" size={40} color={Colors.dark.primary} />
              </View>
              <Text style={styles.emptyTitle}>Ready for Inference</Text>
              <Text style={styles.emptySubtitle}>
                {activeModelId
                  ? 'Send a message to begin a conversation. All processing happens locally on your device.'
                  : 'No model is active. Go to the Models tab to download and activate a model, then come back here to chat.'}
              </Text>
              <View style={styles.emptyHints}>
                <View style={styles.hintChip}>
                  <Text style={styles.hintText}>💬 "What can you do?"</Text>
                </View>
                <View style={styles.hintChip}>
                  <Text style={styles.hintText}>📅 "What's on my calendar?"</Text>
                </View>
                <View style={styles.hintChip}>
                  <Text style={styles.hintText}>📇 "Find John's number"</Text>
                </View>
              </View>
            </View>
          )}

          {visibleMessages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isError = msg.isError;

            if (isUser) {
              return (
                <View key={i} style={styles.userMessageContainer}>
                  <View style={styles.userBubble}>
                    <Text style={styles.bodyText}>{msg.content}</Text>
                  </View>
                  <Text style={styles.labelTime}>Sent • Local</Text>
                </View>
              );
            } else {
              return (
                <View key={i} style={styles.botMessageContainer}>
                  <View style={[styles.botBubble, isError && styles.errorBubble]}>
                    {isError && (
                      <View style={styles.errorBubbleHeader}>
                        <Ionicons name="warning" size={14} color="#FFA726" />
                        <Text style={styles.errorBubbleLabel}>Issue Encountered</Text>
                      </View>
                    )}
                    <Text style={styles.bodyText}>{msg.content}</Text>
                  </View>
                  <Text style={styles.labelTime}>{isError ? 'System Notice' : 'Babu Mesthri Intelligence'}</Text>
                </View>
              );
            }
          })}
          
          {/* Streaming text (real-time token display) */}
          {isInferencing && streamingText && !activeToolName && (
            <View style={styles.botMessageContainer}>
              <View style={styles.botBubble}>
                <Text style={styles.bodyText}>{streamingText}</Text>
                <View style={styles.streamingIndicator}>
                  <View style={styles.streamingDot} />
                </View>
              </View>
            </View>
          )}

          {/* Tool execution indicator */}
          {isInferencing && activeToolName && (
            <View style={styles.botMessageContainer}>
              <View style={styles.thinkingBadge}>
                <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginRight: 8 }} />
                <Text style={styles.thinkingText}>Running {activeToolName}...</Text>
              </View>
            </View>
          )}

          {/* Generic thinking indicator (before any tokens arrive) */}
          {isInferencing && !streamingText && !activeToolName && (
            <View style={styles.botMessageContainer}>
              <View style={styles.thinkingBadge}>
                <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginRight: 8 }} />
                <Text style={styles.thinkingText}>Processing locally...</Text>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Floating Input Section */}
      <View style={[styles.inputSection, { bottom: isKeyboardVisible ? 10 : 90 }]}>
        <View style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.dark.primaryFixed} />
            <Text style={styles.inputHeaderText}>Encrypted Input Terminal</Text>
          </View>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="image-outline" size={24} color={Colors.dark.onSurfaceVariant} />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Send secure prompt..."
              placeholderTextColor="rgba(187, 202, 191, 0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!isInferencing}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!inputText.trim() || isInferencing) && { opacity: 0.5 }]} 
              onPress={handleSend} 
              disabled={isInferencing || !inputText.trim()}
            >
              <Ionicons name="send" size={20} color={Colors.dark.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.dark.background,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1c',
    zIndex: 50,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.dark.primary, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.dark.surfaceContainerLow, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 8 },
  onlineBadge: { backgroundColor: 'rgba(78, 222, 163, 0.1)' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary },
  onlineDot: { backgroundColor: '#4ecdc4' },
  offlineText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },
  onlineText: { color: '#4ecdc4' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
    borderRadius: 10,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.dark.error,
    lineHeight: 18,
  },

  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  inferenceHeader: { padding: 24, backgroundColor: Colors.dark.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.dark.outlineVariant },
  inferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelSmall: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant, marginBottom: 4 },
  headlineTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.dark.onSurface },
  chatCanvas: { padding: 24, gap: 24 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 222, 163, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(78, 222, 163, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontFamily: 'Manrope_700Bold', fontSize: 22, color: Colors.dark.onSurface, letterSpacing: -0.5 },
  emptySubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurfaceVariant, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  emptyHints: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  hintChip: {
    backgroundColor: Colors.dark.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.outlineVariant,
  },
  hintText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.dark.onSurfaceVariant },

  // Messages
  userMessageContainer: { alignItems: 'flex-end', marginBottom: 24 },
  userBubble: { maxWidth: '85%', backgroundColor: Colors.dark.surfaceContainerHigh, padding: 16, borderRadius: 12, borderTopRightRadius: 0, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, marginBottom: 6 },
  botMessageContainer: { alignItems: 'flex-start', marginBottom: 24 },
  botBubble: { maxWidth: '85%', backgroundColor: Colors.dark.surfaceContainerLowest, padding: 20, borderRadius: 12, borderTopLeftRadius: 0, borderLeftWidth: 2, borderLeftColor: Colors.dark.primary, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3, marginBottom: 6 },
  errorBubble: { borderLeftColor: '#FFA726' },
  errorBubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  errorBubbleLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#FFA726' },
  bodyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurface, lineHeight: 22 },
  labelTime: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },

  // Streaming indicator
  streamingIndicator: { marginTop: 6, flexDirection: 'row' },
  streamingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.dark.primary, opacity: 0.6 },

  // Thinking / Tool action
  thinkingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 27, 27, 0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.3)' },
  thinkingText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },

  // Input
  inputSection: { position: 'absolute', left: 0, width: '100%', paddingHorizontal: 16, pointerEvents: 'box-none' },
  inputCard: { backgroundColor: Colors.dark.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.5)', overflow: 'hidden' },
  inputHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(28, 27, 27, 0.3)', borderBottomWidth: 1, borderBottomColor: 'rgba(60, 74, 66, 0.2)', gap: 8 },
  inputHeaderText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8 },
  attachBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurface, minHeight: 40, maxHeight: 120, paddingTop: 10, paddingBottom: 10 },
  sendBtn: { backgroundColor: Colors.dark.primary, padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
