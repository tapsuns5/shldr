'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/auth-ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/auth-ui/card';
import { Input } from '@/components/auth-ui/input';
import { Label } from '@/components/auth-ui/label';
import { Loader2 } from 'lucide-react';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

export default function AccountOnboardingForm({ redirectTo }: { redirectTo: string }) {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();
  const [pendingInviteToken] = useState<string | null>(() => (
    typeof window !== 'undefined' ? sessionStorage.getItem('pending-team-invite') : null
  ));
  const inviteToken = redirectTo.match(/^\/team-invite\/([^/?]+)/)?.[1] || pendingInviteToken;
  const inviteAttemptedRef = useRef(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.user) {
      const defaultName = `${session.user.name || 'My'} account`;
      setName((current) => current || defaultName);
      if (!slugEdited) setSlug((current) => current || slugify(defaultName));
    }
  }, [session, slugEdited]);

  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace(`/login?redirect=${encodeURIComponent(`/onboarding/account?redirect=${redirectTo}`)}`);
      return;
    }
    if (!session) return;

    fetch('/api/accounts')
      .then((response) => (response.ok ? response.json() : []))
      .then(async (accounts) => {
        if (accounts.length > 0) {
          router.replace(redirectTo);
          return;
        }

        if (inviteToken && !inviteAttemptedRef.current) {
          inviteAttemptedRef.current = true;
          setLoading(true);
          const response = await fetch(`/api/account-invite/${inviteToken}/accept`, { method: 'POST' });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Unable to join the invited account');
          sessionStorage.removeItem('pending-team-invite');
          router.replace('/trips');
        }
      })
      .catch((fetchError) => {
        setError(fetchError instanceof Error ? fetchError.message : 'Unable to join the invited account');
      })
      .finally(() => {
        setChecking(false);
        setLoading(false);
      });
  }, [inviteToken, redirectTo, router, session, sessionLoading]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Failed to create account');
      router.replace(redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create account');
      setLoading(false);
    }
  };

  if (sessionLoading || checking || !session) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (inviteToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-none">
          <CardHeader>
            <CardTitle>{error ? 'Unable to join account' : 'Joining account...'}</CardTitle>
            <CardDescription>
              {error || 'We are adding you to the account you were invited to join.'}
            </CardDescription>
          </CardHeader>
          {error && (
            <CardContent>
              <a className="text-sm underline" href={`/team-invite/${inviteToken}`}>Return to invite</a>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-none">
        <CardHeader>
          <CardTitle>Set up your Shldr account</CardTitle>
          <CardDescription>Create the shared account where you&apos;ll organize trips and invite teammates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1">
              <Label htmlFor="account-name">Account name</Label>
              <Input id="account-name" value={name} onChange={(event) => handleNameChange(event.target.value)} placeholder="Tyler&apos;s trips" required />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="account-slug">Account slug</Label>
              <Input
                id="account-slug"
                value={slug}
                onChange={(event) => { setSlugEdited(true); setSlug(slugify(event.target.value)); }}
                placeholder="tylers-trips"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="h-11" disabled={loading || !name.trim() || !slug}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : 'Create account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
