import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleContinue = () => {
    router.replace('/(tabs)/models');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Guardian</Text>
        </View>
        <Ionicons name="shield-checkmark" size={24} color={Colors.dark.primary} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.introSection}>
          <Text style={styles.labelSmall}>System Initialization</Text>
          <Text style={styles.headlineTitle}>Hardware Authentication</Text>
          <Text style={styles.subtitleText}>Optimizing the neural engine for your specific device architecture.</Text>
        </View>

        {/* Scanning State Card */}
        <View style={styles.scanningCard}>
          <View style={styles.scannerCircle}>
            <ActivityIndicator size="large" color={Colors.dark.primary} style={{ transform: [{ scale: 1.5 }] }} />
            <View style={{ position: 'absolute' }}>
              <Ionicons name="hardware-chip" size={32} color={Colors.dark.primary} />
            </View>
          </View>
          <View style={styles.scanningTextWrapper}>
            <Text style={styles.scanningLabel}>Scanning Hardware...</Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, { opacity: 1 }]} />
              <View style={[styles.dot, { opacity: 0.5 }]} />
              <View style={[styles.dot, { opacity: 0.2 }]} />
            </View>
          </View>
        </View>

        {/* Detected Metrics Bento */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="apps" size={16} color={Colors.dark.primary} />
              <Text style={styles.metricLabel}>System Memory</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>12.4 GB</Text>
              <Text style={styles.metricDesc}>AVAILABLE LPDDR5X</Text>
            </View>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Ionicons name="speedometer" size={16} color={Colors.dark.primary} />
              <Text style={styles.metricLabel}>Neural Engine</Text>
            </View>
            <View>
              <Text style={styles.metricValue}>Octa-Core</Text>
              <Text style={styles.metricDesc}>NPU OPTIMIZED</Text>
            </View>
          </View>
        </View>

        {/* Recommendation Section */}
        <View style={[styles.recCard, styles.ghostBorder]}>
          <Ionicons name="star" size={100} color="rgba(255,255,255,0.05)" style={styles.bgIcon} />
          
          <View style={styles.recBadge}>
             <Text style={styles.recBadgeText}>Recommended</Text>
          </View>
          
          <View style={{ marginTop: 12 }}>
             <Text style={styles.recTitle}>Guardian-7B (Quantum)</Text>
             <Text style={styles.recText}>
               Based on your <Text style={{ color: Colors.dark.onSurface, fontWeight: 'bold' }}>12GB RAM</Text>, the 7-billion parameter model offers the perfect balance of reasoning speed and private accuracy.
             </Text>
          </View>
          
          <View style={styles.statsGrid}>
             <View style={styles.statBox}>
               <Text style={styles.statLabel}>SPEED</Text>
               <Text style={styles.statValue}>~45 t/s</Text>
             </View>
             <View style={styles.statBox}>
               <Text style={styles.statLabel}>ACCURACY</Text>
               <Text style={styles.statValue}>HIGH</Text>
             </View>
             <View style={styles.statBox}>
               <Text style={styles.statLabel}>VRAM</Text>
               <Text style={styles.statValue}>4.2 GB</Text>
             </View>
          </View>
        </View>

        {/* Privacy Badge */}
        <View style={styles.privacyBadge}>
           <Ionicons name="shield-checkmark" size={24} color={Colors.dark.primary} />
           <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>Privacy Guarantee</Text>
              <Text style={styles.privacyText}>No data leaves this device. Processing is 100% local.</Text>
           </View>
        </View>
      </ScrollView>

      {/* Action Area */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue to Model Hub</Text>
          <Ionicons name="chevron-forward" size={24} color={Colors.dark.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.sessionText}>Encrypted Session ID: 8F2-UX9-P02</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16, backgroundColor: Colors.dark.background,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: Colors.dark.primary, letterSpacing: -0.5 },
  
  scrollArea: { flex: 1 },
  scrollContent: { padding: 24, gap: 32 },
  
  introSection: { gap: 8 },
  labelSmall: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },
  headlineTitle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 32, letterSpacing: -1, color: Colors.dark.onBackground },
  subtitleText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurfaceVariant, lineHeight: 20 },
  
  scanningCard: { backgroundColor: Colors.dark.surfaceContainerLow, borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scannerCircle: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  scanningTextWrapper: { alignItems: 'center', zIndex: 10 },
  scanningLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurface },
  loadingDots: { flexDirection: 'row', gap: 4, marginTop: 12, justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.dark.primary },
  
  metricsGrid: { flexDirection: 'row', gap: 16 },
  metricCard: { flex: 1, backgroundColor: Colors.dark.surfaceContainerHigh, padding: 20, borderRadius: 12, gap: 16 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metricLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.onSurfaceVariant },
  metricValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 24, color: Colors.dark.onSurface },
  metricDesc: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, color: 'rgba(78, 222, 163, 0.8)', marginTop: 4 },
  
  recCard: { backgroundColor: Colors.dark.surfaceContainerLowest, borderRadius: 16, padding: 24, overflow: 'hidden' },
  ghostBorder: { borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.2)' },
  bgIcon: { position: 'absolute', top: -10, right: -10, transform: [{ rotate: '15deg' }] },
  recBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  recBadgeText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary },
  recTitle: { fontFamily: 'Manrope_700Bold', fontSize: 20, letterSpacing: -0.5, color: Colors.dark.onSurface },
  recText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.dark.onSurfaceVariant, lineHeight: 22, marginTop: 8 },
  statsGrid: { flexDirection: 'row', marginTop: 16, gap: 8 },
  statBox: { flex: 1, backgroundColor: Colors.dark.surfaceContainerHigh, borderRadius: 8, padding: 8, alignItems: 'center' },
  statLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, color: Colors.dark.onSurfaceVariant, marginBottom: 4 },
  statValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.dark.primary },
  
  privacyBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  privacyTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.dark.onSurface },
  privacyText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.dark.onSurfaceVariant, marginTop: 2 },
  
  footer: { padding: 24, paddingBottom: 40, gap: 16 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.dark.primary, paddingVertical: 16, borderRadius: 12, gap: 8 },
  continueText: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.dark.onPrimary },
  sessionText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: Colors.dark.onSurfaceVariant, textAlign: 'center', opacity: 0.6 }
});
