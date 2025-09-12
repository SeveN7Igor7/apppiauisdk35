
import React, { useEffect, useState, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  Platform,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Linking,
  Alert,
  StatusBar,
  StyleSheet,
  FlatList,
} from 'react-native';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../services/firebase';
import { databaseSocial } from '../services/firebaseappdb';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Spacing } from '../constants/Spacing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EventWebView from '../components/EventWebView';

const { width, height } = Dimensions.get('window');

type Evento = {
  id: string;
  nomeevento: string;
  nomeurl?: string;
  imageurl: string;
  eventvisible: boolean;
  datainicio?: string;
  aberturaportas?: string;
  vendaaberta: { vendaaberta: boolean; mensagem: string };
  categoria?: string; // Adicionado para filtro de categoria
};

type VibeData = {
  media: number;
  count: number;
};

export default function Home() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [vibes, setVibes] = useState<Record<string, VibeData>>({});
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todos'); // Estado para filtro de categoria
  const [headerHeight, setHeaderHeight] = useState(0); // Novo estado para a altura do cabeçalho
  
  // Estados para o WebView
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);

  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Categorias para a barra de rolagem
  const categorias = [
    { id: 'todos', nome: 'Todos', icone: 'view-grid' },
    { id: 'shows', nome: 'Shows', icone: 'music' },
    { id: 'festas', nome: 'Festas', icone: 'party-popper' },
    { id: 'teatro', nome: 'Teatro', icone: 'theater' },
    { id: 'esportes', nome: 'Esportes', icone: 'soccer' },
    { id: 'cultura', nome: 'Cultura', icone: 'palette' },
  ];

  // Função para navegar para a tela de Ingressos
  const handleNavigateToIngressos = () => {
    navigation.navigate('Ingressos' as never);
  };

  // Função para navegar para a tela de Perfil
  const handleNavigateToPerfil = () => {
    navigation.navigate('Perfil' as never);
  };

  // Função para abrir o WebView com detalhes do evento
  const handleVerDetalhes = (evento: Evento) => {
    console.log('[Home] ===== DEPURAÇÃO WEBVIEW =====');
    console.log('[Home] Função handleVerDetalhes chamada');
    console.log('[Home] Evento:', evento.nomeevento);
    console.log('[Home] ID do evento:', evento.id);
    console.log('[Home] Nome URL:', evento.nomeurl);
    console.log('[Home] Estado atual webViewVisible:', webViewVisible);
    console.log('[Home] Estado atual selectedEvent:', selectedEvent?.nomeevento || 'null');
    
    setSelectedEvent(evento);
    setWebViewVisible(true);
    
    console.log('[Home] Estados atualizados - webViewVisible: true, selectedEvent:', evento.nomeevento);
    console.log('[Home] ===== FIM DEPURAÇÃO =====');
  };

  // Função para fechar o WebView
  const handleCloseWebView = () => {
    console.log('[Home] Fechando WebView');
    setWebViewVisible(false);
    setSelectedEvent(null);
  };

  // Efeito para carregar eventos do Firebase
  useEffect(() => {
    console.log('[Firebase] Tentando carregar eventos...');
    const eventosRef = ref(database, 'eventos/');
    const unsubscribe = onValue(eventosRef, (snapshot) => {
      const data = snapshot.val();
      const lista: Evento[] = [];

      if (data) {
        Object.keys(data).forEach((id) => {
          const evento = data[id];
          if (evento.eventvisible) {
            lista.push({
              id,
              nomeevento: evento.nomeevento || 'Sem nome',
              imageurl: evento.imageurl || '',
              nomeurl: evento.nomeurl,
              eventvisible: true,
              datainicio: evento.datainicio,
              aberturaportas: evento.aberturaportas,
              vendaaberta: evento.vendaaberta || { vendaaberta: false, mensagem: '' },
              categoria: evento.categoria || 'outros', // Garante que a categoria existe
            });
          }
        });
      }

      setEventos(lista);
      setLoading(false);
      console.log('[Firebase] Eventos carregados com sucesso:', lista.length);
    }, (error) => {
      console.error('[Firebase] Erro ao carregar eventos do Firebase:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Função que calcula média considerando só avaliações da última 1 hora
  async function calcularMediaVibe(eventId: string): Promise<VibeData | null> {
    try {
      const snapshot = await get(ref(databaseSocial, `avaliacoesVibe/${eventId}/`));
      if (!snapshot.exists()) {
        console.log(`[Vibe] Nenhuma avaliação encontrada para o evento ${eventId}.`);
        return null;
      }

      const data = snapshot.val();
      const agora = Date.now();
      const umaHoraMs = 60 * 60 * 1000;

      const avaliacoesRecentes = Object.values(data).filter((item: any) => {
        if (!item.timestamp) return false;
        const diff = agora - item.timestamp;
        return diff >= 0 && diff <= umaHoraMs;
      }) as { nota: number; timestamp: number }[];

      if (avaliacoesRecentes.length === 0) {
        console.log(`[Vibe] Nenhuma avaliação recente para o evento ${eventId}.`);
        return null;
      }

      const totalNotas = avaliacoesRecentes.reduce((acc, cur) => acc + cur.nota, 0);
      const quantidade = avaliacoesRecentes.length;
      const media = totalNotas / quantidade;

      console.log(`[Vibe] Média calculada para o evento ${eventId}: ${media} com ${quantidade} avaliações.`);
      return { media, count: quantidade };
    } catch (error) {
      console.error(`[Vibe] Erro ao calcular vibe do evento ${eventId}:`, error);
      return null;
    }
  }

  useEffect(() => {
    if (eventos.length === 0) return;

    async function carregarVibes() {
      console.log('[Vibe] Carregando vibes para eventos...');
      const vibesArray = await Promise.all(
        eventos.map(async (evento) => {
          const vibe = await calcularMediaVibe(evento.id);
          return { id: evento.id, vibe };
        })
      );

      const vibesMap: Record<string, VibeData> = {};
      vibesArray.forEach(({ id, vibe }) => {
        if (vibe) {
          vibesMap[id] = vibe;
        }
      });

      setVibes(vibesMap);
      console.log('[Vibe] Vibes carregadas:', vibesMap);
    }

    carregarVibes();

    const intervalo = setInterval(() => {
      console.log('[Vibe] Atualizando vibes...');
      carregarVibes();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalo);
  }, [eventos]);

  const getUrgenciaMensagem = (evento: Evento): string => {
    try {
      if (!evento.datainicio || !evento.aberturaportas) return '';
      const hoje = new Date();
      const [dia, mes, ano] = evento.datainicio.split('/').map(Number);
      const [hora, minuto] = evento.aberturaportas.replace('h', ':').split(':').map(Number);
      const dataEvento = new Date(ano, mes - 1, dia, hora, minuto);

      const diffMs = dataEvento.getTime() - hoje.getTime();
      const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMin = Math.floor(diffMs / (1000 * 60));

      if (diffMin <= 0) return 'Acontecendo agora!';
      if (diffMin < 60) return `Faltam ${diffMin} min`;
      if (diffHoras <= 5) return `Faltam ${diffHoras} horas`;
      return '';
    } catch (e) {
      console.error('[Urgencia] Erro ao calcular mensagem de urgência:', e);
      return '';
    }
  };

  const eventosHoje = eventos.filter((ev) => {
    if (!ev.datainicio) return false;
    try {
      const hoje = new Date();
      const [dia, mes, ano] = ev.datainicio.split('/').map(Number);
      return (
        hoje.getDate() === dia &&
        hoje.getMonth() + 1 === mes &&
        hoje.getFullYear() === ano
      );
    } catch (e) {
      console.error('[EventosHoje] Erro ao filtrar eventos de hoje:', e);
      return false;
    }
  });

  // Filtrar eventos baseado na categoria selecionada
  const eventosFiltradosPorCategoria = eventos.filter(evento => 
    categoriaFiltro === 'todos' || 
    evento.categoria?.toLowerCase() === categoriaFiltro.toLowerCase()
  );

  const eventosFuturos = eventosFiltradosPorCategoria.filter((ev) => !eventosHoje.includes(ev));
  const eventosParaLista = [...eventosHoje, ...eventosFuturos];

  function handleAvaliarVibe(evento: Evento) {
    if (!user) {
      Alert.alert(
        'Login necessário',
        'Você precisa estar logado para avaliar a vibe do evento.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Perfil' as never) },
        ]
      );
      return;
    }
    navigation.navigate("VibeScreen" as never, {
      eventId: evento.id,
      nomeEvento: evento.nomeevento,
      cpf: user.cpf,
    } as never);
  }

  const getMensagemVibe = (eventoId: string): string => {
    const vibe = vibes[eventoId];
    if (!vibe || vibe.count === 0) return 'Seja o primeiro a avaliar!';
    if (vibe.count <= 3) return `Poucas avaliações (${vibe.count})`;
    if (vibe.count >= 4 && vibe.count < 9) {
      if (vibe.media < 3) return 'Vibe baixa, pode melhorar';
      if (vibe.media < 4.5) return 'Vibe boa, mas pode melhorar';
      return 'Vibe alta, evento recomendado!';
    }
    if (vibe.media < 3) return 'Vibe baixa';
    if (vibe.media < 4.5) return 'Vibe moderada';
    return 'Altíssima vibe!';
  };

  const mostraSeloAltaVibe = (eventoId: string): boolean => {
    const vibe = vibes[eventoId];
    return !!vibe && vibe.count >= 9 && vibe.media >= 4.5;
  };

  const renderEventCard = (evento: Evento) => {
    const encerrado = !evento.vendaaberta?.vendaaberta;
    const urgencia = getUrgenciaMensagem(evento);
    
    return (
      <TouchableOpacity
        key={evento.id}
        style={styles.eventCard}
        onPress={() => {
          console.log('[Home] Card do evento clicado:', evento.nomeevento);
          handleVerDetalhes(evento);
        }}
        activeOpacity={0.9}
      >
        <View style={styles.eventImageContainer}>
          <Image
            source={{ uri: evento.imageurl }}
            style={[styles.eventImage, encerrado && styles.eventImageDisabled]}
          />
          
          {/* Overlay para eventos encerrados */}
          {encerrado && (
            <View style={styles.eventDisabledOverlay}>
              <MaterialCommunityIcons name="close-circle" size={24} color={Colors.text.onPrimary} />
              <Text style={styles.eventDisabledText}>Vendas Encerradas</Text>
            </View>
          )}
          
          {/* Badge de alta vibe para eventos ativos */}
          {mostraSeloAltaVibe(evento.id) && !encerrado && (
            <View style={styles.eventHighVibeBadge}>
              <MaterialCommunityIcons name="fire" size={14} color={Colors.text.onPrimary} />
              <Text style={styles.eventHighVibeBadgeText}>Alta Vibe</Text>
            </View>
          )}

          {/* Badge de urgência */}
          {urgencia && !encerrado && (
            <View style={styles.eventUrgencyBadge}>
              <Text style={styles.eventUrgencyBadgeText}>{urgencia}</Text>
            </View>
          )}
        </View>
        <View style={styles.eventInfoContainer}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {evento.nomeevento}
          </Text>
          <View style={styles.vibeContainer}>
            <MaterialCommunityIcons name="star" size={16} color={Colors.accent} />
            <Text style={styles.vibeText}>{getMensagemVibe(evento.id)}</Text>
          </View>
          <TouchableOpacity
            style={styles.vibeButton}
            onPress={() => handleAvaliarVibe(evento)}
          >
            <Text style={styles.vibeButtonText}>Avaliar Vibe</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Cabeçalho */} 
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "android" ? 10 : 0) }]}>
        <Image source={require('../images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleNavigateToIngressos} style={styles.headerButton}>
            <MaterialCommunityIcons name="ticket-confirmation" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNavigateToPerfil} style={styles.headerButton}>
            <MaterialCommunityIcons name="account-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categorias de Eventos */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollViewContent}
        >
          {categorias.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryButton,
                categoriaFiltro === cat.id && styles.categoryButtonActive,
              ]}
              onPress={() => setCategoriaFiltro(cat.id)}
            >
              <MaterialCommunityIcons
                name={cat.icone as any}
                size={20}
                color={categoriaFiltro === cat.id ? Colors.primary : Colors.text.secondary}
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  categoriaFiltro === cat.id && styles.categoryButtonTextActive,
                ]}
              >
                {cat.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando eventos...</Text>
        </View>
      ) : (
        <FlatList
          data={eventosParaLista}
          renderItem={({ item }) => renderEventCard(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventListContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons name="calendar-remove-outline" size={60} color={Colors.text.secondary} />
              <Text style={styles.emptyStateText}>Nenhum evento encontrado.</Text>
              <Text style={styles.emptyStateSubText}>Tente ajustar o filtro de categoria.</Text>
            </View>
          )}
        />
      )}

      {webViewVisible && selectedEvent && (
        <EventWebView
          eventUrl={selectedEvent.nomeurl || ''}
          onClose={handleCloseWebView}
          eventName={selectedEvent.nomeevento}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  headerLogo: {
    width: 70,
    height: 35,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: Spacing.md,
    padding: Spacing.xs,
  },
  categoryContainer: {
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryScrollViewContent: {
    paddingHorizontal: Spacing.md,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    fontWeight: Typography.fontWeight.medium,
  },
  categoryButtonTextActive: {
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.md,
    color: Colors.text.primary,
  },
  eventListContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  eventCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  eventImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventImageDisabled: {
    opacity: 0.5,
  },
  eventDisabledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDisabledText: {
    color: Colors.text.onPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.xs,
  },
  eventHighVibeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: 15,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventHighVibeBadgeText: {
    color: Colors.text.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    marginLeft: Spacing.xs,
  },
  eventUrgencyBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  eventUrgencyBadgeText: {
    color: Colors.text.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  eventInfoContainer: {
    padding: Spacing.md,
  },
  eventTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  vibeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vibeText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
  },
  vibeButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  vibeButtonText: {
    color: Colors.text.onSecondary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyStateText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
  },
  emptyStateSubText: {
    fontSize: Typography.fontSize.md,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
});



