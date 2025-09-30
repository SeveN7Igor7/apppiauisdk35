import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Animated,
  Easing,
  Image,
  Dimensions,
  Linking,
  FlatList,
  StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ref, get } from 'firebase/database';
import { database } from '../services/firebase'; // Importação corrigida do database
import { databaseSocial } from '../services/firebaseappdb';
import { AuthContext } from '../contexts/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import InAppWebView from '../components/InAppWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const LogoImage = require('../../assets/logosemfundo.png');

const { width } = Dimensions.get('window');

// Paleta de cores melhorada e mais moderna
const Colors = {
  primary: '#6366F1', // Indigo moderno
  primaryDark: '#4F46E5',
  accent: '#F59E0B', // Amber para destaque
  background: '#F8FAFC', // Fundo mais suave
  cardBackground: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  border: '#E5E7EB',
};

// Interface para eventos participados
interface EventoParticipado {
  eventid: string;
  nomeevento: string;
  imageurl: string;
  quantidadeIngressos: number;
  dataevento?: string;
  local?: string;
}

// ==================== COMPONENTES PRINCIPAIS ====================
// Componente de Login
type LoginScreenProps = { cpfInput: string; setCpfInput: (v: string) => void; password: string; setPassword: (v: string) => void; fazerLogin: () => void; loading: boolean };
const LoginScreen = ({ cpfInput, setCpfInput, password, setPassword, fazerLogin, loading }: LoginScreenProps) => {
  // Função para abrir URLs externas
  const [webVisible, setWebVisible] = useState(false);
  const [webUrl, setWebUrl] = useState('');
  const [webTitle, setWebTitle] = useState('');
  const openInApp = (url: string, title: string) => {
    setWebUrl(url);
    setWebTitle(title);
    setWebVisible(true);
  };

  return (
    <>
      <View style={styles.loginScreenContainer}>
        <View style={styles.authContainer}>
        <View style={styles.authHeader}>
          {/* Logo com fundo estilizado */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Image source={LogoImage} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>
          <Text style={styles.authTitle}>Bem-vindo de volta!</Text>
          <Text style={styles.authSubtitle}>Acesse sua conta para continuar</Text>
        </View>
                
        <View style={styles.authForm}>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="card-account-details" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="CPF"
              value={cpfInput}
              onChangeText={setCpfInput}
              keyboardType="numeric"
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
                        
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="lock" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>
                        
          <TouchableOpacity style={styles.authButton} onPress={fazerLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.authButtonText}>Entrar</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
          
          {/* Container para os botões de ação */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={() => openInApp('https://piauitickets.com/recoverypassword/', 'Recuperar Senha')}
            >
              <MaterialCommunityIcons name="lock-reset" size={16} color={Colors.primary} />
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity 
              style={styles.signupButton}
              onPress={() => openInApp('https://piauitickets.com/cadastro/', 'Cadastro')}
            >
              <MaterialCommunityIcons name="account-plus" size={16} color={Colors.accent} />
              <Text style={styles.signupButtonText}>Faça seu cadastro</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </View>
      <InAppWebView visible={webVisible} url={webUrl} title={webTitle} onClose={() => setWebVisible(false)} />
    </>
  );
};

// Componente de Opção de Perfil Melhorado
type ProfileOptionProps = { icon: any; text: string; onPress: () => void; color?: string };
const ProfileOption = ({ icon, text, onPress, color = Colors.primary }: ProfileOptionProps) => {
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.optionItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={[styles.optionIconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.optionText}>{text}</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Componente de Grid de Eventos Participados (estilo Instagram)
const EventosParticipados = ({ eventosParticipados, navigation }: { eventosParticipados: EventoParticipado[]; navigation: any }) => {
  // Configurações responsivas baseadas na quantidade de eventos
  const getGridConfig = () => {
    return { columns: 3, itemSize: (width - 64) / 3 }; // 3 colunas, com padding horizontal de 32 em cada lado (64 total)
  };

  const { columns, itemSize } = getGridConfig();

  const renderEventoItem = ({ item }: { item: EventoParticipado }) => {
    return (
      <TouchableOpacity
        style={[
          styles.eventoGridItem, 
          { 
            width: itemSize, 
            height: itemSize,
          }
        ]}
        onPress={() => navigation.navigate("Ingressos")}
        activeOpacity={0.8}
      >
        {item.imageurl ? (
          <Image source={{ uri: item.imageurl }} style={styles.eventoGridImage} />
        ) : (
          <View style={[styles.eventoGridImage, styles.eventoGridPlaceholder]}>
            <MaterialCommunityIcons 
              name="calendar-outline" 
              size={24} 
              color={Colors.textSecondary} 
            />
          </View>
        )}
        
        {/* Badge com quantidade de ingressos */}
        {item.quantidadeIngressos > 1 && (
          <View style={styles.eventoGridBadge}>
            <MaterialCommunityIcons name="ticket-confirmation" size={12} color="#fff" />
            <Text style={styles.eventoGridBadgeText}>{item.quantidadeIngressos}</Text>
          </View>
        )}
        
        {/* Overlay com nome do evento */}
        <View style={styles.eventoGridOverlay}>
          <Text 
            style={[
              styles.eventoGridTitle,
              { fontSize: 11 }
            ]} 
            numberOfLines={2}
          >
            {item.nomeevento}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (eventosParticipados.length === 0) {
    return (
      <View style={styles.eventosEmptyState}>
        <MaterialCommunityIcons name="calendar-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.eventosEmptyTitle}>Nenhum evento ainda</Text>
        <Text style={styles.eventosEmptySubtitle}>
          Seus eventos participados aparecerão aqui
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.eventosSectionContent}>
      {/* Estatísticas dos eventos */}
      <View style={styles.eventosStats}>
        <Text style={styles.eventosStatsText}>
          {eventosParticipados.length} {eventosParticipados.length === 1 ? 'evento' : 'eventos'} • {' '}
          {eventosParticipados.reduce((total, evento) => total + evento.quantidadeIngressos, 0)} {' '}
          {eventosParticipados.reduce((total, evento) => total + evento.quantidadeIngressos, 0) === 1 ? 'ingresso' : 'ingressos'}
        </Text>
      </View>
      
      <View style={styles.eventosGridContainer}>
        <FlatList
          data={eventosParticipados}
          renderItem={renderEventoItem}
          keyExtractor={(item) => item.eventid}
          numColumns={columns}
          key={`flatlist-${columns}`}
          scrollEnabled={false}
          contentContainerStyle={styles.eventosGrid}
        />
      </View>
    </View>
  );
};

// Componente para a seção "Em Breve"
const EmBreve = () => (
  <View style={styles.emBreveContainer}>
    <MaterialCommunityIcons name="clock-outline" size={48} color={Colors.textSecondary} />
    <Text style={styles.emBreveTitle}>Em Breve</Text>
    <Text style={styles.emBreveSubtitle}>Novas funcionalidades sociais chegando!</Text>
  </View>
);

// ==================== COMPONENTE PRINCIPAL ====================
export default function Perfil({ navigation }: { navigation: any }) {
  const [cpfInput, setCpfInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [eventosParticipados, setEventosParticipados] = useState<EventoParticipado[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [activeTab, setActiveTab] = useState("eventos"); // Estado para controlar a aba ativa
  const [followerCount, setFollowerCount] = useState(0); // Novo estado para seguidores
  const [attendedEventsCount, setAttendedEventsCount] = useState(0); // Novo estado para eventos frequentados
  const [followingCount, setFollowingCount] = useState(0); // Novo estado para seguindo
  // Estados para modal de lista de usuários (seguidores/seguindo)
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [userListType, setUserListType] = useState<'followers' | 'following'>('following');
  const [userListLoading, setUserListLoading] = useState(false);
  const [userList, setUserList] = useState<{ cpf: string; fullname: string; avatar?: string }[]>([]);
  const [userListIds, setUserListIds] = useState<string[]>([]);
  const [userListIndex, setUserListIndex] = useState(0);
  const [userListHasMore, setUserListHasMore] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const USER_LIST_BATCH_SIZE = 25;
  // Token para cancelar carregamentos anteriores quando o usuário reabrir/switchar rapidamente
  const userListLoadToken = useRef(0);
      
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const contentAnim = useState(new Animated.Value(1))[0]; // Animação para o conteúdo, inicia em 1
  const { user, login, logout } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (user?.cpf) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]).start();
      fetchProfileImage(user.cpf);
      carregarEventosParticipados(user.cpf);
      fetchFollowerCount(user.cpf); // Chamar a nova função para buscar seguidores
      fetchFollowingCount(user.cpf); // Chamar a nova função para buscar seguindo
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      setProfileImageUrl(null);
      setEventosParticipados([]);
      setFollowerCount(0); // Resetar seguidores
      setAttendedEventsCount(0); // Resetar eventos frequentados
    }
  }, [user]);

  const fetchProfileImage = async (cpf: string) => {
    if (!cpf) return;
    try {
      const imageRef = ref(databaseSocial, `users/cpf/${cpf}/config/perfilimage`);
      const snapshot = await get(imageRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data?.imageperfilurl) {
          setProfileImageUrl(data.imageperfilurl);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar imagem de perfil:", error);
    }
  };

  const fetchFollowerCount = async (cpf: string) => {
    if (!cpf) return;
    try {
      const followersRef = ref(databaseSocial, `users/cpf/${cpf}/config/followers`);
      const snapshot = await get(followersRef);
      if (snapshot.exists()) {
        const followersData = snapshot.val();
        const count = Object.keys(followersData).length;
        setFollowerCount(count);
      } else {
        setFollowerCount(0);
      }
    } catch (error) {
      console.error("Erro ao buscar contagem de seguidores:", error);
      setFollowerCount(0);
    }
  };

  const fetchFollowingCount = async (cpf: string) => {
    if (!cpf) return;
    try {
      const followingRef = ref(databaseSocial, `users/cpf/${cpf}/config/following`);
      const snapshot = await get(followingRef);
      if (snapshot.exists()) {
        const followingData = snapshot.val();
        const count = Object.keys(followingData).length;
        setFollowingCount(count);
      } else {
        setFollowingCount(0);
      }
    } catch (error) {
      console.error("Erro ao buscar contagem de seguindo:", error);
      setFollowingCount(0);
    }
  };

  // Buscar dados mínimos do usuário para a lista (nome + avatar)
  const fetchUserCard = async (cpf: string) => {
    const userSnapshot = await get(ref(database, `users/cpf/${cpf}`));
    if (!userSnapshot.exists()) return null;
    const userData = userSnapshot.val();
    let avatar = userData.avatar;
    try {
      const socialSnapshot = await get(ref(databaseSocial, `users/cpf/${cpf}`));
      if (socialSnapshot.exists() && socialSnapshot.val().config?.perfilimage?.imageperfilurl) {
        avatar = socialSnapshot.val().config.perfilimage.imageperfilurl;
      }
    } catch {}
    return {
      cpf,
      fullname: userData.fullname || 'Usuário',
      avatar,
    };
  };

  // Carregar próximo lote de usuários com base em userListIds
  // Carregar um lote explícito de ids a partir de um índice
  const loadBatch = async (ids: string[], fromIndex: number, token: number) => {
    if (fromIndex >= ids.length) { setUserListHasMore(false); return; }
    setUserListLoading(true);
    try {
      const nextIds = ids.slice(fromIndex, fromIndex + USER_LIST_BATCH_SIZE);
      console.log('[Perfil] Carregando lote', { fromIndex, count: nextIds.length, total: ids.length });
      const results = await Promise.all(nextIds.map((id) => fetchUserCard(id)));
      const cleaned = results.filter(Boolean) as { cpf: string; fullname: string; avatar?: string }[];
      // Verifica se ainda é o mesmo carregamento
      if (userListLoadToken.current !== token) {
        console.log('[Perfil] Lote cancelado (token mudou)');
        return;
      }
      setUserList((prev) => (fromIndex === 0 ? cleaned : [...prev, ...cleaned]));
      const newIndex = fromIndex + nextIds.length;
      setUserListIndex(newIndex);
      setUserListHasMore(newIndex < ids.length);
    } catch (e) {
      console.error('Erro ao carregar lote da lista de usuários:', e);
    } finally {
      // Confere token antes de marcar loading=false
      if (userListLoadToken.current === token) setUserListLoading(false);
    }
  };

  // Carregar próximo lote usando estados atuais
  const carregarProximoLote = async (force = false) => {
    const token = userListLoadToken.current;
    if (userListLoading && !force) return;
    await loadBatch(userListIds, userListIndex, token);
  };

  // Preparar lista de seguindo (ids) e iniciar o carregamento paginado
  const carregarListaSeguindo = async (cpf: string) => {
    if (!cpf) return;
    try {
      const followingRef = ref(databaseSocial, `users/cpf/${cpf}/config/following`);
      const snapshot = await get(followingRef);
      const ids = snapshot.exists() ? Object.keys(snapshot.val()) : [];
      const token = ++userListLoadToken.current;
      console.log('[Perfil] Abrindo lista Seguindo', { totalIds: ids.length, token });
      setUserList([]);
      setUserListIds(ids);
      setModalSearchQuery('');
      setUserListIndex(0);
      setUserListHasMore(ids.length > 0);
      if (ids.length > 0) {
        await loadBatch(ids, 0, token);
      }
    } catch (error) {
      console.error('Erro ao carregar lista de seguindo (Perfil):', error);
      setUserList([]);
      setUserListIds([]);
      setUserListIndex(0);
      setUserListHasMore(false);
    }
  };

  // Preparar lista de seguidores (ids) e iniciar o carregamento paginado
  const carregarListaSeguidores = async (cpf: string) => {
    if (!cpf) return;
    try {
      const followersRef = ref(databaseSocial, `users/cpf/${cpf}/config/followers`);
      const snapshot = await get(followersRef);
      const ids = snapshot.exists() ? Object.keys(snapshot.val()) : [];
      const token = ++userListLoadToken.current;
      console.log('[Perfil] Abrindo lista Seguidores', { totalIds: ids.length, token });
      setUserList([]);
      setUserListIds(ids);
      setModalSearchQuery('');
      setUserListIndex(0);
      setUserListHasMore(ids.length > 0);
      if (ids.length > 0) {
        await loadBatch(ids, 0, token);
      }
    } catch (error) {
      console.error('Erro ao carregar lista de seguidores (Perfil):', error);
      setUserList([]);
      setUserListIds([]);
      setUserListIndex(0);
      setUserListHasMore(false);
    }
  };

  const abrirListaSeguindo = async () => {
    if (!user?.cpf) return;
    setUserListType('following');
    setShowUserListModal(true);
    await carregarListaSeguindo(user.cpf);
  };

  const abrirListaSeguidores = async () => {
    if (!user?.cpf) return;
    setUserListType('followers');
    setShowUserListModal(true);
    await carregarListaSeguidores(user.cpf);
  };

  const carregarEventosParticipados = async (cpf: string) => {
    if (!cpf) return;
    
    setLoadingEventos(true);
    try {
      // Buscar dados do usuário
      const userSnapshot = await get(ref(database, `users/cpf/${cpf}`));
      if (!userSnapshot.exists()) {
        setEventosParticipados([]);
        setAttendedEventsCount(0); // Atualizar contagem de eventos frequentados
        return;
      }

      const userData = userSnapshot.val();
      const ingressosComprados = userData.ingressoscomprados;
      
      if (!ingressosComprados) {
        setEventosParticipados([]);
        setAttendedEventsCount(0); // Atualizar contagem de eventos frequentados
        return;
      }

      // Agrupar ingressos por evento
      const grupos: { [key: string]: any[] } = {};
      for (const codigo in ingressosComprados) {
        const ingresso = ingressosComprados[codigo];
        const eventid = ingresso.eventid;
        if (!grupos[eventid]) grupos[eventid] = [];
        grupos[eventid].push({ ...ingresso, codigo });
      }

      // Buscar dados dos eventos
      const listaEventos: EventoParticipado[] = [];
      for (const eventid in grupos) {
        try {
          const snapEvento = await get(ref(database, `eventos/${eventid}`));
          const eventoData = snapEvento.exists() ? snapEvento.val() : {};
          
          listaEventos.push({
            eventid,
            nomeevento: eventoData.nomeevento || "Evento desconhecido",
            imageurl: eventoData.imageurl || "",
            dataevento: eventoData.dataevento || "",
            local: eventoData.local || "",
            quantidadeIngressos: grupos[eventid].length,
          });
        } catch (error) {
          console.error("Erro ao buscar evento:", error);
        }
      }

      // Limitar a 9 eventos para o grid (3x3)
      setEventosParticipados(listaEventos.slice(0, 9));
      setAttendedEventsCount(listaEventos.length); // Definir a contagem total de eventos frequentados
    } catch (error) {
      console.error("Erro ao carregar eventos participados:", error);
      setEventosParticipados([]);
      setAttendedEventsCount(0); // Resetar em caso de erro
    } finally {
      setLoadingEventos(false);
    }
  };

  const fazerLogin = async () => {
    if (!cpfInput || !password) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("cpf", cpfInput);
      formData.append("password", password);

      const response = await fetch("https://piauitickets.com/api/validacao.php", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const snapshot = await get(ref(database, `users/cpf/${cpfInput}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          await login({
            cpf: data.cpf,
            fullname: data.fullname,
            email: data.email,
            photoURL: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.fullname || data.email)}&background=random&color=fff&size=128`, // Usando UI Avatars como placeholder para foto de perfil
            telefone: data.telefone,
            datanascimento: data.datanascimento,
          });
          setCpfInput("");
          setPassword("");
        } else {
          Alert.alert("Erro", "Usuário não encontrado no banco de dados.");
        }
      } else {
        Alert.alert("Erro", "CPF ou senha inválidos.");
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      Alert.alert("Erro", "Falha na conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", onPress: logout },
      ],
      { cancelable: true }
    );
  };

  const handleTabChange = (tab: 'eventos' | 'social') => {
    Animated.timing(contentAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["left","right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left","right"]}>
      <StatusBar barStyle={'light-content'} translucent backgroundColor="transparent" />
      {/* Cabeçalho com ícone de perfil centralizado e sem ação */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 0), justifyContent: 'center' }]}> 
        <View>
          <MaterialCommunityIcons name="account-circle" size={32} color="#fff" />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <Animated.View style={[styles.profileContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                         
            {/* Header do Perfil */}
            <View style={styles.profileHeader}>
              <TouchableOpacity 
                style={styles.settingsButtonHeader}
                onPress={() => navigation.navigate("Configuracoes")}
              >
                <Ionicons name="settings-outline" size={24} color="black" />
              </TouchableOpacity>
              <View style={styles.profileImageContainer}>
                {profileImageUrl ? (
                  <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <MaterialCommunityIcons name="account" size={50} color={Colors.textSecondary} />
                  </View>
                )}
                <TouchableOpacity 
                  style={styles.editProfileImageButton}
                  onPress={() => navigation.navigate("UploadImage")}
                >
                  <MaterialCommunityIcons name="camera-plus" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.profileName}>{(user.fullname || "Usuário").toUpperCase()}</Text>
              <Text style={styles.profileEmail}>{user.email || "Email não informado"}</Text>

              {/* Nova seção de estatísticas de perfil (seguidores e eventos) */}
              <View style={styles.profileStatsContainer}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNumber}>{attendedEventsCount}</Text>
                  <Text style={styles.profileStatLabel}>Eventos</Text>
                </View>
                <TouchableOpacity style={styles.profileStatItem} activeOpacity={0.7} onPress={abrirListaSeguidores}>
                  <Text style={styles.profileStatNumber}>{followerCount}</Text>
                  <Text style={styles.profileStatLabel}>Seguidores</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileStatItem} activeOpacity={0.7} onPress={abrirListaSeguindo}>
                  <Text style={styles.profileStatNumber}>{followingCount}</Text>
                  <Text style={styles.profileStatLabel}>Seguindo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Seção de Eventos e Social (Botões Lado a Lado) */}
            <View style={styles.eventSocialButtonsContainer}>
              <TouchableOpacity 
                style={[styles.eventSocialButton, activeTab === "eventos" && styles.activeTab]}
                onPress={() => handleTabChange("eventos")}
              >
                <MaterialCommunityIcons 
                  name="ticket-confirmation" 
                  size={20} 
                  color={activeTab === "eventos" ? "#fff" : Colors.textSecondary} 
                />
                <Text style={[styles.eventSocialButtonText, activeTab === "eventos" && styles.activeTabText]}>Meus Eventos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.eventSocialButton, activeTab === "social" && styles.activeTab]}
                onPress={() => handleTabChange("social")}
              >
                <MaterialCommunityIcons 
                  name="account-group" 
                  size={20} 
                  color={activeTab === "social" ? "#fff" : Colors.textSecondary} 
                />
                <Text style={[styles.eventSocialButtonText, activeTab === "social" && styles.activeTabText]}>Social</Text>
              </TouchableOpacity>
            </View>

            {/* Conteúdo dinâmico (Eventos ou Social) */}
            <Animated.View style={{ opacity: contentAnim }}>
              {activeTab === "eventos" ? (
                loadingEventos ? (
                  <View style={styles.eventosLoadingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.eventosLoadingText}>Carregando eventos...</Text>
                  </View>
                ) : (
                  <EventosParticipados 
                    eventosParticipados={eventosParticipados} 
                    navigation={navigation}
                  />
                )
              ) : (
                <EmBreve />
              )}
            </Animated.View>

            {/* Opções do Perfil */}
            <View style={styles.optionsSection}>
              <ProfileOption 
                icon="ticket-outline"
                text="Ver Meus Ingressos"
                onPress={() => navigation.navigate("Ingressos")}
                color={Colors.primary}
              />
              <ProfileOption 
                icon="people-outline"
                text="Descobrir Pessoas"
                onPress={() => navigation.navigate("Social")}
                color={Colors.accent}
              />

            </View>

            {/* Botão de Logout */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <MaterialCommunityIcons name="logout" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Sair da Conta</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <LoginScreen
            cpfInput={cpfInput}
            setCpfInput={setCpfInput}
            password={password}
            setPassword={setPassword}
            fazerLogin={fazerLogin}
            loading={loading}
          />
        )}
      </ScrollView>
      {/* Modal com lista de seguidores/seguindo */}
      <Modal visible={showUserListModal} animationType="slide" transparent onRequestClose={() => setShowUserListModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {userListType === 'following' ? `Seguindo (${userList.length})` : `Seguidores (${userList.length})`}
              </Text>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowUserListModal(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#111827" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar por nome..."
                placeholderTextColor={Colors.textSecondary}
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
              />
            </View>
            {userListLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : (
              <FlatList
                data={userList.filter(u => u.fullname.toLowerCase().includes(modalSearchQuery.trim().toLowerCase()))}
                keyExtractor={(item) => item.cpf}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.modalItem}
                    onPress={() => {
                      setShowUserListModal(false);
                      // Navegar para Social com CPF do usuário
                      setTimeout(() => navigation.navigate('Social', { cpf: item.cpf }), 0);
                    }}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.modalAvatar} />
                    ) : (
                      <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarTextSmall}>{item.fullname.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalName} numberOfLines={1}>{item.fullname}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                onEndReachedThreshold={0.5}
                onEndReached={() => { if (userListHasMore && !userListLoading) carregarProximoLote(); }}
                removeClippedSubviews
                initialNumToRender={20}
                windowSize={10}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== ESTILOS ====================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 0, 
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // ==================== ESTILOS DE LOGIN ====================
  loginScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  authContainer: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: Colors.cardBackground,
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  authHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  logoImage: {
    width: 150,
    height: 90,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "Roboto",
  },
  authSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  authForm: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingLeft: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  authButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // Novos estilos para os botões de ação
  actionButtonsContainer: {
    marginTop: 20,
    gap: 16,
  },
  forgotPasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  signupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: `${Colors.accent}10`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${Colors.accent}30`,
    gap: 8,
  },
  signupButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  profileContainer: {
    flex: 1,
    paddingHorizontal: 0, 
    gap: 0, 
  },
  profileHeader: {
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    paddingVertical: 20, 
    paddingHorizontal: 0, 
    shadowColor: "transparent", 
    elevation: 0, 
    marginTop: 0, 
    borderRadius: 0, 
  },
  profileImageContainer: {
    marginBottom: 8, 
    position: 'relative', // Para posicionar o botão de configurações
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editProfileImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBackground,
  },
  settingsButtonHeader: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 2,
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "Roboto",
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // Novos estilos para as estatísticas de perfil
  profileStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Display" : "Roboto",
  },
  profileStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // Novos estilos para os botões de Eventos e Social
  eventSocialButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1, // Adicionada a linha de separação
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  eventSocialButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8, // Reduzido o padding vertical
    marginHorizontal: 4,
    borderRadius: 20, // Mais arredondado para parecer com TikTok
    backgroundColor: Colors.background, 
    borderWidth: 0, // Removido a borda
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  eventSocialButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  activeTabText: {
    color: "#fff",
  },
  // ==================== ESTILOS EVENTOS PARTICIPADOS ====================
  eventosSectionContent: {
    backgroundColor: Colors.cardBackground,
    padding: 0, 
    shadowColor: "transparent", 
    elevation: 0, 
    borderRadius: 0, 
    marginTop: 0, 
  },
  eventosStats: {
    marginBottom: -10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 0, 
  },
  eventosStatsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  eventosGridContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  singleEventContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  eventosGrid: {
    justifyContent: "flex-start",
  },
  eventosGridRow: {
    justifyContent: "flex-start",
    marginBottom: 8, 
  },
  eventoGridItem: {
    borderRadius: 8, 
    overflow: "hidden",
    position: "relative",
    backgroundColor: Colors.cardBackground,
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    margin: 4, 
    marginRight: 8, // Adiciona margem à direita para espaçamento entre os itens
    marginBottom: 8, // Adiciona margem inferior para espaçamento entre as linhas
  },
  eventoGridImage: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.background,
    borderRadius: 8, // Arredondar a imagem também
  },
  eventoGridPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.border,
  },
  eventoGridBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  eventoGridBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  eventoGridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  eventoGridTitle: {
    color: "#fff",
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
    lineHeight: 14,
    fontSize: 11, // Ajustar o tamanho da fonte para melhor visualização
  },
  eventosEmptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  eventosEmptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  eventosEmptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  eventosLoadingContainer: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  eventosLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // Opções do perfil
  optionsSection: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16, 
    padding: 16, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginTop: 16, 
    marginHorizontal: 16, 
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12, 
    paddingHorizontal: 8, 
    gap: 12,
    borderBottomWidth: 0, 
  },
  optionIconContainer: {
    width: 32, 
    height: 32, 
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 15, 
    color: Colors.textPrimary,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // Botão de logout
  logoutButton: {
    backgroundColor: Colors.error,
    borderRadius: 16, 
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20, 
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16, 
    marginTop: 16, 
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  // ===== Modal de Lista (Seguidores/Seguindo) =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 16,
  },
  modalList: {
    paddingVertical: 8,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 4,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    marginRight: 12,
  },
  modalName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  // Cabeçalho igual ao Home
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingBottom: 10,
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
    width: 120,
    height: 60,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 6,
  },
  // Estilos para a seção "Em Breve"
  emBreveContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Colors.cardBackground,
  },
  emBreveTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
  emBreveSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "SF Pro Text" : "Roboto",
  },
});


