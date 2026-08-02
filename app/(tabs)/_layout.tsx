import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassFill } from '../../src/components/GlassFill';
import { useTheme } from '../../src/theme';

const TABS = [
  { name: 'search', titleKey: 'tabs.search', icon: 'search-outline', iconActive: 'search' },
  { name: 'library', titleKey: 'tabs.library', icon: 'albums-outline', iconActive: 'albums' },
  { name: 'downloads', titleKey: 'tabs.downloads', icon: 'download-outline', iconActive: 'download' },
  { name: 'settings', titleKey: 'tabs.settings', icon: 'options-outline', iconActive: 'options' },
] as const;

export default function TabsLayout() {
  const { t } = useTranslation();
  const th = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: th.accent,
        tabBarInactiveTintColor: th.tabInactive,
        tabBarStyle: [styles.tabBar, { borderTopColor: th.separator }],
        tabBarBackground: () => <GlassFill tint={th.tabBarBg} />,
        sceneStyle: { backgroundColor: th.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.titleKey),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', backgroundColor: 'transparent' },
});
