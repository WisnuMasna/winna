import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from './ThemeContext';

// Cross-platform feedback: a transient toast and a promise-based confirm dialog.
// Replaces React Native's Alert, which is a no-op on web (react-native-web) and jarring on
// native. Works identically everywhere so buttons and confirmations never silently fail.

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface FeedbackContextValue {
  toast: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const toast = useCallback(
    (message: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToastMsg(message);
      Animated.timing(toastOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(
          ({ finished }) => {
            if (finished) setToastMsg(null);
          },
        );
      }, 2400);
    },
    [toastOpacity],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setConfirmState(null);
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastView message={toastMsg} opacity={toastOpacity} />
      <ConfirmDialog options={confirmState} onResolve={settle} />
    </FeedbackContext.Provider>
  );
}

function ToastView({ message, opacity }: { message: string | null; opacity: Animated.Value }) {
  const t = useTheme();
  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 96,
        left: 24,
        right: 24,
        opacity,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: t.colors.text,
          paddingHorizontal: t.spacing(4),
          paddingVertical: t.spacing(3),
          borderRadius: t.radius,
          maxWidth: 460,
        }}
      >
        <Text style={{ color: t.colors.bg, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

function ConfirmDialog({ options, onResolve }: { options: ConfirmOptions | null; onResolve: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Modal visible={options != null} transparent animationType="fade" onRequestClose={() => onResolve(false)}>
      <Pressable
        onPress={() => onResolve(false)}
        style={{ flex: 1, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.surface,
            borderRadius: t.radius,
            borderWidth: 1,
            borderColor: t.colors.border,
            padding: t.spacing(5),
            width: '100%',
            maxWidth: 420,
          }}
        >
          {options ? (
            <>
              <Text style={{ color: t.colors.text, fontSize: 18, fontWeight: '700', marginBottom: t.spacing(2) }}>
                {options.title}
              </Text>
              {options.message ? (
                <Text style={{ color: t.colors.textMuted, fontSize: 15, lineHeight: 21, marginBottom: t.spacing(4) }}>
                  {options.message}
                </Text>
              ) : (
                <View style={{ height: t.spacing(3) }} />
              )}
              <View style={{ flexDirection: 'row', gap: t.spacing(3), justifyContent: 'flex-end' }}>
                <Pressable onPress={() => onResolve(false)} style={{ paddingVertical: t.spacing(2.5), paddingHorizontal: t.spacing(4) }}>
                  <Text style={{ color: t.colors.textMuted, fontWeight: '700' }}>{options.cancelLabel ?? 'Cancel'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onResolve(true)}
                  style={{
                    backgroundColor: options.destructive ? t.colors.danger : t.colors.primary,
                    paddingVertical: t.spacing(2.5),
                    paddingHorizontal: t.spacing(4),
                    borderRadius: t.radius,
                  }}
                >
                  <Text style={{ color: options.destructive ? '#fff' : t.colors.primaryText, fontWeight: '700' }}>
                    {options.confirmLabel ?? 'Confirm'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
