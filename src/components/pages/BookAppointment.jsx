import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { toast } from "react-toastify";
import { CheckCircle2 } from "lucide-react";
import { useServices } from "../../context/ServiceContext";
import { useAppointments } from "../../context/AppointmentContext";
import { useAvailability } from "../../hooks/useAvailability";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Calendar } from "../ui/Calendar";
import { formatPhoneInput, isValidPhone, isValidName, normalizeName } from "../../utils/validation";
import { formatDateTR } from "../../utils/dateUtils";

export function BookAppointment() {
  const { activeServices } = useServices();
  const { createAppointment } = useAppointments();
  const location = useLocation();
  const navigate = useNavigate();

  const preselectedServiceId = location.state?.preselectedServiceId ?? "";
  const [selectedDate, setSelectedDate] = useState(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      fullName: "",
      phone: "",
      serviceId: preselectedServiceId,
      time: "",
    },
  });

  const selectedServiceId = watch("serviceId");
  const selectedService = activeServices.find((s) => s.id === selectedServiceId);
  const { isOpen, slots, closedReason } = useAvailability(selectedDate);

  async function onSubmit(values) {
    const fullName = normalizeName(values.fullName);

    if (!selectedDate) {
      toast.error("Lütfen bir tarih seçin");
      return;
    }
    if (!values.time) {
      toast.error("Lütfen bir saat seçin");
      return;
    }
    const service = activeServices.find((s) => s.id === values.serviceId);
    if (!service) {
      toast.error("Lütfen bir işlem seçin");
      return;
    }

    try {
      const appointment = await createAppointment({
        fullName,
        phone: values.phone.trim(),
        date: selectedDate,
        time: values.time,
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
      });
      setConfirmedAppointment(appointment);
      toast.success("Randevunuz alındı, admin onayı bekleniyor");
    } catch (err) {
      if (err.message === "CUSTOMER_BLOCKED") {
        toast.error("Bu isimle randevu oluşturulamıyor. Lütfen berberle iletişime geçin.");
      }
      if (err.message === "SLOT_FULL") {
        toast.error("Bu saat dolu, lütfen başka bir saat seçin");
      } else if (err.message === "DATE_CLOSED") {
        toast.error("İşletme bu tarihte kapalı, lütfen başka bir gün seçin");
      } else {
        toast.error("Randevu oluşturulamadı, tekrar deneyin");
      }
    }
  }

  if (confirmedAppointment) {
    return (
      <div className="page page--confirmation">
        <div className="confirmation-card">
          <CheckCircle2 size={48} className="confirmation-card__icon" />
          <h1>Randevunuz alındı</h1>
          <p>Randevunuz berber onayı bekliyor. Onaylandığında telefonunuzdan takip edebilirsiniz.</p>
          <dl className="confirmation-card__details">
            <div>
              <dt>Ad Soyad</dt>
              <dd>{confirmedAppointment.fullName}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{confirmedAppointment.phone}</dd>
            </div>
            <div>
              <dt>Tarih</dt>
              <dd>{formatDateTR(confirmedAppointment.date)}</dd>
            </div>
            <div>
              <dt>Saat</dt>
              <dd>{confirmedAppointment.time}</dd>
            </div>
            <div>
              <dt>İşlem</dt>
              <dd>
                {confirmedAppointment.serviceName} ({confirmedAppointment.durationMinutes} dk)
              </dd>
            </div>
            <div>
              <dt>Ücret</dt>
              <dd>{confirmedAppointment.price} ₺</dd>
            </div>
          </dl>
          <div className="confirmation-card__actions">
            <Button onClick={() => navigate("/randevularim")}>Randevularımı Gör</Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              Ana Sayfaya Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page page--book">
      <div className="page-header">
        <h1>Randevu Al</h1>
        <p>Bilgilerinizi girin, uygun bir tarih ve saat seçin.</p>
      </div>

      <form className="booking-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="booking-form__grid">
          <div className="booking-form__fields">
            <Input
              label="Ad Soyad"
              placeholder="Adınız Soyadınız"
              error={errors.fullName?.message}
              {...register("fullName", {
                required: "Ad soyad zorunludur",
                validate: (v) => isValidName(v) || "Lütfen sadece harflerden oluşan geçerli bir ad soyad girin",
              })}
            />

            <Controller
              control={control}
              name="phone"
              rules={{
                required: "Telefon numarası zorunludur",
                validate: (v) => isValidPhone(v) || "Telefon 0555 555 55 55 formatında olmalı",
              }}
              render={({ field }) => (
                <Input
                  label="Telefon"
                  placeholder="0555 555 55 55"
                  inputMode="numeric"
                  value={field.value}
                  onChange={(e) => field.onChange(formatPhoneInput(e.target.value))}
                  error={errors.phone?.message}
                />
              )}
            />

            <Select
              label="Yapılacak İşlem"
              error={errors.serviceId?.message}
              {...register("serviceId", { required: "Lütfen bir işlem seçin" })}
            >
              <option value="">İşlem seçin</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} dk · {service.price} ₺
                </option>
              ))}
            </Select>

            {selectedService && (
              <div className="booking-form__service-summary">
                <span>Süre: {selectedService.durationMinutes} dk</span>
                <span>Ücret: {selectedService.price} ₺</span>
              </div>
            )}
          </div>

          <div className="booking-form__schedule">
            <span className="ui-field__label">Tarih Seçin</span>
            <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            {selectedDate && (
              <div className="booking-form__times">
                <span className="ui-field__label">Saat Seçin — {formatDateTR(selectedDate)}</span>
                {!isOpen ? (
                  <p className="booking-form__closed">{closedReason || "Bu gün kapalıyız, lütfen başka bir gün seçin."}</p>
                ) : (
                  <div className="time-slot-grid">
                    {slots.map((slot) => (
                      <label
                        key={slot.time}
                        className={`time-slot ${slot.isDisabled ? "time-slot--disabled" : ""} ${watch("time") === slot.time ? "time-slot--selected" : ""
                          }`}
                      >
                        <input
                          type="radio"
                          value={slot.time}
                          disabled={slot.isDisabled}
                          {...register("time", { required: true })}
                          className="time-slot__input"
                        />
                        {slot.time}
                        {slot.isFull && <span className="time-slot__tag">Dolu</span>}
                      </label>
                    ))}
                  </div>
                )}
                {errors.time && <span className="ui-field__error">Lütfen bir saat seçin</span>}
              </div>
            )}
          </div>
        </div>

        <Button type="submit" size="lg" isLoading={isSubmitting} className="booking-form__submit">
          Randevuyu Onayla
        </Button>
      </form>
    </div>
  );
}
