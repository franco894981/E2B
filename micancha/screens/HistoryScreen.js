import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

export default function HistoryScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.emptyText}>Todavía no tienes entrenamientos registrados</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Entrenar')}
          accessibilityLabel="Nuevo entrenamiento"
        >
          <Text style={styles.buttonText}>Nuevo entrenamiento</Text>
        </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F97316',
    marginBottom: 32,
  },
  emptyText: {
    fontSize: 17,
    color: '#374151',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#F97316',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
