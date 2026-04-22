import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InferenceService, ChatMessage } from '../../services/InferenceService';
import { useAppStore } from '../../store/appStore';
import { Colors } from '@/constants/theme';
import ChatSidebar from '../../components/ChatSidebar';
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

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    if (!activeModelId) {
      alert('Please select and download a model from Settings first.');
      return;
    }

    const userMessage = { role: 'user', content: inputText.trim() } as ChatMessage;
    
    if (activeChat && activeChat.title === 'New Chat' && messages.length <= 1) {
      const shortTitle = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
      setAutoTitle(activeChat.id, shortTitle);
    }

    appendMessageToActiveChat(userMessage);
    setInputText('');
    setIsInferencing(true);

    try {
      await InferenceService.loadModel(activeModelId);
      
      const currentMessages = [...messages, userMessage];
      const updatedMessages = await InferenceService.runChatTurn(currentMessages, (token) => {
      });
      
      useAppStore.getState().updateActiveChatHistory(updatedMessages);
      
    } catch (e: any) {
      alert('Error during inference: ' + e.message);
    } finally {
      setIsInferencing(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ChatSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* TopAppBar */}
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.iconBtn}>
            <Ionicons name="menu" size={24} color={Colors.dark.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Babu Mesthri</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.offlineBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.offlineText}>{isOfflineMode ? 'OFFLINE' : 'ONLINE'}</Text>
          </View>
        </View>
      </View>
      
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
              <Text style={styles.headlineTitle}>Inference: {activeModelId ? activeModelId.split('/').pop() : 'None Selected'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.chatCanvas}>
          {messages.filter(m => {
            if (m.role === 'system' || m.role === 'tool') return false;
            const content = m.content.trim();
            if (content.startsWith('```json') || (content.startsWith('{') && content.includes('"tool"'))) return false;
            return true;
          }).map((msg, i) => {
            const isUser = msg.role === 'user';
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
                  <View style={styles.botBubble}>
                    <Text style={styles.bodyText}>{msg.content}</Text>
                  </View>
                  <Text style={styles.labelTime}>Babu Mesthri Intelligence</Text>
                </View>
              );
            }
          })}
          
          {isInferencing && (
            <View style={styles.botMessageContainer}>
              <View style={styles.thinkingBadge}>
                <ActivityIndicator size="small" color={Colors.dark.primary} style={{ marginRight: 8 }} />
                <Text style={styles.thinkingText}>Querying local contacts & schematics...</Text>
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
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]} 
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
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.dark.primary },
  offlineText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  inferenceHeader: { padding: 24, backgroundColor: Colors.dark.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: Colors.dark.outlineVariant },
  inferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelSmall: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant, marginBottom: 4 },
  headlineTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.dark.onSurface },
  chatCanvas: { padding: 24, gap: 24 },
  userMessageContainer: { alignItems: 'flex-end', marginBottom: 24 },
  userBubble: { maxWidth: '85%', backgroundColor: Colors.dark.surfaceContainerHigh, padding: 16, borderRadius: 12, borderTopRightRadius: 0, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, marginBottom: 6 },
  botMessageContainer: { alignItems: 'flex-start', marginBottom: 24 },
  botBubble: { maxWidth: '85%', backgroundColor: Colors.dark.surfaceContainerLowest, padding: 20, borderRadius: 12, borderTopLeftRadius: 0, borderLeftWidth: 2, borderLeftColor: Colors.dark.primary, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 3, marginBottom: 6 },
  bodyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurface, lineHeight: 22 },
  labelTime: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },
  thinkingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 27, 27, 0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.3)' },
  thinkingText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },
  inputSection: { position: 'absolute', left: 0, width: '100%', paddingHorizontal: 16, pointerEvents: 'box-none' },
  inputCard: { backgroundColor: Colors.dark.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.5)', overflow: 'hidden' },
  inputHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(28, 27, 27, 0.3)', borderBottomWidth: 1, borderBottomColor: 'rgba(60, 74, 66, 0.2)', gap: 8 },
  inputHeaderText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8 },
  attachBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  textInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurface, minHeight: 40, maxHeight: 120, paddingTop: 10, paddingBottom: 10 },
  sendBtn: { backgroundColor: Colors.dark.primary, padding: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }
});
