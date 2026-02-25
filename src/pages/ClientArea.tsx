import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Calendar, XCircle, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string; price: number } | null;
}

const ClientArea = () => {
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const cleanCpf = cpf.replace(/\D/g, "");
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanCpf.length !== 11) { toast.error("Informe um CPF válido."); return; }
    if (cleanPhone.length < 10) { toast.error("Informe um telefone válido."); return; }

    setLoading(true);
    const { data: client } = await supabase.from("clients").select("id").eq("cpf", cleanCpf).eq("phone", cleanPhone).maybeSingle();

    if (!client) {
      setAppointments([]);
      setSearched(true);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, appointment_time, status, services(name, price)")
      .eq("client_id", client.id)
      .order("appointment_date", { ascending: false });

    setAppointments((data as unknown as Appointment[]) || []);
    setSearched(true);
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("Erro ao cancelar."); return; }
    toast.success("Agendamento cancelado.");
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
  };

  const statusLabel: Record<string, string> = {
    confirmed: "Confirmado",
    cancelled: "Cancelado",
    completed: "Concluído",
  };

  const statusColor: Record<string, string> = {
    confirmed: "text-primary",
    cancelled: "text-destructive",
    completed: "text-muted-foreground",
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 md:py-16">
        <div className="container max-w-lg">
          <div className="text-center mb-8">
            <Calendar className="h-10 w-10 text-primary mx-auto mb-4" />
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">Meus Agendamentos</h1>
            <p className="text-muted-foreground text-sm">Consulte, cancele ou veja seu histórico.</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(11) 99999-9999" className="mt-1" />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="w-full gradient-rose text-primary-foreground border-0">
              <Search className="mr-2 h-4 w-4" /> {loading ? "Buscando..." : "Buscar Agendamentos"}
            </Button>
          </div>

          {searched && (
            <div className="mt-8 animate-fade-in">
              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <p className="text-muted-foreground">Nenhum agendamento encontrado.</p>
                  <p className="text-xs text-muted-foreground mt-2">Verifique se colocou os dados corretamente: CPF + Telefone</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {appointments.map((appt) => (
                    <div key={appt.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{appt.services?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(appt.appointment_date + "T12:00:00"), "dd/MM/yyyy")} às {appt.appointment_time.slice(0, 5)}
                        </p>
                        <span className={`text-xs font-medium ${statusColor[appt.status] || "text-muted-foreground"}`}>
                          {statusLabel[appt.status] || appt.status}
                        </span>
                      </div>
                      {appt.status === "confirmed" && (
                        <Button variant="outline" size="sm" onClick={() => handleCancel(appt.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientArea;
