import { useState, useEffect, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { PermissionsManager, AppPermission } from '../../services/PermissionsManager';
import { ModelManager, ModelConfig } from '../../services/ModelManager';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DownloadedModelInfo {
  model: ModelConfig;
  sizeBytes: number;
}

// Color palette for storage bar segments
const STORAGE_COLORS = [
  Colors.dark.primary,
  Colors.dark.secondary,
  Colors.dark.tertiaryContainer,
  '#FFA726',
  '#AB47BC',
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { isOfflineMode, setOfflineMode, chats } = useAppStore();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
      camera: false, contacts: false, calendar: false, location: false, storage: true
  });
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModelInfo[]>([]);
  const [totalModelBytes, setTotalModelBytes] = useState(0);

  useEffect(() => {
    checkPermissions();
    loadStorageStats();
  }, []);

  const checkPermissions = async () => {
      const perms: AppPermission[] = ['camera', 'contacts', 'calendar', 'location'];
      const current: Record<string, boolean> = { storage: true }; // storage usually true if app is running locally for us
      for (const p of perms) {
          current[p] = await PermissionsManager.checkPermission(p);
      }
      setPermissions(current);
  };

  const loadStorageStats = useCallback(async () => {
    try {
      const models = await ModelManager.getDownloadedModelsWithSizes();
      setDownloadedModels(models);
      const total = models.reduce((sum, m) => sum + m.sizeBytes, 0);
      setTotalModelBytes(total);
    } catch {
      // If we can't read storage stats, that's non-critical
      setDownloadedModels([]);
      setTotalModelBytes(0);
    }
  }, []);

  const togglePermission = async (type: AppPermission) => {
      if (!permissions[type]) {
          const granted = await PermissionsManager.requestPermission(type);
          setPermissions(prev => ({ ...prev, [type]: granted }));
      } else {
          Alert.alert(
            'Revoke Permission',
            'To revoke a permission that has been granted, please use your device\'s OS Settings app.',
            [{ text: 'OK' }]
          );
      }
  };

  const handleClearChatHistory = () => {
    const chatCount = Object.keys(chats).length;
    if (chatCount === 0) {
      Alert.alert('No History', 'There are no chat conversations to clear.');
      return;
    }

    Alert.alert(
      'Clear All Chat History',
      `This will permanently delete ${chatCount} conversation${chatCount !== 1 ? 's' : ''}. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            const store = useAppStore.getState();
            const chatIds = Object.keys(store.chats);
            for (const id of chatIds) {
              store.deleteChat(id);
            }
            // Create a fresh chat after clearing
            store.createChat();
          }
        }
      ]
    );
  };

  // Compute storage bar percentages (normalized to total model bytes)
  const storageBarSegments = downloadedModels.map((info, idx) => ({
    widthPercent: totalModelBytes > 0 ? (info.sizeBytes / totalModelBytes) * 100 : 0,
    color: STORAGE_COLORS[idx % STORAGE_COLORS.length],
    label: `${info.model.name} (${formatBytes(info.sizeBytes)})`,
  }));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <Ionicons name="shield-checkmark" size={24} color={Colors.dark.primary} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        
        {/* Strict Offline Mode */}
        <View style={styles.section}>
          <View style={[styles.card, styles.ghostBorder]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-half" size={20} color={Colors.dark.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Strict Offline Mode</Text>
                  <Text style={styles.cardSubtitle}>MAXIMUM SECURITY PROTOCOL</Text>
                </View>
              </View>
              <Switch 
                value={isOfflineMode} 
                onValueChange={setOfflineMode} 
                trackColor={{ false: Colors.dark.surfaceContainerHighest, true: Colors.dark.primaryContainer }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <Text style={styles.descText}>
              When enabled, the application will terminate all networking sockets and force local-only inference. Model downloads will be blocked. External API calls and telemetry are hardware-blocked.
            </Text>
            {isOfflineMode && (
              <View style={styles.offlineNotice}>
                <Ionicons name="information-circle" size={16} color={Colors.dark.primary} />
                <Text style={styles.offlineNoticeText}>Model downloads are blocked while this is active.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Permissions Bento Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCESS PERMISSIONS</Text>
          <View style={styles.bentoGrid}>
            <TouchableOpacity style={styles.bentoItem} onPress={() => togglePermission('camera')}>
              <View style={styles.bentoRow}>
                <Ionicons name="camera-outline" size={20} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.bentoText}>Camera</Text>
              </View>
              <Ionicons name={permissions.camera ? 'checkbox' : 'square-outline'} size={24} color={permissions.camera ? Colors.dark.primary : Colors.dark.outlineVariant} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.bentoItem} onPress={() => togglePermission('contacts')}>
              <View style={styles.bentoRow}>
                <Ionicons name="people-outline" size={20} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.bentoText}>Contacts</Text>
              </View>
              <Ionicons name={permissions.contacts ? 'checkbox' : 'square-outline'} size={24} color={permissions.contacts ? Colors.dark.primary : Colors.dark.outlineVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoItem} onPress={() => togglePermission('calendar')}>
              <View style={styles.bentoRow}>
                <Ionicons name="calendar-outline" size={20} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.bentoText}>Calendar</Text>
              </View>
              <Ionicons name={permissions.calendar ? 'checkbox' : 'square-outline'} size={24} color={permissions.calendar ? Colors.dark.primary : Colors.dark.outlineVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.bentoItem} onPress={() => togglePermission('location')}>
              <View style={styles.bentoRow}>
                <Ionicons name="location-outline" size={20} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.bentoText}>Location</Text>
              </View>
              <Ionicons name={permissions.location ? 'checkbox' : 'square-outline'} size={24} color={permissions.location ? Colors.dark.primary : Colors.dark.outlineVariant} />
            </TouchableOpacity>

            <View style={styles.bentoItem}>
              <View style={styles.bentoRow}>
                <Ionicons name="folder-outline" size={20} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.bentoText}>Storage</Text>
              </View>
              <Ionicons name="checkbox" size={24} color={Colors.dark.primary} />
            </View>
          </View>
        </View>

        {/* Storage Management - Real Data */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>STORAGE DISTRIBUTION</Text>
          <View style={[styles.storageCard, styles.ghostBorder]}>
            <View style={styles.storageHeaderRow}>
               <View>
                 <Text style={styles.storageTitle}>{formatBytes(totalModelBytes)}</Text>
                 <Text style={styles.storageSubtitle}>
                   {downloadedModels.length > 0 
                     ? `${downloadedModels.length} MODEL${downloadedModels.length !== 1 ? 'S' : ''} ON DISK`
                     : 'NO MODELS DOWNLOADED'}
                 </Text>
               </View>
            </View>

            {/* Storage bar */}
            {downloadedModels.length > 0 ? (
              <>
                <View style={styles.storageBarBg}>
                  {storageBarSegments.map((seg, idx) => (
                    <View key={idx} style={[styles.storageBarSection, { width: `${seg.widthPercent}%`, backgroundColor: seg.color }]} />
                  ))}
                </View>
                <View style={styles.storageLegend}>
                  {storageBarSegments.map((seg, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                      <Text style={styles.legendText}>{seg.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.emptyStorageNotice}>
                <Ionicons name="cloud-download-outline" size={24} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.emptyStorageText}>Download models from the Models tab to see storage usage here.</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Security Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ENCRYPTION & PRIVACY</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionItem} onPress={handleClearChatHistory}>
               <View style={styles.actionLeft}>
                 <Ionicons name="trash-bin-outline" size={24} color={Colors.dark.error} />
                 <View>
                   <Text style={styles.actionTitle}>Clear Chat History</Text>
                   <Text style={styles.actionSubtitle}>DESTRUCTIVE ACTION • {Object.keys(chats).length} CONVERSATIONS</Text>
                 </View>
               </View>
               <Ionicons name="chevron-forward" size={20} color={Colors.dark.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
               <View style={styles.actionLeft}>
                 <Ionicons name="key-outline" size={24} color={Colors.dark.primary} />
                 <View>
                   <Text style={styles.actionTitle}>Rotate Encryption Keys</Text>
                   <Text style={styles.actionSubtitle}>REGENERATE SHA-256 SALTS</Text>
                 </View>
               </View>
               <Ionicons name="chevron-forward" size={20} color={Colors.dark.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Selection */}
        <View style={styles.section}>
           <Text style={styles.sectionHeader}>INTERFACE APPEARANCE</Text>
           <View style={styles.themeSelector}>
              <View style={[styles.themeOptionActive, styles.ghostBorder]}>
                 <Ionicons name="moon" size={24} color={Colors.dark.primary} />
                 <Text style={styles.themeOptionTextActive}>BABU DARK</Text>
              </View>
              <View style={styles.themeOptionInactive}>
                 <Ionicons name="sunny" size={24} color={Colors.dark.onSurfaceVariant} />
                 <Text style={styles.themeOptionTextInactive}>MINIMAL LIGHT</Text>
              </View>
           </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.dark.background,
    borderBottomWidth: 1, borderBottomColor: '#1c1c1c', zIndex: 50,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.dark.primary, letterSpacing: -0.5 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40, gap: 32 },
  section: { gap: 16 },
  sectionHeader: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: Colors.dark.onSurfaceVariant, marginLeft: 4 },
  card: { backgroundColor: Colors.dark.surfaceContainerLow, borderRadius: 12, padding: 24 },
  ghostBorder: { borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.2)' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 8 },
  cardTitle: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.dark.onSurface, marginBottom: 2 },
  cardSubtitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, color: Colors.dark.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', flex: 1, marginBottom: 16 },
  descText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.dark.onSurfaceVariant, lineHeight: 20 },

  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(78, 222, 163, 0.06)',
    borderRadius: 8,
  },
  offlineNoticeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.dark.primary,
  },
  
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  bentoItem: { width: '47%', backgroundColor: Colors.dark.surfaceContainerHigh, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bentoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bentoText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.dark.onSurface },
  
  storageCard: { backgroundColor: Colors.dark.surfaceContainerLowest, borderRadius: 12, padding: 24 },
  storageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  storageTitle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 28, letterSpacing: -1, color: Colors.dark.primary },
  storageSubtitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', color: Colors.dark.onSurfaceVariant, marginTop: 4 },
  storageBarBg: { height: 12, width: '100%', backgroundColor: Colors.dark.surfaceContainerHigh, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  storageBarSection: { height: '100%' },
  storageLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },

  emptyStorageNotice: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  emptyStorageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.dark.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },

  actionsList: { gap: 12 },
  actionItem: { backgroundColor: Colors.dark.surfaceContainerHigh, padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  actionTitle: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.dark.onSurface, marginBottom: 2 },
  actionSubtitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },

  themeSelector: { flexDirection: 'row', gap: 16 },
  themeOptionActive: { flex: 1, backgroundColor: Colors.dark.surfaceContainerLowest, borderColor: Colors.dark.primary, borderWidth: 2, borderRadius: 8, padding: 16, alignItems: 'center', gap: 8 },
  themeOptionTextActive: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },
  themeOptionInactive: { flex: 1, backgroundColor: Colors.dark.surfaceContainerHigh, borderRadius: 8, padding: 16, alignItems: 'center', gap: 8, opacity: 0.5 },
  themeOptionTextInactive: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant }
});
