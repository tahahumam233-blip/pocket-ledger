import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Field, TextField } from '@/components/form-row';
import { IconBadge } from '@/components/icon-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { useTheme, withAlpha } from '@/design';
import { type Category, type CategoryKind, COLOR_CHOICES, ICON_CHOICES } from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

export default function CategoryFormScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string }>();
  const isNew = params.id === 'new';
  const kind: CategoryKind = params.kind === 'income' ? 'income' : 'expense';
  const existing = useQuery(
    (s) => (isNew ? Promise.resolve(null) : s.repos.categories.getById(params.id)),
    [params.id],
  );
  if (isNew) return <CategoryForm key="new" category={null} kind={kind} />;
  if (!existing.data && existing.loading)
    return <Screen header={{ title: 'Edit category', back: true }} />;
  if (!existing.data) {
    return (
      <Screen header={{ title: 'Edit category', back: true }}>
        <EmptyState
          icon="alert-circle"
          title="Category not found"
          message="This category may have been removed."
        />
      </Screen>
    );
  }
  return <CategoryForm key={existing.data.id} category={existing.data} kind={existing.data.kind} />;
}

function CategoryForm({ category, kind }: { category: Category | null; kind: CategoryKind }) {
  const theme = useTheme();
  const router = useRouter();
  const mutate = useLedgerStore((state) => state.mutate);
  const isNew = category === null;
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'pricetag');
  const [color, setColor] = useState(category?.color ?? COLOR_CHOICES[0] ?? '#F26B5B');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await mutate(async (s) => {
        if (category) await s.setup.updateCategory(category.id, { name, icon, color });
        else await s.setup.createCategory({ name, kind, icon, color });
      });
      showToast(isNew ? 'Category added.' : 'Category updated.', { tone: 'success' });
      router.back();
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not save.', { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!category) return;
    const perform = async () => {
      try {
        const result = await mutate((s) => s.setup.removeCategory(category.id));
        showToast(
          result === 'archived' ? 'Category archived. Its history is kept.' : 'Category removed.',
        );
        router.back();
      } catch (caught) {
        showToast(caught instanceof Error ? caught.message : 'Could not remove.', {
          tone: 'danger',
        });
      }
    };
    if (Platform.OS === 'web') {
      void perform();
      return;
    }
    Alert.alert(
      'Remove this category?',
      'If it has entries it is archived instead of deleted, so reports stay correct.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void perform() },
      ],
    );
  };

  return (
    <Screen
      header={{ title: isNew ? `New ${kind} category` : 'Edit category', back: true }}
      keyboard
    >
      <View style={styles.preview}>
        <IconBadge icon={icon} color={color} size={72} outline />
        <AppText variant="heading">{name.trim() || 'Category name'}</AppText>
      </View>
      <Field label="Name">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="e.g. Coffee, Kids, Car repairs"
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Field>
      <Field label="Color">
        <View style={styles.swatches}>
          {COLOR_CHOICES.map((choice) => (
            <PressableScale
              key={choice}
              onPress={() => setColor(choice)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choice === color }}
              style={[
                styles.swatch,
                {
                  backgroundColor: choice,
                  borderColor: choice === color ? theme.colors.text : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      </Field>
      <Field label="Icon">
        <View style={styles.icons}>
          {ICON_CHOICES.map((choice) => (
            <PressableScale
              key={choice}
              onPress={() => setIcon(choice)}
              accessibilityRole="radio"
              accessibilityState={{ selected: choice === icon }}
              style={[
                styles.iconTile,
                {
                  backgroundColor: choice === icon ? withAlpha(color, 0.18) : theme.colors.surface,
                  borderColor: choice === icon ? color : theme.colors.border,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <IconBadge
                icon={choice}
                color={choice === icon ? color : theme.colors.textMuted}
                size={32}
                outline
              />
            </PressableScale>
          ))}
        </View>
      </Field>
      <Button
        label={isNew ? 'Add category' : 'Save changes'}
        onPress={() => void save()}
        loading={saving}
        disabled={!name.trim()}
        size="lg"
        fullWidth
      />
      {!isNew && !category.isSystem ? (
        <Button label="Remove category" icon="trash" variant="danger" onPress={remove} fullWidth />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    gap: 10,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
  },
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconTile: {
    padding: 6,
    borderWidth: 1,
  },
});
