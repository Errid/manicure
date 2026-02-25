import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, LogOut, Users, Clock, XCircle, CheckCircle2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";

interface AppointmentRow {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  clients: { name: string; phone: string; cpf: string } | null;
  services: { name: string; price: number } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [selectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "cancelled" | "completed">("all");

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    const loadAppointments = async () => {
      let startDate: string, endDate: string;
      const today = selectedDate;
      if (view === "day") {
        startDate = endDate = format(today, "yyyy-MM-dd");
      } else if (view === "week") {
        startDate = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        endDate = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
      } else {
        startDate = format(startOfMonth(today), "yyyy-MM-dd");
        endDate = format(endOfMonth(today), "yyyy-MM-dd");
      }

      const { data } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, status, clients(name, phone, cpf), services(name, price)")
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_date")
        .order("appointment_time");

      setAppointments((data as unknown as AppointmentRow[]) || []);
    };
    loadAppointments();
  }, [loading, view, selectedDate]);

  const handleCancel = async (id: string) => {
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelled" } : a));
    toast.success("Agendamento cancelado.");
  };

  const handleComplete = async (id: string) => {
    await supabase.from("appointments").update({ status: "completed" }).eq("id", id);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: "completed" } : a));
    toast.success("Atendimento concluído.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado.");
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const confirmedToday = appointments.filter((a) => a.status === "confirmed" && a.appointment_date === format(new Date(), "yyyy-MM-dd")).length;

  const filteredAppointments = statusFilter === "all" ? appointments : appointments.filter((a) => a.status === statusFilter);

  const statusLabel: Record<string, string> = { confirmed: "Confirmado", cancelled: "Cancelado", completed: "Concluído" };
  const statusColor: Record<string, { bg: string; text: string; badge: string }> = {
    confirmed: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    cancelled: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
    completed: { bg: "bg-green-50 dark:bg-green-950", text: "text-green-700 dark:text-green-300", badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8 md:py-16">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-foreground">Painel Administrativo</h1>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Calendar, label: "Agendamentos Hoje", value: String(confirmedToday) },
              { icon: Users, label: "Total no período", value: String(appointments.length) },
              { icon: Clock, label: "Período", value: view === "day" ? "Hoje" : view === "week" ? "Semana" : "Mês" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border rounded-lg p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="font-serif text-xl font-semibold text-foreground">Agendamentos</h2>
              <div className="flex gap-2">
                {(["day", "week", "month"] as const).map((v) => (
                  <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)} className={view === v ? "gradient-rose text-primary-foreground border-0" : ""}>
                    {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Filtros por Status */}
            <div className="mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Status</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", "confirmed", "cancelled", "completed"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status as any)}
                    className={statusFilter === status ? "gradient-rose text-primary-foreground border-0" : ""}
                  >
                    {status === "all" ? "Todos" : status === "confirmed" ? "Confirmados" : status === "cancelled" ? "Cancelados" : "Concluídos"}
                  </Button>
                ))}
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum agendamento neste período.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Data/Hora</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Cliente</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Contato</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Serviço</th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">Preço</th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.id} className={`border-b border-border hover:bg-accent/50 transition-colors ${statusColor[appt.status]?.bg}`}>
                        <td className="py-4 px-4">
                          <div className="font-medium text-foreground">
                            {format(new Date(appt.appointment_date + "T12:00:00"), "dd/MM/yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">{appt.appointment_time.slice(0, 5)}</div>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-foreground">{appt.clients?.name || "-"}</p>
                          <p className="text-xs text-muted-foreground">CPF: {appt.clients?.cpf || "-"}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-foreground">{appt.clients?.phone || "-"}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-foreground">{appt.services?.name || "-"}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <p className="font-semibold text-primary">
                            {appt.services?.price ? `R$ ${(appt.services.price).toFixed(2).replace(".", ",")}` : "-"}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge className={statusColor[appt.status]?.badge}>
                            {statusLabel[appt.status]}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {appt.status === "confirmed" ? (
                            <div className="flex gap-2 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleComplete(appt.id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                title="Marcar como concluído"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCancel(appt.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                title="Cancelar agendamento"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
