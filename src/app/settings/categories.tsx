import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { IconBadge } from '@/components/icon-badge';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import type { CategoryKind } from '@/domain';
import { useLedgerStore } from '@/state/ledger-store';
import { showToast } from '@/state/toast-store';
import { useQuery } from '@/state/use-query';

export default function CategoriesSettingsScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const mutate = useLedgerStore((state) => state.mutate);
  const all = useQuery((s) => s.repos.categories.list({ includeArchived: true }), []);
  const categories = (all.data ?? []).filter((category) => category.kind === kind);
  const active = categories.filter((category) => !category.archivedAt);
  const archived = categories.filter((category) => category.archivedAt);

  return (
    <Screen header={{ title: 'Categories', back: true }}>
      <SegmentedControl
        options={[
          { value: 'expense', label: 'Expenses' },
          { value: 'income', label: 'Income' },
        ]}
        value={kind}
        onChange={setKind}
      />
      <Card padded={false}>
        {active.map((category, index) => (
          <ListRow
            key={category.id}
            title={category.name}
            leading={<IconBadge icon={category.icon} color={category.color} size={40} outline />}
            onPress={() =>
              router.push({ pathname: '/settings/category/[id]', params: { id: category.id } })
            }
            last={index === active.length - 1}
          />
        ))}
      </Card>
      <Button
        label={`Add ${kind} category`}
        icon="add"
        variant="soft"
        onPress={() =>
          router.push({ pathname: '/settings/category/[id]', params: { id: 'new', kind } })
        }
        fullWidth
      />
      {archived.length > 0 ? (
        <View style={styles.archived}>
          <AppText variant="labelStrong" tone="muted">
            Archived
          </AppText>
          <Card padded={false}>
            {archived.map((category, index) => (
              <ListRow
                key={category.id}
                title={category.name}
                subtitle="Hidden from new entries; history kept"
                leading={<IconBadge icon={category.icon} color={category.color} size={40} />}
                trailing={
                  <Button
                    label="Restore"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      void mutate((s) => s.setup.restoreCategory(category.id)).then(() => {
                        void all.reload();
                        showToast(`${category.name} restored.`, { tone: 'success' });
                      })
                    }
                  />
                }
                chevron={false}
                last={index === archived.length - 1}
              />
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  archived: {
    gap: 8,
  },
});
