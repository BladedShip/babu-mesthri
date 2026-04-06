import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const insets = useSafeAreaInsets();
  const chats = useAppStore(state => state.chats);
  const activeChatId = useAppStore(state => state.activeChatId);
  const switchChat = useAppStore(state => state.switchChat);
  const createChat = useAppStore(state => state.createChat);
  const deleteChat = useAppStore(state => state.deleteChat);
  
  const translateX = useSharedValue(-SIDEBAR_WIDTH);

  useEffect(() => {
    translateX.value = withTiming(isOpen ? 0 : -SIDEBAR_WIDTH, { duration: 300 });
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const chatList = Object.values(chats).sort((a, b) => b.createdAt - a.createdAt);

  const handleCreateNew = () => {
    createChat();
    onClose();
  };

  const handleSelect = (id: string) => {
    switchChat(id);
    onClose();
  };

  return (
    <View style={styles.overlay} pointerEvents={isOpen ? 'auto' : 'none'}>
      {isOpen && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      )}
      <Animated.View style={[styles.sidebar, animatedStyle]}>
        <View style={[styles.header, { paddingTop: insets.top || 40 }]}>
          <Text style={styles.headerTitle}>Conversations</Text>
          <TouchableOpacity onPress={handleCreateNew} style={styles.newBtn}>
            <Ionicons name="add" size={24} color={Colors.dark.background} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list}>
          {chatList.map(chat => {
            const isActive = chat.id === activeChatId;
            return (
              <TouchableOpacity 
                key={chat.id} 
                style={[styles.chatItem, isActive && styles.chatItemActive]}
                onPress={() => handleSelect(chat.id)}
              >
                <Ionicons name="chatbubble-outline" size={20} color={isActive ? Colors.dark.primary : Colors.dark.onSurfaceVariant} />
                <View style={styles.chatInfo}>
                  <Text style={[styles.chatTitle, isActive && styles.chatTitleActive]} numberOfLines={1}>
                    {chat.title}
                  </Text>
                  <Text style={styles.chatDate}>
                    {new Date(chat.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteChat(chat.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color={Colors.dark.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            )
          })}
          {chatList.length === 0 && (
             <Text style={styles.emptyText}>No chat history found.</Text>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: Colors.dark.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.dark.outlineVariant,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.dark.surfaceContainerLow,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.outlineVariant,
  },
  headerTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: Colors.dark.onSurface,
  },
  newBtn: {
    backgroundColor: Colors.dark.primary,
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  list: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.surfaceContainerHighest,
  },
  chatItemActive: {
    backgroundColor: Colors.dark.surfaceContainerHigh,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  chatTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.dark.onSurface,
  },
  chatTitleActive: {
    color: Colors.dark.primaryFixed,
  },
  chatDate: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: Colors.dark.onSurfaceVariant,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.dark.onSurfaceVariant,
    marginTop: 40,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  }
});
