import AccountOnboardingForm from './AccountOnboardingForm';

export default async function AccountOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = params.redirect || '/trips';

  return <AccountOnboardingForm redirectTo={redirectTo} />;
}
