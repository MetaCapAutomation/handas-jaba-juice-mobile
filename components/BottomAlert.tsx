import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BottomAlertAction {
  label: string;
  onPress: () => void;
  variant?: 'destructive' | 'primary' | 'cancel';
}

export interface BottomAlertProps {
  visible: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  message: string;
  primaryAction: BottomAlertAction;
  secondaryAction?: BottomAlertAction;
  onDismiss?: () => void;
}

export function BottomAlert({
  visible,
  iconName,
  iconColor = '#111111',
  iconBg = '#F3F4F6',
  title,
  message,
  primaryAction,
  secondaryAction,
  onDismiss,
}: BottomAlertProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 300,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const primaryVariant = primaryAction.variant ?? 'primary';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Dimmed backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onDismiss}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }], paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Icon circle */}
        {iconName && (
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>
        )}

        {/* Text */}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {secondaryAction && (
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnSecondary,
                secondaryAction.variant === 'destructive' && styles.btnDestructiveOutline,
              ]}
              onPress={secondaryAction.onPress}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.btnSecondaryText,
                  secondaryAction.variant === 'destructive' && styles.btnDestructiveOutlineText,
                ]}
              >
                {secondaryAction.label}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.btn,
              styles.btnPrimary,
              secondaryAction ? styles.btnPrimaryWithSibling : styles.btnPrimaryFull,
              primaryVariant === 'destructive' && styles.btnDestructive,
            ]}
            onPress={primaryAction.onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>{primaryAction.label}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
      },
      android: {
        elevation: 24,
      },
    }),
  },

  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },

  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 10,
  },

  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    paddingHorizontal: 4,
  },

  buttonRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 10,
  },

  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  btnPrimary: {
    backgroundColor: '#111111',
  },
  btnPrimaryFull: {
    flex: 1,
  },
  btnPrimaryWithSibling: {
    flex: 2,
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  btnSecondary: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  btnDestructiveOutline: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  btnDestructiveOutlineText: {
    color: '#EF4444',
  },
});
