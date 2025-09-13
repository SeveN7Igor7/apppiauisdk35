import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StackNavigator from './src/navigation/StackNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity
} from 'react-native';
import { ref, onValue } from 'firebase/database';
import { databaseSocial } from './src/services/firebaseappdb';
import NetInfo from '@react-native-community/netinfo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import IngressosOffline from './src/screens/IngressosOffline';

export default function App() {
  const [appVisible, setAppVisible] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showOfflineTickets, setShowOfflineTickets] = useState(false);
  const [hasOfflineTickets, setHasOfflineTickets] = useState(false);

  const checkOfflineTickets = async () => {
    try {
      const storedTickets = await AsyncStorage.getItem('offlineTickets');
      setHasOfflineTickets(!!storedTickets);
    } catch (error) {
      console.error('Erro ao verificar ingressos offline:', error);
      setHasOfflineTickets(false);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    checkOfflineTickets();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      const configRef = ref(databaseSocial, 'configgeralapp');
      const unsubscribe = onValue(configRef, async (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAppVisible(data.appvisible);
          setMessage(data.message || 'O aplicativo está temporariamente indisponível.');
        } else {
          setAppVisible(true);
          setMessage(null);
        }
        
        setLoading(false);
      }, (error) => {
        console.error("Erro ao ler configgeralapp do Firebase:", error);
        setAppVisible(true);
        setMessage(null);
        setLoading(false);
      });

      return () => unsubscribe();
    };

    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      {loading ? (
        <View style={styles.container}>
          <Image 
            source={require('./src/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
          <Text style={styles.statusText}>Carregando configurações...</Text>
        </View>
      ) : appVisible === false ? (
        <View style={styles.container}>
          <Image 
            source={require('./src/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.errorTitle}>Aplicativo Indisponível</Text>
          <Text style={styles.errorMessage}>{message}</Text>
        </View>
      ) : showOfflineTickets ? (
        <NavigationContainer>
          <IngressosOffline />
        </NavigationContainer>
      ) : isConnected === false && hasOfflineTickets ? (
        <View style={styles.container}>
          <Image 
            source={require('./src/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.offlineContainer}>
            <MaterialCommunityIcons name="wifi-off" size={64} color="#FFF" />
            <Text style={styles.offlineTitle}>Sem Conexão com a Internet</Text>
            <Text style={styles.offlineMessage}>
              Você está sem acesso à internet no momento. Apenas a funcionalidade de ingressos offline está disponível.
            </Text>
            <TouchableOpacity 
              style={styles.offlineButton}
              onPress={() => setShowOfflineTickets(true)}
            >
              <MaterialCommunityIcons name="ticket-outline" size={24} color="#000" />
              <Text style={styles.offlineButtonText}>Acessar Ingressos Offline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : isConnected === false && !hasOfflineTickets ? (
        <View style={styles.container}>
          <Image 
            source={require('./src/images/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.offlineContainer}>
            <MaterialCommunityIcons name="wifi-off" size={64} color="#FFF" />
            <Text style={styles.offlineTitle}>Sem Conexão com a Internet</Text>
            <Text style={styles.offlineMessage}>
              Verifique sua conexão com a internet e tente novamente.
            </Text>
          </View>
        </View>
      ) : (
        <AuthProvider>
          <NavigationContainer>
            <StackNavigator />
          </NavigationContainer>
        </AuthProvider>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 40,
  },
  loader: {
    marginBottom: 20,
  },
  statusText: {
    color: '#FFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  offlineContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  offlineTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  offlineMessage: {
    color: '#CCC',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  offlineButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
