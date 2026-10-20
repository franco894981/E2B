import React, { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { NavigationContainer, createBottomTabNavigator, useNavigationState, useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './screens/HomeScreen';
import NewWorkoutScreen from './screens/NewWorkoutScreen';
import HistoryScreen from './screens/HistoryScreen';

const Tab = createBottomTabNavigator();

function BackHandlerController() {
  const navigation = useNavigation();
  const state = useNavigationState((s) => s);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!state) return false;
        const currentRouteName = state.routes[state.index]?.name;
        if (currentRouteName && currentRouteName !== 'Inicio') {
          navigation.navigate('Inicio');
          return true;
        }
        return false;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [state, navigation])
  );

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#FFF7ED" />
        <BackHandlerController />
        <Tab.Navigator
          initialRouteName="Inicio"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: '#F97316',
            tabBarInactiveTintColor: '#6B7280',
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
              marginBottom: 4,
            },
            tabBarIcon: ({ color, size }) => {
              let iconName;
              if (route.name === 'Inicio') iconName = 'home-outline';
              else if (route.name === 'Entrenar') iconName = 'basketball-outline';
              else if (route.name === 'Historial') iconName = 'time-outline';
              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopColor: '#F3F4F6',
              borderTopWidth: 1,
              height: 64,
              paddingBottom: 6,
              paddingTop: 6,
            },
          })}
        >
          <Tab.Screen
            name="Inicio"
            component={HomeScreen}
            options={{ title: 'Inicio' }}
            listeners={({ navigation }) => ({
              tabPress: (e) => {
                e.preventDefault();
                navigation.navigate('Inicio');
              },
            })}
          />
          <Tab.Screen
            name="Entrenar"
            component={NewWorkoutScreen}
            options={{ title: 'Entrenar' }}
          />
          <Tab.Screen
            name="Historial"
            component={HistoryScreen}
            options={{ title: 'Historial' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
