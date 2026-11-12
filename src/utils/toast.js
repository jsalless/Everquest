import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';

let listener = null;

export const toast = {
  success: (message) => listener && listener({ type: 'success', message, id: Date.now() }),
  error: (message) => listener && listener({ type: 'error', message, id: Date.now() }),
  info: (message) => listener && listener({ type: 'info', message, id: Date.now() }),
  warn: (message) => listener && listener({ type: 'warn', message, id: Date.now() }),
};

const COLORS = {
  success: '#07BC0C',
  error: '#E74C3C',
  info: '#3498DB',
  warn: '#F1C40F',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    listener = (newToast) => {
      setToasts((prev) => [newToast, ...prev.slice(0, 3)]);
      setTimeout(() => {
        removeToast(newToast.id);
      }, 3500);
    };
    return () => {
      listener = null;
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((item) => (
        <TouchableOpacity
          key={item.id}
          activeOpacity={0.9}
          onPress={() => removeToast(item.id)}
          style={[
            styles.toastBox,
            { backgroundColor: COLORS[item.type] || COLORS.info },
          ]}
        >
          <Text style={styles.toastText}>{item.message}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    right: 16,
    left: 16,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  toastBox: {
    minWidth: 250,
    maxWidth: 360,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
  },
});

