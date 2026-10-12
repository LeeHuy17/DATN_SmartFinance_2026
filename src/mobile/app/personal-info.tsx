import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { showToast } from '@/components/Toast';
import { Avatar } from '@/features/profile/components/Avatar';
import { AvatarSheet } from '@/features/profile/components/AvatarSheet';
import { BirthDateSheet } from '@/features/profile/components/BirthDateSheet';
import {
  GENDER_OPTIONS,
  getProfileNow,
  updateProfile,
  type ProfileInput,
} from '@/features/profile/profileStore';
import { confirm } from '@/lib/confirm';
import { colors, radius, spacing } from '@/theme';

/** 2001-08-15 → 15/08/2001 */
const formatBirthDate = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');

/** Số điện thoại Việt Nam: 10 chữ số, bắt đầu bằng 0 (cho phép dấu cách) */
const isValidPhone = (phone: string) => /^0\d{9}$/.test(phone.replace(/\s/g, ''));

const FIELDS: (keyof ProfileInput)[] = ['avatarUri', 'fullName', 'phone', 'birthDate', 'gender'];

export default function PersonalInfoScreen() {
  const router = useRouter();
  const [saved] = useState(getProfileNow);
  const [form, setForm] = useState<ProfileInput>(() => {
    const { email: _email, ...rest } = saved;
    return rest;
  });
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);

  const changed = (key: keyof ProfileInput) =>
    key === 'fullName' || key === 'phone' ? form[key].trim() !== saved[key] : form[key] !== saved[key];
  const changeCount = FIELDS.filter(changed).length;

  const set = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goBack = async () => {
    if (changeCount > 0) {
      const ok = await confirm({
        title: 'Bỏ thay đổi?',
        message: 'Các thay đổi chưa lưu sẽ bị mất.',
        confirmText: 'Bỏ thay đổi',
        destructive: true,
      });
      if (!ok) return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/profile');
  };

  const handleSave = async () => {
    const next = {
      fullName: form.fullName.trim() ? undefined : 'Vui lòng nhập họ và tên.',
      phone: isValidPhone(form.phone) ? undefined : 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.',
    };
    setErrors(next);
    if (next.fullName || next.phone) return;

    setSaving(true);
    try {
      await updateProfile({ ...form, fullName: form.fullName.trim(), phone: form.phone.trim() });
      showToast('Đã lưu thông tin cá nhân');
      if (router.canGoBack()) router.back();
      else router.replace('/profile');
    } catch {
      showToast('Không lưu được. Vui lòng thử lại.', 'alert-circle');
    } finally {
      setSaving(false);
    }
  };

  const editedTag = (key: keyof ProfileInput) => changed(key) && <Text style={styles.edited}>Đã sửa</Text>;
  const editedBorder = (key: 'fullName' | 'phone') => changed(key) && !errors[key] && styles.inputEdited;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Thông tin cá nhân" fallbackHref="/profile" onBack={goBack} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            style={styles.avatarBox}
            onPress={() => setAvatarSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
          >
            <View>
              <Avatar name={saved.fullName} uri={form.avatarUri} size={88} variant="soft" />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={colors.onPrimary} />
              </View>
            </View>
            <Text style={styles.avatarHint}>
              {changed('avatarUri') ? 'Ảnh mới sẽ được lưu khi bấm Lưu thay đổi' : 'Chạm vào ảnh để thay đổi'}
            </Text>
          </Pressable>

          <TextField
            label="Họ và tên"
            value={form.fullName}
            onChangeText={(t) => set('fullName', t)}
            error={errors.fullName}
            labelAccessory={editedTag('fullName')}
            style={editedBorder('fullName')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
          <TextField
            label="Số điện thoại"
            value={form.phone}
            onChangeText={(t) => set('phone', t.replace(/[^\d\s]/g, ''))}
            error={errors.phone}
            labelAccessory={editedTag('phone')}
            style={editedBorder('phone')}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={13}
          />
          <TextField
            label="Email"
            value={saved.email}
            editable={false}
            style={styles.readonly}
            hint="Email dùng để đăng nhập và nhận mã khôi phục, không đổi được tại đây."
          />

          <View style={styles.labelRow}>
            <Text style={styles.label}>Ngày sinh</Text>
            {editedTag('birthDate')}
          </View>
          <Pressable
            style={[styles.dateField, changed('birthDate') && styles.inputEdited]}
            onPress={() => setDateSheet(true)}
            accessibilityRole="button"
            accessibilityLabel={`Ngày sinh ${formatBirthDate(form.birthDate) || 'chưa chọn'}. Chạm để chọn`}
          >
            <Text style={[styles.dateText, !form.birthDate && styles.placeholder]}>
              {formatBirthDate(form.birthDate) || 'dd/mm/yyyy'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.labelRow}>
            <Text style={styles.label}>Giới tính</Text>
            {editedTag('gender')}
          </View>
          <View style={styles.genders} accessibilityRole="radiogroup">
            {GENDER_OPTIONS.map((g) => {
              const selected = form.gender === g.value;
              return (
                <Pressable
                  key={g.value}
                  style={[styles.gender, selected && styles.genderSelected]}
                  onPress={() => set('gender', g.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.genderText, selected && styles.genderTextSelected]}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.changeCount}>
            {changeCount > 0 ? `${changeCount} thay đổi chưa lưu` : 'Chưa có thay đổi'}
          </Text>
          <PrimaryButton title="Lưu thay đổi" onPress={handleSave} loading={saving} disabled={changeCount === 0} />
        </View>
      </KeyboardAvoidingView>

      <AvatarSheet
        visible={avatarSheet}
        hasAvatar={!!form.avatarUri}
        onClose={() => setAvatarSheet(false)}
        onChange={(uri) => set('avatarUri', uri)}
      />
      <BirthDateSheet
        visible={dateSheet}
        value={form.birthDate}
        onClose={() => setDateSheet(false)}
        onSelect={(d) => {
          set('birthDate', d);
          setDateSheet(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  avatarBox: { alignItems: 'center', marginTop: spacing.sm },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: { marginTop: spacing.sm, fontSize: 12, color: colors.textMuted },
  edited: { fontSize: 12, fontWeight: '600', color: colors.primary },
  inputEdited: { borderColor: colors.primary, borderWidth: 1.5 },
  readonly: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  dateField: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dateText: { fontSize: 15, color: colors.text },
  placeholder: { color: colors.textMuted },
  genders: { flexDirection: 'row', gap: spacing.sm },
  gender: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  genderSelected: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  genderText: { fontSize: 15, color: colors.text },
  genderTextSelected: { fontWeight: '700', color: colors.primary },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md - 4,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
  },
  changeCount: { textAlign: 'center', fontSize: 13, color: colors.textMuted },
});
