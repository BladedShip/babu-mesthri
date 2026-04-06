import { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { PermissionsManager, AppPermission } from '../../services/PermissionsManager';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { isOfflineMode, setOfflineMode } = useAppStore();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
      camera: false, contacts: false, calendar: false, storage: true
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
      const perms: AppPermission[] = ['camera', 'contacts', 'calendar'];
      const current: Record<string, boolean> = { storage: true }; // storage usually true if app is running locally for us
      for (const p of perms) {
          current[p] = await PermissionsManager.checkPermission(p);
      }
      setPermissions(current);
  };

  const togglePermission = async (type: AppPermission) => {
      if (!permissions[type]) {
          const granted = await PermissionsManager.requestPermission(type);
          setPermissions(prev => ({ ...prev, [type]: granted }));
      } else {
          alert('To revoke a permission natively, please use your device OS Settings.');
      }
  };

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
              When enabled, the application will terminate all networking sockets and force local-only inference. External API calls and telemetry are hardware-blocked.
            </Text>
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

            <View style={styles.bentoItem}>
              <View style={styles.bentoRow}>
                <Ionicons name="folder-outline" size={20} color={Colors.dark.onSurfaceVariant} />
                <Text style={styles.bentoText}>Storage</Text>
              </View>
              <Ionicons name="checkbox" size={24} color={Colors.dark.primary} />
            </View>
          </View>
        </View>

        {/* Storage Management */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>STORAGE DISTRIBUTION</Text>
          <View style={[styles.storageCard, styles.ghostBorder]}>
            <View style={styles.storageHeaderRow}>
               <View>
                 <Text style={styles.storageTitle}>14.2 GB</Text>
                 <Text style={styles.storageSubtitle}>ALLOCATED TO LOCAL MODELS</Text>
               </View>
               <View style={{ alignItems: 'flex-end' }}>
                 <Text style={styles.storageTotal}>System Total: 256 GB</Text>
                 <Text style={styles.storagePercent}>5.5% utilized</Text>
               </View>
            </View>
            <View style={styles.storageBarBg}>
               <View style={[styles.storageBarSection, { width: '45%', backgroundColor: Colors.dark.primary }]} />
               <View style={[styles.storageBarSection, { width: '20%', backgroundColor: Colors.dark.secondary }]} />
               <View style={[styles.storageBarSection, { width: '10%', backgroundColor: Colors.dark.tertiaryContainer }]} />
            </View>
            <View style={styles.storageLegend}>
               <View style={styles.legendItem}>
                 <View style={[styles.legendDot, { backgroundColor: Colors.dark.primary }]} />
                 <Text style={styles.legendText}>Llama-3-8B (8.4GB)</Text>
               </View>
               <View style={styles.legendItem}>
                 <View style={[styles.legendDot, { backgroundColor: Colors.dark.secondary }]} />
                 <Text style={styles.legendText}>Mistral-7B (4.1GB)</Text>
               </View>
               <View style={styles.legendItem}>
                 <View style={[styles.legendDot, { backgroundColor: Colors.dark.tertiaryContainer }]} />
                 <Text style={styles.legendText}>Cache (1.7GB)</Text>
               </View>
            </View>
          </View>
        </View>
        
        {/* Security Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ENCRYPTION & PRIVACY</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionItem} onPress={() => alert('Chat history cleared.')}>
               <View style={styles.actionLeft}>
                 <Ionicons name="trash-bin-outline" size={24} color={Colors.dark.error} />
                 <View>
                   <Text style={styles.actionTitle}>Clear Chat History</Text>
                   <Text style={styles.actionSubtitle}>DESTRUCTIVE ACTION</Text>
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
                 <Text style={styles.themeOptionTextActive}>GUARDIAN DARK</Text>
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
  
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  bentoItem: { width: '47%', backgroundColor: Colors.dark.surfaceContainerHigh, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bentoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bentoText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.dark.onSurface },
  
  storageCard: { backgroundColor: Colors.dark.surfaceContainerLowest, borderRadius: 12, padding: 24 },
  storageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 },
  storageTitle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 28, letterSpacing: -1, color: Colors.dark.primary },
  storageSubtitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', color: Colors.dark.onSurfaceVariant, marginTop: 4 },
  storageTotal: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.dark.onSurface },
  storagePercent: { fontFamily: 'Inter_400Regular', fontSize: 10, fontStyle: 'italic', color: Colors.dark.onSurfaceVariant, marginTop: 4 },
  storageBarBg: { height: 12, width: '100%', backgroundColor: Colors.dark.surfaceContainerHigh, borderRadius: 6, overflow: 'hidden', flexDirection: 'row' },
  storageBarSection: { height: '100%' },
  storageLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },

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
