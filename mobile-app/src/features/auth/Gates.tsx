import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from './AuthContext';
import { Page, Notice, Loading, Retry } from '../../components/ui/Page';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../theme/ThemeContext';
import { request } from '../../api/client';

export function SessionRecovery() {
  const { sessionError, refreshProfile, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch {} finally { setBusy(false); } };
  return <Page title="Sessiyani tiklash"><Notice error>{sessionError || 'Sessiya tasdiqlanmadi.'}</Notice><Notice>Internet aloqasini tekshiring. Qoralamalar va yuborilmagan amallar saqlanadi.</Notice><Button title="Qayta tekshirish" loading={busy} onPress={() => run(refreshProfile)} /><Button title="Hisobdan chiqish" variant="secondary" onPress={() => run(logout)} /></Page>;
}
export function TermsScreen() {
  const { acceptTerms, logout } = useAuth();
  const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const { colors } = useTheme();
  const accept = async () => { setBusy(true); try { await acceptTerms(); router.replace('/'); } catch (error: any) { setError(error.message); } finally { setBusy(false); } };
  return <Page title="Foydalanish shartlari"><Notice>Davom etishdan oldin amaldagi hujjatlarni o‘qing va roziligingizni tasdiqlang.</Notice>
    {[['ommaviy_oferta', 'Ommaviy oferta'], ['maxfiylik_siyosati', 'Maxfiylik siyosati'], ['foydalanish_qoidalari', 'Foydalanish qoidalari']].map(([doc, title]) => <Button key={doc} title={title} variant="secondary" onPress={() => router.push({ pathname: '/legal', params: { doc } })} />)}
    <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => setChecked(value => !value)} style={{ paddingVertical: 16 }}><Text style={{ color: colors.text }}>{checked ? '☑' : '☐'} Hujjatlarni o‘qidim va shartlarga roziman</Text></TouchableOpacity>
    {error ? <Notice error>{error}</Notice> : null}<Button title="Qabul qilish va davom etish" disabled={!checked} loading={busy} onPress={accept} /><Button title="Hisobdan chiqish" variant="ghost" onPress={() => logout().catch(error => setError(error.message))} />
  </Page>;
}
export function StoreSelection() {
  const { user, selectTenant, refreshProfile, logout } = useAuth();
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <Page title="Do‘konni tanlang"><Notice>{user?.tenants.length ? 'Savdo qaysi do‘kon nomidan bajarilishini tanlang.' : 'Faol do‘kon vakolati topilmadi. Do‘kon egasi bilan bog‘laning yoki hisobni qayta tekshiring.'}</Notice>
    {user?.tenants.map(tenant => <Button key={tenant.id} title={tenant.name} disabled={busy} variant="secondary" onPress={async () => { setBusy(true); try { await selectTenant(tenant.id); router.replace('/'); } catch (error: any) { setError(error.message); } finally { setBusy(false); } }} />)}
    {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}<Button title="Vakolatlarni qayta tekshirish" variant="secondary" onPress={() => refreshProfile().catch(error => setError(error.message))} /><Button title="Hisobdan chiqish" variant="ghost" onPress={() => logout().catch(error => setError(error.message))} />
  </Page>;
}
export function LegalDocument() {
  const { doc = 'ommaviy_oferta' } = useLocalSearchParams<{ doc?: string }>();
  const { colors } = useTheme();
  const [state, setState] = useState<{ key: string; value?: any; error?: string }>({ key: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    request('/docs/?doc=' + encodeURIComponent(doc), { signal: controller.signal, skipTenant: true }).then(value => { if (!controller.signal.aborted) setState({ key: doc, value }); }).catch(error => { if (!controller.signal.aborted) setState({ key: doc, error: error.message }); });
    return () => controller.abort();
  }, [doc, version]);
  const current = state.key === doc ? state : null;
  return <Page title={current?.value?.title || 'Hujjat'} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}>
    {current?.error ? <Retry error={current.error} retry={() => { setState({ key: '' }); setVersion(value => value + 1); }} /> : current?.value ? <ScrollView><Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>{current.value.content}</Text></ScrollView> : <Loading />}
  </Page>;
}
