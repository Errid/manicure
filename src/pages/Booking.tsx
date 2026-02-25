import { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceCard from "@/components/ServiceCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
}

function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cleaned[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(cleaned[10]);
}

function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 11);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
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

const ALL_TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

const Booking = () => {
  const [step, setStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<string[]>([]);
  const [blockedFullDays, setBlockedFullDays] = useState<string[]>([]);

  const today = startOfDay(new Date());
  const maxDate = addDays(today, 30);

  // Load services
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("services").select("*").eq("active", true);
      if (data) setServices(data);
    };
    load();
  }, []);

  // Load blocked days
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("blocked_slots").select("*").eq("full_day", true);
      if (data) setBlockedFullDays(data.map((d) => d.blocked_date));
    };
    load();
  }, []);

  // Load booked/blocked times when date changes
  useEffect(() => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const loadTimes = async () => {
      const [appts, blocks] = await Promise.all([
        supabase.from("appointments").select("appointment_time").eq("appointment_date", dateStr).eq("status", "confirmed"),
        supabase.from("blocked_slots").select("blocked_time").eq("blocked_date", dateStr).eq("full_day", false),
      ]);
      setBookedTimes((appts.data || []).map((a) => a.appointment_time.slice(0, 5)));
      setBlockedTimes((blocks.data || []).filter((b) => b.blocked_time).map((b) => b.blocked_time!.slice(0, 5)));
    };
    loadTimes();
  }, [selectedDate]);

  const availableSlots = ALL_TIME_SLOTS.filter(
    (t) => !bookedTimes.includes(t) && !blockedTimes.includes(t)
  );

  const service = services.find((s) => s.id === selectedServiceId);

  const handleConfirm = async () => {
    if (!name.trim() || phone.replace(/\D/g, "").length < 10 || !validateCPF(cpf)) {
      toast.error("Verifique seus dados."); return;
    }
    if (!selectedDate || !selectedTime || !selectedServiceId) return;

    setLoading(true);
    const cleanCpf = cpf.replace(/\D/g, "");
    const cleanPhone = phone.replace(/\D/g, "");

    // Upsert client
    let clientId: string;
    const { data: existing } = await supabase.from("clients").select("id").eq("cpf", cleanCpf).maybeSingle();
    if (existing) {
      clientId = existing.id;
      await supabase.from("clients").update({ name: name.trim(), phone: cleanPhone }).eq("id", clientId);
    } else {
      const { data: newClient, error } = await supabase.from("clients").insert({ name: name.trim(), phone: cleanPhone, cpf: cleanCpf }).select("id").single();
      if (error || !newClient) { toast.error("Erro ao salvar dados."); setLoading(false); return; }
      clientId = newClient.id;
    }

    // Create appointment
    const { error } = await supabase.from("appointments").insert({
      client_id: clientId,
      service_id: selectedServiceId,
      appointment_date: format(selectedDate, "yyyy-MM-dd"),
      appointment_time: selectedTime + ":00",
    });

    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.error("Este horário já está reservado.");
      else toast.error("Erro ao agendar. Tente novamente.");
      return;
    }
    setConfirmed(true);
    toast.success("Agendamento confirmado com sucesso!");
  };

  const steps = ["Serviço", "Data e Hora", "Seus Dados", "Confirmação"];

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-16">
          <div className="text-center animate-scale-in max-w-md mx-auto px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-3">Agendamento Confirmado!</h1>
            <p className="text-muted-foreground mb-6">
              {service?.name} • {selectedDate && format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Para consultar ou cancelar, acesse "Meus Agendamentos" com seu CPF e telefone.
            </p>
            <Button onClick={() => { setConfirmed(false); setStep(0); setSelectedServiceId(null); setSelectedDate(undefined); setSelectedTime(null); setName(""); setPhone(""); setCpf(""); }} variant="outline">
              Novo Agendamento
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 md:py-16">
        <div className="container max-w-2xl">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${i <= step ? "gradient-rose text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </div>
                <span className="hidden sm:inline text-xs text-muted-foreground">{s}</span>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl font-bold text-foreground text-center mb-8">Escolha o serviço</h2>
              <div className="grid gap-4">
                {services.map((s) => (
                  <ServiceCard key={s.id} name={s.name} description={s.description || ""} price={formatPrice(s.price)} duration={formatDuration(s.duration_minutes)} selected={selectedServiceId === s.id} onSelect={() => setSelectedServiceId(s.id)} />
                ))}
              </div>
              <div className="flex justify-end mt-8">
                <Button onClick={() => { if (!selectedServiceId) { toast.error("Selecione um serviço."); return; } setStep(1); }} className="gradient-rose text-primary-foreground border-0">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl font-bold text-foreground text-center mb-8">Escolha a data e horário</h2>
              <div className="flex flex-col items-center gap-8">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }}
                  disabled={(date) => isBefore(date, today) || date > maxDate || date.getDay() === 0 || blockedFullDays.includes(format(date, "yyyy-MM-dd"))}
                  locale={ptBR}
                  className="rounded-lg border bg-card p-3"
                />
                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3 text-center">
                      Horários disponíveis em {format(selectedDate, "dd/MM")}
                    </p>
                    {availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center">Nenhum horário disponível nesta data.</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map((time) => (
                          <button key={time} onClick={() => setSelectedTime(time)} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${selectedTime === time ? "gradient-rose text-primary-foreground shadow" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Button onClick={() => { if (!selectedDate || !selectedTime) { toast.error("Selecione data e horário."); return; } setStep(2); }} className="gradient-rose text-primary-foreground border-0">
                  Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl font-bold text-foreground text-center mb-8">Seus dados</h2>
              <div className="space-y-5 max-w-md mx-auto">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria da Silva" className="mt-1" maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" className="mt-1" />
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Button onClick={() => {
                  if (!name.trim()) { toast.error("Informe seu nome."); return; }
                  if (phone.replace(/\D/g, "").length < 10) { toast.error("Telefone inválido."); return; }
                  if (!validateCPF(cpf)) { toast.error("CPF inválido."); return; }
                  setStep(3);
                }} className="gradient-rose text-primary-foreground border-0">
                  Revisar <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="font-serif text-2xl font-bold text-foreground text-center mb-8">Confirme seu agendamento</h2>
              <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-auto space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-serif text-lg font-semibold text-foreground">{service?.name}</span>
                </div>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Data:</span> {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  <p><span className="font-medium text-foreground">Horário:</span> {selectedTime}</p>
                  <p><span className="font-medium text-foreground">Duração:</span> {service && formatDuration(service.duration_minutes)}</p>
                  <p><span className="font-medium text-foreground">Valor:</span> {service && formatPrice(service.price)}</p>
                </div>
                <div className="border-t border-border pt-4 text-sm space-y-1 text-muted-foreground">
                  <p><span className="font-medium text-foreground">Nome:</span> {name}</p>
                  <p><span className="font-medium text-foreground">Telefone:</span> {phone}</p>
                  <p><span className="font-medium text-foreground">CPF:</span> {cpf}</p>
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                <Button onClick={handleConfirm} disabled={loading} className="gradient-rose text-primary-foreground border-0">
                  {loading ? "Agendando..." : <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Booking;
