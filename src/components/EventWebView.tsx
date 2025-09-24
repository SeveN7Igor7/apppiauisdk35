import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';

const { width, height } = Dimensions.get('window');

interface EventWebViewProps {
  visible: boolean;
  eventId: string;
  nomeUrl?: string;
  eventName: string;
  onClose: () => void;
}

const EventWebView: React.FC<EventWebViewProps> = ({
  visible,
  eventId,
  nomeUrl,
  eventName,
  onClose,
}) => {
  console.log('[EventWebView] ===== DEPURAÇÃO COMPONENTE =====');
  console.log('[EventWebView] Props recebidas:');
  console.log('[EventWebView] - visible:', visible);
  console.log('[EventWebView] - eventId:', eventId);
  console.log('[EventWebView] - nomeUrl:', nomeUrl);
  console.log('[EventWebView] - eventName:', eventName);
  console.log('[EventWebView] ===== FIM DEPURAÇÃO PROPS =====');

  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();

  const baseUrl = `https://piauitickets.com/comprar/${eventId}/${nomeUrl || ''}`;
  
  console.log('[EventWebView] URL construída:', baseUrl);

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    setCurrentUrl(navState.url);
    setLoading(navState.loading);
  };

  const handleGoBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleGoForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
      setError(false);
    }
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.primary.purple, Colors.primary.purpleSecondary]}
      style={[
        styles.header,
        { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 0) }
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.headerContent}>
        {/* Botão Fechar */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="close" 
            size={24} 
            color={Colors.text.onPrimary} 
          />
        </TouchableOpacity>

        {/* Título do Evento */}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {eventName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Piauí Tickets
          </Text>
        </View>

        {/* Botão Refresh */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="refresh" 
            size={24} 
            color={Colors.text.onPrimary} 
          />
        </TouchableOpacity>
      </View>

      {/* Barra de Navegação */}
      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={handleGoBack}
          disabled={!canGoBack}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={20} 
            color={canGoBack ? Colors.text.onPrimary : Colors.text.disabled} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          onPress={handleGoForward}
          disabled={!canGoForward}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="arrow-right" 
            size={20} 
            color={canGoForward ? Colors.text.onPrimary : Colors.text.disabled} 
          />
        </TouchableOpacity>

        <View style={styles.urlContainer}>
          <MaterialCommunityIcons 
            name="lock" 
            size={14} 
            color={Colors.text.onPrimary} 
          />
          <Text style={styles.urlText} numberOfLines={1}>
            {currentUrl || baseUrl}
          </Text>
        </View>

        {loading && (
          <ActivityIndicator 
            size="small" 
            color={Colors.text.onPrimary} 
            style={styles.loadingIndicator}
          />
        )}
      </View>
    </LinearGradient>
  );

  const renderErrorView = () => (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons 
        name="wifi-off" 
        size={64} 
        color={Colors.text.tertiary} 
      />
      <Text style={styles.errorTitle}>Erro de Conexão</Text>
      <Text style={styles.errorMessage}>
        Não foi possível carregar a página. Verifique sua conexão com a internet e tente novamente.
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={handleRefresh}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary.purple, Colors.primary.purpleSecondary]}
          style={styles.retryButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialCommunityIcons 
            name="refresh" 
            size={20} 
            color={Colors.text.onPrimary} 
          />
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.container}>
        {renderHeader()}
        
        {error ? (
          renderErrorView()
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: baseUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={handleLoadStart}
            onLoadEnd={handleLoadEnd}
            onError={handleError}
            onHttpError={handleError}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator 
                  size="large" 
                  color={Colors.primary.purple} 
                />
                <Text style={styles.loadingText}>Carregando evento...</Text>
              </View>
            )}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            thirdPartyCookiesEnabled={true}
            userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1 PiauiTicketsApp/1.0"
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral.white,
  },
  header: {
    paddingBottom: Spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    minHeight: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  headerTitle: {
    ...Typography.styles.h3,
    color: Colors.text.onPrimary,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...Typography.styles.caption,
    color: Colors.text.onPrimary,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  urlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.xs,
    gap: Spacing.xs,
  },
  urlText: {
    ...Typography.styles.caption,
    color: Colors.text.onPrimary,
    flex: 1,
  },
  loadingIndicator: {
    marginLeft: Spacing.xs,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral.white,
  },
  loadingText: {
    ...Typography.styles.bodyMedium,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.neutral.white,
  },
  errorTitle: {
    ...Typography.styles.h2,
    color: Colors.text.primary,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  errorMessage: {
    ...Typography.styles.bodyMedium,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: Colors.neutral.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.styles.bodyMedium,
    color: Colors.text.onPrimary,
    fontWeight: Typography.fontWeight.semiBold,
  },
});

export default EventWebView;

