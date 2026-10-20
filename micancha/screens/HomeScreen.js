import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mi Cancha</Text>
        <Text style={styles.subtitle}>Registra tus entrenamientos y sigue tu progreso</Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Entrenar')}
          accessibilityLabel="Nuevo entrenamiento"
        >
          <Text style={styles.buttonText}>Nuevo entrenamiento</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Historial')}
          accessibilityLabel="Ver historial"
        >
          <Text style={styles.secondaryButtonText}>Ver historial</Text>
        </TouchableOpacity>

        <Text style={styles.message}>Tu progreso empieza con tu primer entrenamiento</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F97316',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#F97316',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginBottom: 16,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F97316',
    marginBottom: 48,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F97316',
    fontSize: 18,
    fontWeight: '600',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 'auto',
    marginBottom: 32,
  },
});
