import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import Navbar from '../components/Navbar';
import { getGarmentSvg } from '../components/shopGarments';
import { usePreferences } from '../contexts/PreferencesContext';
import { formatEquipmentBonuses } from '../services/avatarEquipment';
import { buyShopItem, catalog, fetchShop } from '../services/shopService';
import { toast } from '../utils/toast';

const categories = [
  { id: 'all', label: 'Todas' },
  { id: 'shirt', label: 'Camisas' },
  { id: 'pants', label: 'Calças' },
  { id: 'shoes', label: 'Botas' },
];
const featuredItems = catalog.filter((item) => item.featured);
const numberFormat = new Intl.NumberFormat('pt-BR');
const art = Object.fromEntries(catalog.map((item) => [item.id, getGarmentSvg(item)]));
const shopBanner = require('../../assets/shop.svg');
const SHOP_BACKGROUND = '#48342E';

function Coin({ styles }) {
  return <View style={styles.coin} accessible={false}><Text style={styles.coinMark}>◆</Text></View>;
}

function EquipmentBonuses({ stats, styles }) {
  const bonuses = formatEquipmentBonuses(stats);
  if (!bonuses.length) return null;

  return (
    <View style={styles.bonuses}>
      {bonuses.map((bonus) => <Text key={bonus} style={styles.bonus}>{bonus}</Text>)}
    </View>
  );
}

