import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { HelperText, useTheme } from 'react-native-paper';
import { createAccountSchema, slugify } from '@shldr/shared';
import { Typography, TextField, Button } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleCreate = async () => {
    setError(null);
    const parsed = createAccountSchema.safeParse({ name: name.trim(), slug: slug.trim() });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your account details.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/api/accounts', parsed.data);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      router.replace('/trips');
    } catch {
      setError('Could not create your account. Try a different slug.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Typography variant="h4" style={styles.title}>
          Set up your account
        </Typography>
        <Typography variant="body2" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
          This is the workspace your trips live in — you can invite others to it later.
        </Typography>

        <TextField
          label="Account name"
          value={name}
          onChangeText={handleNameChange}
          style={styles.input}
        />
        <TextField
          label="Account slug"
          value={slug}
          onChangeText={(v) => {
            setSlugEdited(true);
            setSlug(slugify(v));
          }}
          autoCapitalize="none"
          style={styles.input}
        />

        {error ? <HelperText type="error">{error}</HelperText> : null}

        <Button onPress={handleCreate} loading={loading} disabled={loading || !name.trim() || !slug}>
          Create account
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { marginBottom: 4, fontWeight: '700' },
  input: { marginBottom: 12 },
});
