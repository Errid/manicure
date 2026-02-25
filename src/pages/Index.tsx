import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight, Sparkles, Clock, Shield } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceCard from "@/components/ServiceCard";
import heroImage from "@/assets/hero-nails.jpg";
import { supabase } from "@/integrations/supabase/client";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
}

function formatPrice(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}min`;
}

const features = [
  { icon: Calendar, title: "Agende Online", description: "Escolha o melhor horário para você em poucos cliques." },
  { icon: Clock, title: "Sem Espera", description: "Horário reservado exclusivamente para o seu atendimento." },
  { icon: Shield, title: "Seguro e Prático", description: "Seus dados protegidos. Consulte e cancele quando precisar." },
];

const Index = () => {
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("services").select("*").eq("active", true);
      if (data) setServices(data);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Produtos de manicure elegantes" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/50 to-transparent" />
        </div>
        <div className="container relative z-10 py-24 md:py-36">
          <div className="max-w-lg">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 animate-fade-in">
              Suas unhas merecem o melhor
            </h1>
            <p className="text-primary-foreground/80 text-lg md:text-xl mb-8 animate-fade-in" style={{ animationDelay: "0.15s" }}>
              Agende seu horário online de forma rápida e prática. Cuidado e elegância para suas mãos.
            </p>
            <Link to="/agendar">
              <Button size="lg" className="gradient-rose text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-shadow animate-fade-in text-base px-8" style={{ animationDelay: "0.3s" }}>
                Agendar Agora <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 gradient-soft">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">Por que agendar conosco?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Praticidade e conforto para você, do agendamento ao atendimento.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={feature.title} className="text-center p-6 animate-slide-up" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">Nossos Serviços</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">Escolha o seu cuidado</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {services.map((service, i) => (
              <div key={service.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <ServiceCard name={service.name} description={service.description || ""} price={formatPrice(service.price)} duration={formatDuration(service.duration_minutes)} />
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/agendar">
              <Button size="lg" className="gradient-rose text-primary-foreground border-0 px-8">
                Agendar Agora <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
