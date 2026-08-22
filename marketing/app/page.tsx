import { Header } from "../components/header";
import { HeroSection } from "../components/hero-section";
import { IntegrationsSection } from "../components/integrations-section";
import { FeaturesSection } from "../components/features-section";
import { MapSection } from "../components/map-section";
import { TestimonialsSection } from "../components/testimonials-section";
import { CTASection } from "../components/cta-section";
import { Footer } from "../components/footer";

export default function Page() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      <Header />
      <HeroSection />
      <IntegrationsSection />
      <FeaturesSection />
      <MapSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
