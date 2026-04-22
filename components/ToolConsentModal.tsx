import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { Colors } from '@/constants/theme';
import { BlurView } from 'expo-blur';

export default function ToolConsentModal() {
  const pendingConsent = useAppStore(state => state.pendingToolConsent);

  if (!pendingConsent) return null;

  const handleDecision = (decision: 'allow_once' | 'allow_always' | 'deny') => {
    pendingConsent.resolve(decision);
  };

  const renderParams = () => {
    const params = pendingConsent.params;
    if (!params || Object.keys(params).length === 0) return null;

    return (
      <View style={styles.paramsContainer}>
        <Text style={styles.paramsTitle}>Parameters:</Text>
        {Object.entries(params).map(([key, value]) => (
          <View key={key} style={styles.paramRow}>
            <Text style={styles.paramKey}>{key}:</Text>
            <Text style={styles.paramValue} numberOfLines={2}>{String(value)}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal transparent visible={!!pendingConsent} animationType="fade">
      <View style={styles.overlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
        )}
        
        <View style={styles.modalCard}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.dark.primary} />
          </View>

          <Text style={styles.title}>Tool Execution Request</Text>
          <Text style={styles.subtitle}>
            Babu Mesthri wants to use <Text style={styles.toolName}>{pendingConsent.toolName}</Text>.
          </Text>

          {renderParams()}

          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.btnAllowOnce} 
              onPress={() => handleDecision('allow_once')}
            >
              <Text style={styles.btnAllowOnceText}>Allow Once</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnAllowAlways} 
              onPress={() => handleDecision('allow_always')}
            >
              <Text style={styles.btnAllowAlwaysText}>Allow Always</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnDeny} 
              onPress={() => handleDecision('deny')}
            >
              <Text style={styles.btnDenyText}>Deny</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.dark.surfaceContainerHigh,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.outlineVariant,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(78, 222, 163, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    color: Colors.dark.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.dark.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  toolName: {
    fontFamily: 'SpaceGrotesk_500Medium',
    color: Colors.dark.primary,
  },
  paramsContainer: {
    width: '100%',
    backgroundColor: Colors.dark.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  paramsTitle: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 12,
    color: Colors.dark.onSurfaceVariant,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paramRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paramKey: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.dark.onSurface,
    width: 100,
  },
  paramValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.dark.primary,
    flex: 1,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  btnAllowOnce: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
    alignItems: 'center',
  },
  btnAllowOnceText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
    color: Colors.dark.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnAllowAlways: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
  },
  btnAllowAlwaysText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
    color: Colors.dark.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnDeny: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 180, 171, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.3)',
    alignItems: 'center',
  },
  btnDenyText: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 14,
    color: Colors.dark.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
