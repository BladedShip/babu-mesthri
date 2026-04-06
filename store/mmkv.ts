import { createMMKV } from 'react-native-mmkv';

// We initialize an encrypted MMKV instance to securely store 
// local chat history and state. In a full production build, you'd 
// fetch the encryptionKey from expo-secure-store.
export const storage = createMMKV({
  id: 'babu-mesthri-secure-storage',
  encryptionKey: 'offline-agent-secure-key-2026'
});
