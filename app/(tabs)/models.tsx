import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { ModelManager, AVAILABLE_MODELS } from '../../services/ModelManager';
import { Colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ModelsScreen() {
  const insets = useSafeAreaInsets();
  const { activeModelId, setActiveModel } = useAppStore();
  const [downloadedModels, setDownloadedModels] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    checkModels();
  }, [activeModelId]);

  const checkModels = async () => {
    const status: Record<string, boolean> = {};
    for (const model of AVAILABLE_MODELS) {
      status[model.id] = await ModelManager.isModelDownloaded(model.filename);
    }
    setDownloadedModels(status);
  };

  const handleDownload = async (modelId: string) => {
    setDownloadProgress(prev => ({ ...prev, [modelId]: 0 }));
    try {
      await ModelManager.startDownload(modelId, (progress) => {
        setDownloadProgress(prev => ({ ...prev, [modelId]: progress }));
      });
      await checkModels();
      if (!activeModelId) setActiveModel(modelId);
    } catch {
      alert('Download failed');
    } finally {
      setDownloadProgress(prev => { const n = {...prev}; delete n[modelId]; return n; });
    }
  };

  const handleDelete = async (filename: string) => {
     await ModelManager.deleteModel(filename);
     await checkModels();
  }

  const renderModel = (item: typeof AVAILABLE_MODELS[0], index: number) => {
    const isDownloaded = downloadedModels[item.id];
    const isDownloading = downloadProgress[item.id] !== undefined;
    const progress = Math.round((downloadProgress[item.id] || 0) * 100);
    const isActive = activeModelId === item.id;
    
    // Aesthetic assignments based on design
    const tierIcon = index === 0 ? 'terminal' : index === 1 ? 'code-slash' : index === 2 ? 'eye' : 'analytics';
    const isPrimaryColor = index === 2;

    return (
      <View key={item.id} style={[styles.modelCard, isActive && styles.glowActive, !isDownloaded && !isDownloading && !isActive && styles.ghostBorder]}>
        <View style={styles.modelHeader}>
          <View style={[styles.modelIconWrapper, isPrimaryColor ? { backgroundColor: 'rgba(78, 222, 163, 0.1)' } : { backgroundColor: Colors.dark.surfaceContainerHighest }]}>
            <Ionicons name={tierIcon as any} size={24} color={isPrimaryColor ? Colors.dark.primary : Colors.dark.secondary} />
          </View>
          <View style={styles.modelInfo}>
            <View style={styles.modelTitleRow}>
              <Text style={styles.modelTitle}>{item.name}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>GGUF</Text></View>
              {(isDownloaded || isActive) && <Ionicons name="checkmark-circle" size={14} color={Colors.dark.primary} />}
            </View>
            <Text style={styles.modelSubtitle}>{item.approxSize} DISK • {item.memoryReq} RAM • VERIFIED</Text>
          </View>
        </View>
        
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, isDownloading && { color: Colors.dark.primary }]}>
              {isDownloading ? 'DOWNLOADING' : (isDownloaded ? (isActive ? 'ACTIVE' : 'DOWNLOADED') : 'AVAILABLE')}
            </Text>
            <Text style={[styles.progressLabel, isDownloading && { color: Colors.dark.primary }]}>
              {isDownloading ? `${progress}%` : (isDownloaded ? '100%' : '0%')}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${isDownloading ? progress : (isDownloaded ? 100 : 0)}%` }]} />
          </View>
        </View>

        <View style={styles.actionRow}>
          {isDownloading ? (
             <TouchableOpacity style={styles.btnCancel}>
              <Text style={styles.btnCancelText}>CANCEL</Text>
            </TouchableOpacity>
          ) : isDownloaded ? (
            <View style={styles.downloadedActions}>
              <TouchableOpacity 
                style={[styles.btnActivate, isActive && { backgroundColor: Colors.dark.surfaceContainerActive }]} 
                onPress={() => setActiveModel(item.id)}
              >
                <Text style={styles.btnActivateText}>{isActive ? 'ACTIVE' : 'ACTIVATE'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(item.filename)}>
                 <Ionicons name="trash" size={16} color={Colors.dark.onError} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.btnDownload} onPress={() => handleDownload(item.id)}>
              <Text style={styles.btnDownloadText}>DOWNLOAD</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top || 20 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Model Hub</Text>
        </View>
        <Ionicons name="hardware-chip" size={24} color={Colors.dark.primary} />
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* RAM Checker */}
        <View style={styles.ramCheckerSection}>
          <View style={styles.ramInfoCard}>
             <View style={styles.ramHeader}>
               <View>
                 <Text style={styles.labelSmall}>System Entropy</Text>
                 <Text style={styles.ramTitle}>Device Memory</Text>
               </View>
               <View style={styles.ramBadge}><Text style={styles.ramBadgeText}>OPTIMAL</Text></View>
             </View>
             <View style={styles.ramUsageRow}>
               <Text style={styles.ramValue}>4.2<Text style={styles.ramUnit}>GB</Text></Text>
               <Text style={styles.ramMax}>/ 8GB AVAILABLE</Text>
             </View>
             <View style={styles.progressBarBg}>
               <View style={[styles.progressBarFill, { width: '52.5%', backgroundColor: Colors.dark.primaryContainer }]} />
             </View>
          </View>
        </View>

        <View style={styles.dividerRow}>
           <Text style={styles.dividerText}>TIER 01: COMPATIBLE MODELS</Text>
           <View style={styles.dividerLine} />
        </View>

        <View style={styles.modelsGrid}>
          {AVAILABLE_MODELS.map((item, index) => renderModel(item, index))}
        </View>

        <View style={styles.footerInfo}>
          <Ionicons name="information-circle" size={24} color={Colors.dark.primary} />
          <View style={{ flex: 1 }}>
             <Text style={styles.footerTitle}>Storage Advisory</Text>
             <Text style={styles.footerText}>Local models are stored in encrypted partitions. Ensure you have free disk space for decompression. All processing remains on-device.</Text>
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
  scrollContent: { padding: 24, gap: 32 },
  ramCheckerSection: { flexDirection: 'row', gap: 16 },
  ramInfoCard: { flex: 1, backgroundColor: Colors.dark.surfaceContainerLow, padding: 24, borderRadius: 16, gap: 24 },
  ramHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  labelSmall: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary, marginBottom: 4 },
  ramTitle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 24, tracking: -0.5, color: Colors.dark.onBackground },
  ramBadge: { backgroundColor: Colors.dark.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  ramBadgeText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primaryFixed },
  ramUsageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ramValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 40, letterSpacing: -1, color: Colors.dark.onSurface },
  ramUnit: { fontSize: 16, color: Colors.dark.outline, marginLeft: 4 },
  ramMax: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, color: Colors.dark.outline },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dividerText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: Colors.dark.outline },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(60, 74, 66, 0.3)' },
  modelsGrid: { gap: 16 },
  modelCard: { backgroundColor: Colors.dark.surfaceContainerHigh, padding: 20, borderRadius: 12, gap: 16 },
  ghostBorder: { backgroundColor: Colors.dark.surfaceContainerLow, borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.2)' },
  glowActive: { shadowColor: Colors.dark.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 5 },
  modelHeader: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  modelIconWrapper: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  modelInfo: { flex: 1 },
  modelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modelTitle: { fontFamily: 'Manrope_700Bold', fontSize: 16, color: Colors.dark.onBackground },
  badge: { backgroundColor: Colors.dark.secondaryContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 9, color: Colors.dark.onSecondaryContainer },
  modelSubtitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, letterSpacing: 1, color: Colors.dark.outline },
  progressSection: { paddingHorizontal: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, color: Colors.dark.outline },
  progressBarBg: { height: 4, width: '100%', backgroundColor: Colors.dark.surfaceContainerHighest, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 4, backgroundColor: Colors.dark.primary },
  actionRow: { marginTop: 4 },
  btnDownload: { borderWidth: 1, borderColor: Colors.dark.outlineVariant, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnDownloadText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 1, color: Colors.dark.onSurface, textTransform: 'uppercase' },
  btnActivate: { flex: 1, backgroundColor: 'rgba(78, 222, 163, 0.1)', borderWidth: 1, borderColor: 'rgba(78, 222, 163, 0.3)', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnActivateText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 1, color: Colors.dark.primary, textTransform: 'uppercase' },
  btnCancel: { backgroundColor: 'rgba(255, 105, 97, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 105, 97, 0.3)', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  btnCancelText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 11, letterSpacing: 1, color: Colors.dark.error, textTransform: 'uppercase' },
  downloadedActions: { flexDirection: 'row', gap: 12 },
  btnDelete: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6, backgroundColor: 'rgba(255, 105, 97, 0.1)', justifyContent: 'center', alignItems: 'center' },
  footerInfo: { flexDirection: 'row', gap: 16, backgroundColor: Colors.dark.surfaceContainerLowest, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(60, 74, 66, 0.1)' },
  footerTitle: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: Colors.dark.primary, marginBottom: 8 },
  footerText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.dark.outline, lineHeight: 18 }
});
