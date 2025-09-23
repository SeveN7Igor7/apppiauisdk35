import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StackNavigator from './src/navigation/StackNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { ref, onValue } from 'firebase/database';
import { databaseSocial } from './src/services/firebaseappdb';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import IngressosOffline from './src/screens/IngressosOffline';

export default function App() {
  const [appVisible, setAppVisible] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showOfflineTickets, setShowOfflineTickets] = useState(false);
  const [hasOfflineTickets, setHasOfflineTickets] = useState(false);

  // Verificar se há ingressos offline salvos
  const checkOfflineTickets = async () => {
    try {
      const storedTickets = await AsyncStorage.getItem('offlineTickets');
      setHasOfflineTickets(!!storedTickets);
    } catch (error) {
      console.error('Erro ao verificar ingressos offline:', error);
      setHasOfflineTickets(false);
    }
  };

  // Monitorar conectividade
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    checkOfflineTickets();
    return () => unsubscribe();
  }, []);

  // Ler config geral (app visível/bloqueado)
  useEffect(() => {
    const configRef = ref(databaseSocial, 'configgeralapp');
    const unsubscribe = onValue(
      configRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setAppVisible(data.appvisible);
          setMessage(data.message || 'O aplicativo está temporariamente indisponível.');
        } else {
          setAppVisible(true);
          setMessage(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao ler configgeralapp do Firebase:', error);
        setAppVisible(true);
        setMessage(null);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Tela de loading inicial
  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image source={require('./src/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
        <Text style={styles.statusText}>Carregando...</Text>
      </View>
    );
  }

  // App bloqueado
  if (appVisible === false) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image source={require('./src/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.errorTitle}>Aplicativo Indisponível</Text>
        <Text style={styles.errorMessage}>{message}</Text>
      </View>
    );
  }

  // Mostrar tela de ingressos offline quando solicitado
  if (showOfflineTickets) {
    return (
      <SafeAreaProvider>
        <NavigationContainer>
          <IngressosOffline />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // Sem conexão, mas com ingressos offline disponíveis
  if (isConnected === false && hasOfflineTickets) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image source={require('./src/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.offlineContainer}>
          <MaterialCommunityIcons name="wifi-off" size={64} color="#FFF" />
          <Text style={styles.offlineTitle}>Sem Conexão com a Internet</Text>
          <Text style={styles.offlineMessage}>
            Você está sem acesso à internet no momento. Apenas a funcionalidade de ingressos offline está disponível.
          </Text>
          <TouchableOpacity style={styles.offlineButton} onPress={() => setShowOfflineTickets(true)}>
            <MaterialCommunityIcons name="ticket-outline" size={24} color="#000" />
            <Text style={styles.offlineButtonText}>Acessar Ingressos Offline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Sem conexão e sem ingressos offline salvos
  if (isConnected === false && !hasOfflineTickets) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Image source={require('./src/images/logo.png')} style={styles.logo} resizeMode="contain" />
        <View style={styles.offlineContainer}>
          <MaterialCommunityIcons name="wifi-off" size={64} color="#FFF" />
          <Text style={styles.offlineTitle}>Sem Conexão com a Internet</Text>
          <Text style={styles.offlineMessage}>Verifique sua conexão com a internet e tente novamente.</Text>
        </View>
      </View>
    );
  }

  // App ativo: seguir para navegação normal (Home como rota inicial do StackNavigator)
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar barStyle="light-content" />
          <StackNavigator />
        </NavigationContainer>
      </AuthProvider>
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
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  offlineButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  offlineButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});


