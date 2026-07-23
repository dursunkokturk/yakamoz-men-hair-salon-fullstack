import { useMemo, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { LogOut, ChevronLeft, ChevronRight, Check, CheckCheck, Ban, Trash2, CalendarClock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppointments, APPOINTMENT_STATUS } from "../../context/AppointmentContext";
import { useBlockedCustomers } from "../../context/BlockedCustomerContext";
import { useAvailability } from "../../hooks/useAvailability";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { ServiceManagerList } from "../services/ServiceManagerList";
import { ClosedDaysManager } from "../admin/ClosedDaysManager";
import { PasswordSettings } from "../admin/PasswordSettings";
import { BusinessHoursSettings } from "../admin/BusinessHoursSettings";
import { dayjs, formatDateShort, formatDateTR, todayISO } from "../../utils/dateUtils";
import { AppointmentFilters } from "../admin/AppointmentFilters";

const TABS = [
  { id: "appointments", label: "Randevular" },
  { id: "blocked", label: "Engellenen Müşteriler" },
  { id: "services", label: "Hizmetler" },
  { id: "closedDays", label: "Kapalı Günler" },
  { id: "settings", label: "Ayarlar" },
];

export function AdminPanel() {
  const { logout, adminUsername } = useAuth();
  const [activeTab, setActiveTab] = useState("appointments");

  return (
    <div className="page page--admin">
      <div className="admin-topbar">
        <div>
          <h1>Berber Paneli</h1>
          <p>Hoş geldin, {adminUsername}</p>
        </div>
        <Button variant="ghost" onClick={logout}>
          <LogOut size={16} /> Çıkış Yap
        </Button>
      </div>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-tabs__item ${activeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "appointments" && <AppointmentsTab />}
      {activeTab === "blocked" && <BlockedCustomersTab />}
      {activeTab === "services" && <ServiceManagerList />}
      {activeTab === "closedDays" && <ClosedDaysManager />}
      {activeTab === "settings" && (
        <>
          <BusinessHoursSettings />
          <PasswordSettings />
        </>
      )
      }
    </div>
  );
}

function AppointmentsTab() {
  const { getAppointmentsByDate, fetchByDate, approveAppointment, completeAppointment, cancelAppointment, deleteAppointment, rescheduleAppointment } =
    useAppointments();
  const { blockCustomer } = useBlockedCustomers();
  const [activeDate, setActiveDate] = useState(todayISO());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDay, setIsLoadingDay] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleMode, setRescheduleMode] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [filters, setFilters] = useState({ status: "all", serviceId: "all", customerName: "" });

  // Gunluk Randevulari Aktif Olan Tarihe Gore Listeleme
  // Bir Onceki Yada Bir Sonraki Tarihe Bakildiginda 
  // Bakilan Tarihe Gore Alinan Randevulardaki Musteri Bilgilerini
  // Backend'den Cekiyoruz
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchByDate(activeDate)
      .catch((err) => {
        console.error(err);
        toast.error("Randevular yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDay(false)
      });
    return (() => {
      cancelled = true;
    });
  }, [activeDate]);

  const dayAppointments = useMemo(() => getAppointmentsByDate(activeDate), [getAppointmentsByDate, activeDate]);

  const filteredAppointments = useMemo(() => {
    return dayAppointments.filter((a) => {
      if (filters.status !== "all" && a.status !== filters.status) return false;
      if (filters.serviceId !== "all" && a.serviceId !== filters.serviceId) return false;
      if (filters.customerName.trim()) {
        const query = filters.customerName.trim().toLocaleLowerCase("tr-TR");
        if (!a.fullName.toLocaleLowerCase("tr-TR").includes(query)) return false;
      }
      return true;
    });
  }, [dayAppointments, filters]
  );

  const { slots: rescheduleSlots } = useAvailability(rescheduleDate);

  function goToPrevDay() {
    setActiveDate(dayjs(activeDate).subtract(1, "day").format("YYYY-MM-DD"));
  }
  function goToNextDay() {
    setActiveDate(dayjs(activeDate).add(1, "day").format("YYYY-MM-DD"));
  }

  function openDetail(appointment) {
    setSelectedAppointment(appointment);
    setRescheduleMode(false);
    setRescheduleDate(appointment.date);
    setRescheduleTime(appointment.time);
  }

  function closeDetail() {
    setSelectedAppointment(null);
    setRescheduleMode(false);
  }

  async function handleApprove() {
    try {
      await approveAppointment(selectedAppointment.id);
      toast.success("Randevu onaylandı");
      await fetchByDate(activeDate);
      closeDetail();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    }
  }

  async function handleComplete() {
    try {
      await completeAppointment(selectedAppointment.id);
      toast.success("Randevu tamamlandı olarak işaretlendi");
      await fetchByDate(activeDate);
      closeDetail();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    }
  }

  async function handleCancel() {
    try {
      await cancelAppointment(selectedAppointment.id);
      toast.info("Randevu iptal edildi");
      await fetchByDate(activeDate);
      closeDetail();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Bu randevu kaydı silinsin mi?")) return;
    try {
      await deleteAppointment(selectedAppointment.id);
      toast.info("Randevu silindi");
      await fetchByDate(activeDate);
      closeDetail();
    } catch (err) {
      toast.error(err.message || "Silme başarısız");
    }
  }

  async function handleBlock() {
    if (!window.confirm(`${selectedAppointment.fullName} engellensin mi?`)) return;
    try {
      blockCustomer(selectedAppointment.fullName, selectedAppointment.phone, "Admin tarafından engellendi");
      await cancelAppointment(selectedAppointment.id);
      toast.info("Müşteri engellendi");
      await fetchByDate(activeDate);
      closeDetail();
    } catch (err) {
      toast.error(err.message || "İşlem başarısız");
    }
  }

  async function handleReschedule() {
    try {
      await rescheduleAppointment(selectedAppointment.id, rescheduleDate, rescheduleTime);
      toast.success("Randevu tarihi güncellendi");
      await fetchByDate(activeDate);
      closeDetail();
    } catch (err) {
      if (err.code === "SLOT_FULL") {
        toast.error("Seçilen saat dolu");
      } else if (err.code === "DATE_CLOSED") {
        toast.error("Bu tarihte işletme kapalı");
      } else {
        toast.error(err.message || "Güncelleme başarısız");
      }
    }
  }

  return (
    <div className="admin-appointments">
      <div className="admin-date-nav">
        <button type="button" onClick={goToPrevDay} aria-label="Önceki gün">
          <ChevronLeft size={18} />
        </button>
        <span>{formatDateTR(activeDate)}</span>
        <button type="button" onClick={goToNextDay} aria-label="Sonraki gün">
          <ChevronRight size={18} />
        </button>
      </div>

      <AppointmentFilters onChange={setFilters} />

      {filteredAppointments.length === 0 ? (
        <p className="admin-appointments__empty">
          {dayAppointments.length === 0 ? "Bu gün için randevu bulunmuyor." : "Filtrelere Uyan Randevu Bulunamadı"}
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>İşlem</th>
              <th className="admin-table__desktop-only">Saat</th>
              <th className="admin-table__desktop-only">Telefon</th>
              <th className="admin-table__desktop-only">Ücret</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((a) => (
              <tr key={a.id} onClick={() => openDetail(a)} className="admin-table__row">
                <td>{a.fullName}</td>
                <td>{a.serviceName}</td>
                <td className="admin-table__desktop-only">{a.time}</td>
                <td className="admin-table__desktop-only">{a.phone}</td>
                <td className="admin-table__desktop-only">{a.price} ₺</td>
                <td>
                  <Badge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal
        isOpen={Boolean(selectedAppointment)}
        onClose={closeDetail}
        title="Randevu Detayı"
      >
        {selectedAppointment && !rescheduleMode && (
          <div className="appointment-detail">
            <dl>
              <div>
                <dt>Ad Soyad</dt>
                <dd>{selectedAppointment.fullName}</dd>
              </div>
              <div>
                <dt>Telefon</dt>
                <dd>{selectedAppointment.phone}</dd>
              </div>
              <div>
                <dt>Tarih</dt>
                <dd>{formatDateTR(selectedAppointment.date)}</dd>
              </div>
              <div>
                <dt>Saat</dt>
                <dd>{selectedAppointment.time}</dd>
              </div>
              <div>
                <dt>İşlem</dt>
                <dd>
                  {selectedAppointment.serviceName} ({selectedAppointment.durationMinutes} dk)
                </dd>
              </div>
              <div>
                <dt>Ücret</dt>
                <dd>{selectedAppointment.price} ₺</dd>
              </div>
              <div>
                <dt>Durum</dt>
                <dd>
                  <Badge status={selectedAppointment.status} />
                </dd>
              </div>
            </dl>

            <div className="appointment-detail__actions">
              {selectedAppointment.status === APPOINTMENT_STATUS.PENDING && (
                <Button onClick={handleApprove}>
                  <Check size={16} /> Onayla
                </Button>
              )}
              {/* Sadece Onaylanmis Randevular Tamamlandi Olarak Isaretlenebilir */}
              {selectedAppointment.status === APPOINTMENT_STATUS.APPROVED && (
                <Button onClick={handleComplete}>
                  <CheckCheck size={16} /> Tamamlandı Olarak İşaretle
                </Button>
              )}
              <Button variant="ghost" onClick={() => setRescheduleMode(true)}>
                <CalendarClock size={16} /> Tarihi Değiştir
              </Button>
              {selectedAppointment.status !== APPOINTMENT_STATUS.CANCELLED && (
                <Button variant="ghost" onClick={handleCancel}>
                  İptal Et
                </Button>
              )}
              <Button variant="danger" onClick={handleBlock}>
                <Ban size={16} /> Müşteriyi Engelle
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                <Trash2 size={16} /> Kaydı Sil
              </Button>
            </div>
          </div>
        )}

        {selectedAppointment && rescheduleMode && (
          <div className="appointment-reschedule">
            <label className="ui-field__label" htmlFor="reschedule-date">
              Yeni tarih
            </label>
            <input
              id="reschedule-date"
              type="date"
              className="ui-field__input"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <label className="ui-field__label" htmlFor="reschedule-time">
              Yeni saat
            </label>
            <select
              id="reschedule-time"
              className="ui-field__input ui-field__select"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            >
              <option value="">Saat seçin</option>
              {rescheduleSlots.map((slot) => (
                <option key={slot.time} value={slot.time} disabled={slot.isDisabled && slot.time !== selectedAppointment.time}>
                  {slot.time} {slot.isFull && slot.time !== selectedAppointment.time ? "(Dolu)" : ""}
                </option>
              ))}
            </select>
            <div className="appointment-detail__actions">
              <Button onClick={handleReschedule} disabled={!rescheduleDate || !rescheduleTime}>
                Kaydet
              </Button>
              <Button variant="ghost" onClick={() => setRescheduleMode(false)}>
                Vazgeç
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function BlockedCustomersTab() {
  const { blockedCustomers, unblockCustomer, refresh } = useBlockedCustomers();
  const [isLoading, setIsLoading] = useState(true);

  // Engellenen Musteriler Sekmesi Acildiginda 
  // Backend'den Engellenen Musterileri Aliyoruz
  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((err) => {
        console.error(err);
        toast.error("Engellenen müşteriler yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUnblock(id) {
    try {
      await unblockCustomer(id);
    } catch (err) {
      console.error(err);
      toast.error("Engel kaldırılamadı");
    }
  }

  if (isLoading) return <p className="admin-appointments__empty">Yükleniyor...</p>;

  return (
    <div className="admin-blocked">
      {blockedCustomers.length === 0 ? (
        <p className="admin-appointments__empty">Engellenen müşteri bulunmuyor.</p>
      ) : (
        <ul className="admin-blocked__list">
          {blockedCustomers.map((b) => (
            <li key={b.id} className="admin-blocked__item">
              <div>
                <strong>{b.fullName}</strong>
                <span>{b.phone}</span>
                <span className="admin-blocked__date">{formatDateShort(b.blockedAt)} tarihinde engellendi</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => unblockCustomer(b.id)}>
                Engeli Kaldır
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
