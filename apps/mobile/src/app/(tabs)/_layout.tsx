import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, space } from '@/theme';

const LABELS: Record<string, string> = { index: 'Check', news: 'News' };

/** A text tab bar: the active tab sits in a soft pill, the other is muted text. */
function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + space.sm }]}>
      {state.routes.map((route, i) => {
        const active = state.index === i;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}
          >
            <View style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.label, { color: active ? color.ink : color.muted }]}>{LABELS[route.name] ?? route.name}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.paper } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="news" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: color.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.hairline,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: space.sm },
  pill: { paddingVertical: 10, paddingHorizontal: 28, borderRadius: 22, overflow: 'hidden' },
  pillActive: { backgroundColor: color.pillActive },
  label: { fontFamily: font.sansMedium, fontSize: 16 },
});
