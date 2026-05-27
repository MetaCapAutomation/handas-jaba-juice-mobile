import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform, BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomAlert } from './BottomAlert';

interface Props {
  visible: boolean;
  authorizationUrl: string;
  reference: string;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

const APP_SCHEME = 'handasjabajuice';

// Injected into WebView to capture Paystack InlineJS postMessage events
const PAYSTACK_JS = `
(function() {
  var handler = function(event) {
    if (!event || !event.data) return;
    try {
      var d = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (d && d.event && window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ psEvent: d.event, ref: (d.data && d.data.reference) || '' })
        );
      }
    } catch(e) {}
  };
  window.addEventListener('message', handler, false);
  true;
})();
`;

export function PaymentWebViewModal({ visible, authorizationUrl, reference, onSuccess, onCancel }: Props) {
  const [pageLoading, setPageLoading] = useState(true);
  const [showCancelAlert, setShowCancelAlert] = useState(false);
  const successFired = useRef(false);

  // Reset state each time modal opens with a new URL
  useEffect(() => {
    if (visible) {
      setPageLoading(true);
      successFired.current = false;
      setShowCancelAlert(false);
    }
  }, [visible, authorizationUrl]);

  // Intercept Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancelPress();
      return true; // Prevent default navigation
    });
    return () => sub.remove();
  }, [visible]);

  const fireSuccess = useCallback((ref: string) => {
    if (successFired.current) return; // Guard against duplicate calls
    successFired.current = true;
    onSuccess(ref || reference);
  }, [onSuccess, reference]);

  const dismissAlert = useCallback(() => setShowCancelAlert(false), []);

  const handleCancelPress = useCallback(() => {
    setShowCancelAlert(true);
  }, []);

  // Primary success detection: intercept custom-scheme redirect from Paystack
  const handleShouldStartLoad = useCallback(({ url }: { url: string }) => {
    if (!url) return true;

    if (url.startsWith(`${APP_SCHEME}://`)) {
      // Parse query params from callback URL
      // e.g. handasjabajuice://payment-callback?reference=TXN_xxx&status=success
      try {
        const qs = url.includes('?') ? url.split('?')[1] : '';
        const params: Record<string, string> = {};
        qs.split('&').forEach((pair) => {
          const idx = pair.indexOf('=');
          if (idx > 0) {
            params[decodeURIComponent(pair.slice(0, idx))] = decodeURIComponent(pair.slice(idx + 1));
          }
        });
        const ref = params.reference || params.trxref || reference;
        fireSuccess(ref);
      } catch {
        fireSuccess(reference);
      }
      return false; // Block WebView from trying to navigate to custom scheme
    }
    return true;
  }, [fireSuccess, reference]);

  // Also watch navigation state changes (catches cases onShouldStartLoad misses on Android)
  const handleNavigationChange = useCallback((state: WebViewNavigation) => {
    if (state.url?.startsWith(`${APP_SCHEME}://`)) {
      handleShouldStartLoad({ url: state.url });
    }
  }, [handleShouldStartLoad]);

  // Secondary success detection: capture Paystack InlineJS postMessage events
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const { psEvent, ref } = JSON.parse(event.nativeEvent.data);
      // Paystack fires 'success' event when payment completes
      if (psEvent === 'success' || psEvent === 'payment:success' || psEvent === 'verified') {
        fireSuccess(ref || reference);
      }
    } catch {}
  }, [fireSuccess, reference]);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancelPress}
        statusBarTranslucent={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCancelPress} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <View style={styles.lockRow}>
                <Ionicons name="lock-closed" size={11} color="#F5317F" />
                <Text style={styles.secureText}>Secure Checkout</Text>
              </View>
            </View>

            <View style={styles.sslBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#F5317F" />
              <Text style={styles.sslText}>SSL</Text>
            </View>
          </View>

          {/* ── Progress bar (while page loads) ── */}
          {pageLoading && (
            <View style={styles.progressBar}>
              <View style={styles.progressFill} />
            </View>
          )}

          {/* ── WebView ── */}
          <View style={styles.webViewWrap}>
            <WebView
              source={{ uri: authorizationUrl }}
              onLoadStart={() => setPageLoading(true)}
              onLoadEnd={() => setPageLoading(false)}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onNavigationStateChange={handleNavigationChange}
              injectedJavaScript={PAYSTACK_JS}
              onMessage={handleMessage}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              mixedContentMode="compatibility"
              // Use a standard mobile user agent so Paystack serves mobile-optimised UI
              userAgent={
                Platform.OS === 'android'
                  ? 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
                  : 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
              }
              style={styles.webView}
            />

            {/* Loading overlay — shown while initial page renders */}
            {pageLoading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <View style={styles.loadingCard}>
                  <View style={styles.paystackLogoWrap}>
                    <Ionicons name="card" size={32} color="#F5317F" />
                  </View>
                  <ActivityIndicator size="large" color="#F5317F" style={{ marginBottom: 14 }} />
                  <Text style={styles.loadingTitle}>Opening secure payment</Text>
                  <Text style={styles.loadingSubtitle}>Your connection is encrypted</Text>
                  <View style={styles.encryptionRow}>
                    <Ionicons name="lock-closed" size={11} color="#9CA3AF" />
                    <Text style={styles.encryptionText}>256-bit SSL encryption</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

        </SafeAreaView>
      </Modal>

      {/* Cancel confirmation sheet — rendered outside the main Modal so it appears on top */}
      <BottomAlert
        visible={showCancelAlert}
        iconName="card-outline"
        iconColor="#F5317F"
        iconBg="#FFF0F7"
        title="Leave Checkout?"
        message="Your order hasn't been placed yet. Your cart will be saved and you can complete payment anytime."
        primaryAction={{ label: 'Continue Paying', variant: 'primary', onPress: dismissAlert }}
        secondaryAction={{ label: 'Leave Checkout', variant: 'destructive', onPress: () => { setShowCancelAlert(false); onCancel(); } }}
        onDismiss={dismissAlert}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  secureText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111111',
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0F7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDCDE5',
  },
  sslText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C4165F',
  },

  // Progress bar
  progressBar: {
    height: 3,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '60%',
    backgroundColor: '#F5317F',
    borderRadius: 2,
  },

  // WebView
  webViewWrap: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  paystackLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FDCDE5',
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  encryptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  encryptionText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
