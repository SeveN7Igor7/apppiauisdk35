import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';

type Props = {
  visible: boolean;
  url: string;
  title?: string;
  onClose: () => void;
};

export default function InAppWebView({ visible, url, title = 'Piauí Tickets', onClose }: Props) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [error, setError] = useState(false);

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setLoading(navState.loading);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primary.purple, Colors.primary.purpleSecondary]}
          style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 0) }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.headerButton} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.text.onPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>Piauí Tickets</Text>
            </View>
            <TouchableOpacity style={styles.headerButton} onPress={() => webViewRef.current?.reload()}>
              <MaterialCommunityIcons name="refresh" size={24} color={Colors.text.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.navigationBar}>
            <TouchableOpacity style={[styles.navButton, !canGoBack && styles.navButtonDisabled]} disabled={!canGoBack} onPress={() => webViewRef.current?.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={canGoBack ? Colors.text.onPrimary : Colors.text.disabled} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navButton, !canGoForward && styles.navButtonDisabled]} disabled={!canGoForward} onPress={() => webViewRef.current?.goForward()}>
              <MaterialCommunityIcons name="arrow-right" size={20} color={canGoForward ? Colors.text.onPrimary : Colors.text.disabled} />
            </TouchableOpacity>
            <View style={styles.urlContainer}>
              <MaterialCommunityIcons name="lock" size={14} color={Colors.text.onPrimary} />
              <Text style={styles.urlText} numberOfLines={1}>{currentUrl}</Text>
            </View>
            {loading && <ActivityIndicator size="small" color={Colors.text.onPrimary} style={styles.loadingIndicator} />}
          </View>
        </LinearGradient>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="wifi-off" size={64} color={Colors.text.tertiary} />
            <Text style={styles.errorTitle}>Erro de Conexão</Text>
            <Text style={styles.errorMessage}>Não foi possível carregar a página. Verifique sua conexão e tente novamente.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => webViewRef.current?.reload()}>
              <LinearGradient colors={[Colors.primary.purple, Colors.primary.purpleSecondary]} style={styles.retryButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <MaterialCommunityIcons name="refresh" size={20} color={Colors.text.onPrimary} />
                <Text style={styles.retryButtonText}>Tentar Novamente</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={{ flex: 1 }}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => { setLoading(true); setError(false); }}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
            onHttpError={() => { setError(true); setLoading(false); }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary.purple} />
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            thirdPartyCookiesEnabled
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1 PiauiTicketsApp/1.0"
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral.white },
  header: { paddingBottom: Spacing.sm },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, minHeight: 10 },
  headerButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.md },
  headerTitle: { ...Typography.styles.h3, color: Colors.text.onPrimary, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  headerSubtitle: { ...Typography.styles.caption, color: Colors.text.onPrimary, opacity: 0.8, textAlign: 'center', marginTop: 2 },
  navigationBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.xs },
  navButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  navButtonDisabled: { opacity: 0.5 },
  urlContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, marginHorizontal: Spacing.xs, gap: Spacing.xs },
  urlText: { ...Typography.styles.caption, color: Colors.text.onPrimary, flex: 1 },
  loadingIndicator: { marginLeft: Spacing.xs },
  loadingContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral.white },
  loadingText: { ...Typography.styles.bodyMedium, color: Colors.text.secondary, marginTop: Spacing.md },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl, backgroundColor: Colors.neutral.white },
  errorTitle: { ...Typography.styles.h2, color: Colors.text.primary, fontWeight: Typography.fontWeight.bold, textAlign: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
  errorMessage: { ...Typography.styles.bodyMedium, color: Colors.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: Spacing.xl },
  retryButton: { borderRadius: 25, overflow: 'hidden', elevation: 3 },
  retryButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, gap: 8 },
  retryButtonText: { ...Typography.styles.button, color: Colors.text.onPrimary },
});
