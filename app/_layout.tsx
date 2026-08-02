import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { bootstrapApp } from '../src/services/bootstrap';
import { usePlayerStore } from '../src/stores/playerStore';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const th = useTheme();
  useEffect(() => {
    bootstrapApp()
      .then(() => usePlayerStore.getState().restoreQueue())
      .catch(() => {});
  }, []);
  return (
    // Bottom sheets read insets.bottom to clear the system navigation bar
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={[styles.root, { backgroundColor: th.bg }]}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: th.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="player" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
