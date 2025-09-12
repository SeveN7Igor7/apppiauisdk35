"use client"

import { useEffect, useState, useContext, useRef } from "react"
import { Modal, Animated, Dimensions, StyleSheet } from "react-native"
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  SafeAreaView, // Usado para a tela principal
  StatusBar,
  Alert,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { ref, onValue, get, query, orderByChild, limitToLast, set } from "firebase/database"
import { database } from "../services/firebase"
import { databaseSocial } from "../services/firebaseappdb"
import { AuthContext } from "../contexts/AuthContext"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialCommunityIcons } from "@expo/vector-icons"
import { Colors } from "../constants/Colors"

import ChatComponent from "../components/ChatComponent"
import { eventDetailsStyles } from "../constants/EventDetailsStyle"

type EventDetailsRouteParams = {
  eventId: string
}

type Evento = {
  id: string
  nomeevento: string
  imageurl: string
  local?: string
  datainicio?: string
  aberturaportas?: string
  nomeurl?: string
  vendaaberta: { vendaaberta: boolean; mensagem: string }
  categoria?: string
  descricao?: string
  preco?: string
}

type VibeData = {
  media: number
  count: number
}

export default function EventDetails() {
  const route = useRoute()
  const navigation = useNavigation()
  const { eventId } = route.params as EventDetailsRouteParams
  const { user } = useContext(AuthContext)

  const [evento, setEvento] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)
  const [vibe, setVibe] = useState<VibeData | null>(null)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<number>(0)
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }
    const eventoRef = ref(database, `eventos/${eventId}`)
    const unsubscribe = onValue(eventoRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setEvento({
          id: eventId,
          nomeevento: data.nomeevento || "Sem nome",
          imageurl: data.imageurl || "",
          nomeurl: data.nomeurl,
          local: data.local,
          datainicio: data.datainicio,
          aberturaportas: data.aberturaportas,
          vendaaberta: data.vendaaberta || { vendaaberta: false, mensagem: "" },
          categoria: data.categoria || "outros",
          descricao: data.descricao || "",
          preco: data.preco || "",
        })
      } else {
        setEvento(null)
      }
      setLoading(false)
    }, (error) => {
      console.error("[EventDetails] Erro ao buscar dados do evento:", error)
      setLoading(false)
      setEvento(null)
    })
    return () => unsubscribe()
  }, [eventId])

  // Monitorar mensagens não lidas do chat
  useEffect(() => {
    // Apenas monitora se o evento e o usuário existem e se o evento já começou
    if (!eventId || !user?.cpf || !evento || !eventoJaComecou()) return

    const chatRef = query(
      ref(databaseSocial, `chats/${eventId}`),
      orderByChild("timestamp"),
      limitToLast(50)
    )

    const unsubscribe = onValue(chatRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUnreadMessages(0)
        return
      }

      const messages = snapshot.val()
      const messageArray = Object.values(messages) as any[]
      
      // Contar mensagens mais recentes que o último timestamp visto
      const newMessages = messageArray.filter((msg: any) => 
        msg.timestamp && msg.timestamp > lastSeenTimestamp
      )

      setUnreadMessages(newMessages.length)
    })

    return () => unsubscribe()
  }, [eventId, lastSeenTimestamp, user?.cpf, evento]) // Adicionado 'evento' às dependências

  // Carregar timestamp da última visualização do chat
  useEffect(() => {
    if (!eventId || !user?.cpf) return

    const loadLastSeenTimestamp = async () => {
      try {
        const lastSeenRef = ref(databaseSocial, `chatLastSeen/${user.cpf}/${eventId}`)
        const snapshot = await get(lastSeenRef)
        if (snapshot.exists()) {
          setLastSeenTimestamp(snapshot.val().timestamp || 0)
        }
      } catch (error) {
        console.error("[EventDetails] Erro ao carregar último timestamp visto:", error)
      }
    }

    loadLastSeenTimestamp()
  }, [eventId, user?.cpf])

  async function calcularMediaVibe(eventId: string): Promise<VibeData | null> {
    try {
      const snapshot = await get(ref(databaseSocial, `avaliacoesVibe/${eventId}/`))
      if (!snapshot.exists()) return null
      const data = snapshot.val()
      const agora = Date.now()
      const umaHoraMs = 3600000
      const avaliacoesRecentes = Object.values(data).filter((item: any) => item.timestamp && (agora - item.timestamp <= umaHoraMs)) as { nota: number }[]
      if (avaliacoesRecentes.length === 0) return null
      const totalNotas = avaliacoesRecentes.reduce((acc, cur) => acc + cur.nota, 0)
      return { media: totalNotas / avaliacoesRecentes.length, count: avaliacoesRecentes.length }
    } catch (error) {
      console.error(`[EventDetails] Erro ao calcular vibe do evento ${eventId}:`, error)
      return null
    }
  }

  useEffect(() => {
    if (!evento) return
    const carregarVibe = async () => setVibe(await calcularMediaVibe(evento.id))
    carregarVibe()
    const intervalo = setInterval(carregarVibe, 300000)
    return () => clearInterval(intervalo)
  }, [evento])

  const getUrgenciaMensagem = (): string => {
    if (!evento?.datainicio || !evento?.aberturaportas) return ""
    try {
      const hoje = new Date()
      const [dia, mes, ano] = evento.datainicio.split("/").map(Number)
      const [hora, minuto] = evento.aberturaportas.replace("h", ":").split(":").map(Number)
      const dataEvento = new Date(ano, mes - 1, dia, hora, minuto)
      const diffMs = dataEvento.getTime() - hoje.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin <= 0) return "Acontecendo agora!"
      if (diffMin < 60) return `Faltam ${diffMin} min`
      const diffHoras = Math.floor(diffMs / 3600000)
      if (diffHoras <= 5) return `Faltam ${diffHoras} horas`
      return ""
    } catch { return "" }
  }

  const getMensagemVibe = (): string => {
    if (!vibe || vibe.count === 0) return "Seja o primeiro a avaliar!"
    if (vibe.count <= 3) return `Poucas avaliações (${vibe.count})`
    if (vibe.media < 3) return "Vibe baixa"
    if (vibe.media < 4.5) return "Vibe moderada"
    return "Altíssima vibe!"
  }

  const mostraSeloAltaVibe = (): boolean => !!vibe && vibe.count >= 9 && vibe.media >= 4.5
  const getVibeStars = (): number => vibe ? Math.round(vibe.media) : 0
  const formatarCategoria = (cat?: string): string => cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "Evento"
  const formatarData = (data?: string): string => {
    if (!data) return ""
    try {
      const [dia, mes, ano] = data.split("/")
      const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
      return `${dia} de ${meses[parseInt(mes, 10) - 1]} de ${ano}`
    } catch { return data }
  }
  const formatarHorario = (horario?: string): string => horario ? horario.replace("h", ":") : ""

  const eventoJaComecou = (): boolean => {
    if (!evento?.datainicio || !evento?.aberturaportas) return false;
    try {
      const agora = new Date();
      // Ajusta o fuso horário para evitar problemas de comparação
      agora.setHours(agora.getHours() - agora.getTimezoneOffset() / 60);

      const [dia, mes, ano] = evento.datainicio.split("/").map(Number);
      const [hora, minuto] = evento.aberturaportas.replace("h", ":").split(":").map(Number);
      
      // Cria a data do evento no mesmo fuso horário para comparação precisa
      const dataEvento = new Date(ano, mes - 1, dia, hora, minuto);
      dataEvento.setHours(dataEvento.getHours() - dataEvento.getTimezoneOffset() / 60);

      return agora >= dataEvento;
    } catch (e) {
      console.error("Erro ao verificar se evento já começou:", e);
      return false;
    }
  }

  const getMensagemLiberacaoVibe = (): string => {
    if (!evento?.datainicio || !evento?.aberturaportas) return ""
    try {
      const [dia, mes, ano] = evento.datainicio.split("/").map(Number)
      const [hora, minuto] = evento.aberturaportas.replace("h", ":").split(":").map(Number)
      const dataAbertura = new Date(ano, mes - 1, dia, hora, minuto)
      return `Avaliação liberada a partir de ${dataAbertura.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    } catch { return "Avaliação será liberada quando o evento começar" }
  }

  const handleOpenSalesPage = () => evento && Linking.openURL(`https://piauitickets.com/comprar/${eventId}/${evento.nomeurl || ""}` ).catch(err => console.error("Erro ao abrir URL:", err))
  const handleAvaliarVibe = () => {
    if (!user) return Alert.alert("Login necessário", "Você precisa estar logado para avaliar.", [{ text: "Cancelar" }, { text: "Login", onPress: () => navigation.navigate("Perfil" as never) }])
    if (!evento) return
    // Chamada corrigida: eventoJaComecou() é uma função, não uma propriedade de evento
    if (!eventoJaComecou()) return Alert.alert("Avaliação não disponível", getMensagemLiberacaoVibe(), [{ text: "Entendi" }])
    navigation.navigate("VibeScreen" as never, { eventId: evento.id, nomeEvento: evento.nomeevento, cpf: user.cpf } as never)
  }

  const handleGoBack = () => navigation.goBack()
  
  const handleOpenChat = async () => {
    setIsChatVisible(true)
    Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start()
    
    // Marcar mensagens como lidas
    if (user?.cpf && eventId) {
      try {
        const currentTimestamp = Date.now()
        await set(ref(databaseSocial, `chatLastSeen/${user.cpf}/${eventId}`), {
          timestamp: currentTimestamp
        })
        setLastSeenTimestamp(currentTimestamp)
        setUnreadMessages(0)
      } catch (error) {
        console.error("[EventDetails] Erro ao marcar mensagens como lidas:", error)
      }
    }
  }
  
  const handleCloseChat = () => {
    Animated.timing(slideAnim, { toValue: Dimensions.get("window").height, duration: 300, useNativeDriver: true }).start(() => setIsChatVisible(false))
  }
  
  const handleShare = () => Alert.alert("Compartilhar", "Funcionalidade em breve!")

  if (loading) {
    return (
      <SafeAreaView style={eventDetailsStyles.container}>
        <View style={eventDetailsStyles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary.purple} /></View>
      </SafeAreaView>
    )
  }

  if (!evento) {
    return (
      <SafeAreaView style={eventDetailsStyles.container}>
        <View style={eventDetailsStyles.errorContainer}><Text style={eventDetailsStyles.errorText}>Evento não encontrado</Text></View>
      </SafeAreaView>
    )
  }

  const encerrado = !evento.vendaaberta?.vendaaberta
  const urgencia = getUrgenciaMensagem()

  return (
    <View style={{ flex: 1, backgroundColor: Colors.neutral.black }}>
      <SafeAreaView style={eventDetailsStyles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.neutral.black} />
        <View style={eventDetailsStyles.header}>
          <View style={eventDetailsStyles.headerContent}>
            <TouchableOpacity style={eventDetailsStyles.backButton} onPress={handleGoBack}><MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.onPrimary} /></TouchableOpacity>
            <Text style={eventDetailsStyles.headerTitle}>Detalhes do Evento</Text>
            <TouchableOpacity style={eventDetailsStyles.shareButton} onPress={handleShare}><MaterialCommunityIcons name="share-variant" size={24} color={Colors.text.onPrimary} /></TouchableOpacity>
          </View>
        </View>

        <ScrollView style={eventDetailsStyles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={eventDetailsStyles.eventImageContainer}>
            <Image source={{ uri: evento.imageurl }} style={[eventDetailsStyles.eventImage, encerrado && eventDetailsStyles.eventImageDisabled]} />
            {encerrado && <View style={eventDetailsStyles.eventDisabledOverlay}><MaterialCommunityIcons name="close-circle" size={32} color={Colors.text.onPrimary} /><Text style={eventDetailsStyles.eventDisabledText}>Vendas Encerradas</Text></View>}
            {mostraSeloAltaVibe() && !encerrado && <View style={eventDetailsStyles.eventHighVibeBadge}><MaterialCommunityIcons name="fire" size={18} color={Colors.text.onPrimary} /><Text style={eventDetailsStyles.eventHighVibeBadgeText}>Alta Vibe</Text></View>}
            {/* Botão do chat na imagem do evento, aparece apenas se o evento já começou */}
            {urgencia && <View style={eventDetailsStyles.eventUrgencyBadge}><MaterialCommunityIcons name="clock-fast" size={16} color={Colors.text.onPrimary} /><Text style={eventDetailsStyles.eventUrgencyText}>{urgencia}</Text></View>}
          </View>

          <View style={eventDetailsStyles.eventContent}>
            <View style={eventDetailsStyles.eventTitleSection}><Text style={eventDetailsStyles.eventCategory}>{formatarCategoria(evento.categoria)}</Text><Text style={eventDetailsStyles.eventName}>{evento.nomeevento}</Text></View>
            {urgencia && <View style={eventDetailsStyles.urgencyMessage}><MaterialCommunityIcons name="clock-fast" size={20} color={Colors.text.onPrimary} /><Text style={eventDetailsStyles.urgencyMessageText}>{urgencia}</Text></View>}
            <View style={eventDetailsStyles.eventInfoSection}>
              {evento.datainicio && <View style={eventDetailsStyles.eventInfoRow}><View style={eventDetailsStyles.eventInfoIcon}><MaterialCommunityIcons name="calendar" size={20} color={Colors.primary.purple} /></View><Text style={[eventDetailsStyles.eventInfoText, eventDetailsStyles.eventInfoTextPrimary]}>{formatarData(evento.datainicio)}</Text></View>}
              {evento.aberturaportas && <View style={eventDetailsStyles.eventInfoRow}><View style={eventDetailsStyles.eventInfoIcon}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.primary.purple} /></View><Text style={eventDetailsStyles.eventInfoText}>Abertura dos portões: {formatarHorario(evento.aberturaportas)}</Text></View>}
              {evento.local && <View style={eventDetailsStyles.eventInfoRow}><View style={eventDetailsStyles.eventInfoIcon}><MaterialCommunityIcons name="map-marker" size={20} color={Colors.primary.purple} /></View><Text style={eventDetailsStyles.eventInfoText}>{evento.local}</Text></View>}
            </View>
            {evento.preco && <View style={eventDetailsStyles.priceSection}><Text style={eventDetailsStyles.priceLabel}>Preço dos ingressos</Text><Text style={eventDetailsStyles.priceValue}>{evento.preco}</Text></View>}
            <View style={eventDetailsStyles.vibeSection}>
              <Text style={eventDetailsStyles.vibeSectionTitle}>Vibe do Evento</Text>
              <View style={eventDetailsStyles.vibeContainer}>
                <View style={eventDetailsStyles.vibeStars}>{[1, 2, 3, 4, 5].map(star => <MaterialCommunityIcons key={star} name={star <= getVibeStars() ? "star" : "star-outline"} size={28} color={star <= getVibeStars() ? Colors.primary.orange : Colors.text.tertiary} />)}</View>
                <Text style={eventDetailsStyles.vibeMessage}>{getMensagemVibe()}</Text>
                {vibe && <Text style={eventDetailsStyles.vibeCount}>{vibe.count} {vibe.count === 1 ? "avaliação" : "avaliações"} na última hora</Text>}
                
                {/* Botão do Chat posicionado perto das informações da vibe */}
                <View style={styles.chatButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.chatButton, { backgroundColor: 'blue', borderWidth: 2, borderColor: 'yellow' }]} // Estilos temporários para visibilidade
                    onPress={handleOpenChat}
                  >
                    <MaterialCommunityIcons name="chat" size={20} color="white" />
                    <Text style={[styles.chatButtonText, { color: 'white' }]}>Chat do Evento</Text>
                    {unreadMessages > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {unreadMessages > 99 ? '99+' : unreadMessages.toString()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
                {console.log('DEBUG: Botão do Chat Renderizado', { unreadMessages, isChatVisible, eventoJaComecou: eventoJaComecou() })}
                {!eventoJaComecou() && <Text style={eventDetailsStyles.vibeDisabledMessage}>{getMensagemLiberacaoVibe()}</Text>}
              </View>
            </View>
            {evento.descricao && <View style={eventDetailsStyles.descriptionSection}><Text style={eventDetailsStyles.descriptionTitle}>Sobre o Evento</Text><Text style={eventDetailsStyles.descriptionText}>{evento.descricao}</Text></View>}
            <View style={eventDetailsStyles.actionsSection}>
              {evento.vendaaberta?.vendaaberta ? (
                <>
                  <TouchableOpacity style={eventDetailsStyles.primaryActionButton} onPress={handleOpenSalesPage}><LinearGradient colors={[Colors.primary.purple, Colors.primary.magenta]} style={eventDetailsStyles.primaryActionButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}><MaterialCommunityIcons name="ticket" size={20} color={Colors.text.onPrimary} /><Text style={eventDetailsStyles.primaryActionButtonText}>Comprar Ingresso</Text></LinearGradient></TouchableOpacity>
                  {/* Chamada corrigida: eventoJaComecou() é uma função, não uma propriedade de evento */}
                  {eventoJaComecou() ? <TouchableOpacity style={eventDetailsStyles.secondaryActionButton} onPress={handleAvaliarVibe}><MaterialCommunityIcons name="heart" size={20} color={Colors.primary.purple} /><Text style={eventDetailsStyles.secondaryActionButtonText}>Avaliar Vibe</Text></TouchableOpacity> : <View style={eventDetailsStyles.disabledButton}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.text.tertiary} /><Text style={eventDetailsStyles.disabledButtonText}>Avaliação em Breve</Text></View>}
                </>
              ) : (
                <>
                  <View style={eventDetailsStyles.statusMessage}><Text style={eventDetailsStyles.statusMessageText}>{evento.vendaaberta?.mensagem || "Vendas encerradas"}</Text></View>
                  <View style={eventDetailsStyles.disabledButton}><MaterialCommunityIcons name="ticket-outline" size={20} color={Colors.text.tertiary} /><Text style={eventDetailsStyles.disabledButtonText}>Vendas Encerradas</Text></View>
                  {/* Chamada corrigida: eventoJaComecou() é uma função, não uma propriedade de evento */}
                  {eventoJaComecou() ? <TouchableOpacity style={eventDetailsStyles.secondaryActionButton} onPress={handleAvaliarVibe}><MaterialCommunityIcons name="heart" size={20} color={Colors.primary.purple} /><Text style={eventDetailsStyles.secondaryActionButtonText}>Avaliar Vibe</Text></TouchableOpacity> : <View style={eventDetailsStyles.disabledButton}><MaterialCommunityIcons name="clock-outline" size={20} color={Colors.text.tertiary} /><Text style={eventDetailsStyles.disabledButtonText}>Avaliação em Breve</Text></View>}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Modal do Chat */}
      <Modal visible={isChatVisible} transparent animationType="none" onRequestClose={handleCloseChat}>
        <View style={localStyles.modalBackdrop}>
          <Animated.View style={[localStyles.chatModalContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View style={localStyles.chatHeader}>
              <Text style={localStyles.chatHeaderTitle}>Chat do Evento</Text>
              <TouchableOpacity onPress={handleCloseChat} style={localStyles.chatCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color={Colors.text.onPrimary} />
              </TouchableOpacity>
            </View>
            <ChatComponent eventId={eventId} isInsideModal={true} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

// Estilos adicionais para o novo layout do chat
const styles = StyleSheet.create({
  chatButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary.green,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    position: 'relative',
  },
  chatButtonText: {
    color: Colors.text.onPrimary,
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.primary.red || '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.neutral.white,
  },
  unreadBadgeText: {
    color: Colors.text.onPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
})

const localStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatModalContainer: {
    height: '90%',
    backgroundColor: Colors.neutral.black,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral.gray,
    backgroundColor: Colors.neutral.black,
  },
  chatHeaderTitle: {
    color: Colors.text.onPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  chatCloseButton: {
    padding: 4,
  },
})