export default function ShopScreen({ token, onChangeTab, onOpenWardrobe }) {
  const { colors } = usePreferences();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [category, setCategory] = useState('all');
  const [shop, setShop] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [pending, setPending] = useState(false);
  const buying = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchShop(token, controller.signal)
      .then((state) => {
        if (!controller.signal.aborted) setShop(state);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [token, attempt]);

  const buy = async () => {
    if (buying.current || !selectedItem) return;
    buying.current = true;
    setPending(true);
    setPurchaseError('');
    try {
      setShop(await buyShopItem(token, selectedItem.id));
      setSelectedItem(null);
      toast.success(`${selectedItem.name} adicionada ao guarda-roupa!`);
    } catch (cause) {
      setPurchaseError(cause.message);
      setAttempt((value) => value + 1);
    } finally {
      buying.current = false;
      setPending(false);
    }
  };

  const renderItem = (item, featured = false) => {
    const owned = shop?.ownedItemIds.includes(item.id);
    const canAfford = shop && shop.coins >= item.price;
    const disabled = !owned && (!canAfford || !!error);
    return (
      <View key={item.id} style={[styles.card, featured && styles.featuredCard]}>
        <View style={[styles.artwork, featured && styles.featuredArtwork, { backgroundColor: item.color }]}>
          <View style={[styles.halo, { borderColor: `${item.accent}66` }, !featured && styles.smallHalo]} />
          {featured && <Text style={styles.featuredTag}>✦ DESTAQUE</Text>}
          <SvgXml xml={art[item.id]} width={featured ? '78%' : '70%'} height={featured ? 108 : 67} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.collection}>{item.collection}</Text>
          <Text style={styles.itemName}>{item.name}</Text>
          <EquipmentBonuses stats={item.stats} styles={styles} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={owned ? `Personalizar com ${item.name}` : `Comprar ${item.name} por ${item.price} moedas`}
            disabled={disabled}
            style={({ pressed }) => [styles.buyButton, owned && styles.ownedButton, disabled && styles.disabled, pressed && styles.pressed]}
            onPress={() => {
              if (owned) onOpenWardrobe(item.slot);
              else {
                setPurchaseError('');
                setSelectedItem(item);
              }
            }}
          >
            {!owned && <Coin styles={styles} />}
            <Text style={[styles.buyText, owned && styles.ownedText]}>
              {owned ? 'Personalizar' : `${item.price} moedas`}
            </Text>
          </Pressable>
          {shop && !owned && !canAfford ? <Text style={styles.insufficient}>Saldo insuficiente</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView style={styles.scroll}>
        <View style={[styles.hero, compact && styles.compactHero]}>
          <Image
            source={shopBanner}
            style={compact ? styles.compactBanner : StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition="top"
            accessible
            accessibilityLabel="Ilustração da Loja do Avatar"
            onError={({ error }) => console.warn('Não foi possível exibir o banner da loja:', error)}
          />
          <SafeAreaView style={styles.walletOverlay} edges={['top', 'left', 'right']}>
            <View
              style={styles.wallet}
              accessible
              accessibilityLiveRegion="polite"
              accessibilityLabel={shop && !error ? `Saldo: ${shop.coins} moedas` : 'Saldo indisponível'}
            >
              <Coin styles={styles} />
              <View>
                <Text style={styles.walletLabel}>MOEDAS</Text>
                <Text style={styles.walletValue}>{shop && !error ? numberFormat.format(shop.coins) : '—'}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.content}>
          {!shop && !error && <ActivityIndicator color={colors.accent} accessibilityLabel="Carregando saldo e guarda-roupa" />}
          {!!error && (
            <View style={styles.notice}>
              <Text style={styles.subtitle} accessibilityRole="alert">{error}</Text>
              {token ? <Pressable accessibilityRole="button" onPress={() => { setError(''); setShop(null); setAttempt((value) => value + 1); }}>
                <Text style={styles.retry}>Tentar novamente</Text>
              </Pressable> : null}
            </View>
          )}
          {catalog.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>sem itens disponíveis para compra</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, styles.pageTitle]} accessibilityRole="header">✦  Em destaque</Text>
              <Text style={[styles.subtitle, styles.pageSubtitle]}>Peças especiais para a sua próxima jornada.</Text>
              <View style={styles.grid}>{featuredItems.map((item) => renderItem(item, true))}</View>

              <Text style={[styles.sectionTitle, styles.pageTitle]} accessibilityRole="header">Catálogo</Text>
              <View style={styles.categories}>
                {categories.map(({ id, label }) => (
                  <Pressable
                    key={id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: category === id }}
                    onPress={() => setCategory(id)}
                    style={[styles.chip, category === id && styles.selectedChip]}
                  >
                    <Text style={[styles.chipText, category === id && styles.selectedChipText]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.grid}>
                {catalog.filter((item) => category === 'all' || item.slot === category).map((item) => renderItem(item))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <Navbar activeTab="shop" onChangeTab={onChangeTab} />
      <Modal visible={!!selectedItem} transparent animationType="fade" onRequestClose={() => !buying.current && setSelectedItem(null)}>
        {selectedItem && (
          <View style={styles.overlay}>
            <View style={styles.dialog} accessibilityViewIsModal>
              <Text style={styles.sectionTitle} accessibilityRole="header">Confirmar compra</Text>
              <Text style={styles.subtitle}>{selectedItem.name} custa {selectedItem.price} moedas. A peça ficará no seu guarda-roupa.</Text>
              <EquipmentBonuses stats={selectedItem.stats} styles={styles} />
              {!!purchaseError && <Text style={styles.purchaseError} accessibilityRole="alert">{purchaseError}</Text>}
              <Pressable
                accessibilityRole="button"
                disabled={pending || !shop || !!error || shop.coins < selectedItem.price}
                onPress={buy}
                style={[styles.buyButton, (pending || !shop || !!error || shop.coins < selectedItem.price) && styles.disabled]}
              >
                <Text style={styles.buyText}>{pending ? 'Comprando…' : 'Confirmar compra'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={pending} onPress={() => setSelectedItem(null)} style={styles.cancel}>
                <Text style={styles.retry}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: SHOP_BACKGROUND },
  hero: { width: '100%', aspectRatio: 4 / 3, maxHeight: 500, overflow: 'hidden' },
  compactHero: { aspectRatio: 5 / 4 },
  // Frame the shopkeeper using the top 712 px wide crop of the SVG at x=563.
  compactBanner: { position: 'absolute', top: 0, left: '-79.1%', width: '234.8%', aspectRatio: 1672 / 941 },
  walletOverlay: { width: '100%', alignItems: 'flex-end', padding: 16 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#29203F', borderWidth: 1, borderColor: '#62485C' },
  walletLabel: { color: '#FFD68B', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  walletValue: { color: '#FFF5DA', fontSize: 18, fontWeight: '900' },
  coin: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#F6BB5B', borderWidth: 1, borderColor: '#FFE0A6', alignItems: 'center', justifyContent: 'center' },
  coinMark: { fontSize: 9, color: '#644116', fontWeight: '800' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 20, color: colors.text, fontWeight: '900' },
  subtitle: { color: colors.secondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  pageTitle: { color: '#FFF5DA' },
  pageSubtitle: { color: '#F1D9CA' },
  notice: { padding: 12, marginBottom: 16, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginVertical: 24, padding: 20, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.secondary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  retry: { color: colors.accent, fontWeight: '800', marginVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 22 },
  card: { width: '48%', overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  featuredCard: { borderColor: colors.accent, borderRadius: 19 },
  artwork: { height: 90, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  featuredArtwork: { height: 164, paddingTop: 28 },
  halo: { position: 'absolute', width: 124, height: 124, borderRadius: 62, borderWidth: 1, backgroundColor: '#FFFFFF2B', transform: [{ translateY: 10 }] },
  smallHalo: { width: 73, height: 73, borderRadius: 37, transform: [{ translateY: 0 }] },
  featuredTag: { position: 'absolute', left: 8, top: 8, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 7, fontSize: 9, fontWeight: '900', letterSpacing: 0.4, backgroundColor: '#FFF1CF', color: '#422B3A' },
  cardInfo: { padding: 9, flex: 1 },
  collection: { color: colors.secondary, fontSize: 10, fontWeight: '700' },
  itemName: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 3, marginBottom: 9 },
  bonuses: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  bonus: { color: colors.text, backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, fontSize: 11, fontWeight: '800' },
  buyButton: { backgroundColor: '#4C33B1', flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8, minHeight: 44, borderRadius: 11 },
  buyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  ownedButton: { backgroundColor: colors.accentSoft },
  ownedText: { color: colors.accent },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.8 },
  insufficient: { color: colors.secondary, textAlign: 'center', fontSize: 10, marginTop: 3 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  chip: { paddingHorizontal: 11, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 20 },
  selectedChip: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.secondary, fontWeight: '700' },
  selectedChipText: { color: colors.text },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#101226B3' },
  dialog: { width: '100%', maxWidth: 350, padding: 20, gap: 10, borderRadius: 20, backgroundColor: colors.surface },
  purchaseError: { color: colors.danger, fontWeight: '700' },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
