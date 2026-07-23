import { useState } from "react";
import { toast } from "react-toastify";
import { Trash2, Plus } from "lucide-react";
import { useClosedDays } from "../../context/ClosedDayContext";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { formatDateTR } from "../../utils/dateUtils";

const CLOSURE_REASONS = ["Resmi Tatil", "Cenaze", "Hastalık", "Bakım", "Diğer"];

export function ClosedDaysManager() {
  const { closedDays, addClosedDay, removeClosedDay } = useClosedDays();
  const [date, setDate] = useState("");
  const [reasonType, setReasonType] = useState(CLOSURE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  async function handleAdd() {
    if (!date) return toast.error("Lütfen bir tarih seçin");
    const finalReason = reasonType === "Diğer" ? (customReason.trim() || "Diğer") : reasonType;
    try {
      await addClosedDay(date, finalReason);
      toast.success("Kapalı gün eklendi");
      setDate("");
      setCustomReason("");
      setReasonType(CLOSURE_REASONS[0])
    } catch (err) {
      if (err.message === "ALREADY_CLOSED") {
        toast.error("Bu tarih zaten kapalı olarak işaretli");
      } else {
        toast.error("Kapalı gün eklenemedi");
      }
    }
  }

  return (
    <div className="closed-days-manager">
      <div className="closed-days-manager__form">
        <input type="date" className="ui-field__input" value={date} onChange={(e) => setDate(e.target.value)} />

        <Select value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
          {CLOSURE_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>

        {reasonType === "Diğer" && (
          <input
            type="text"
            className="ui-field__input"
            placeholder="Neden (Resmi tatil, bakım, vb.)"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
          />
        )}
        <Button size="sm" onClick={handleAdd}><Plus size={16} /> Ekle</Button>
      </div>
      <ul className="closed-days-manager__list">
        {closedDays.map((d) => (
          <li key={d.id}>
            <span>{formatDateTR(d.date)} — {d.reason || "Belirtilmedi"}</span>
            <button onClick={() => removeClosedDay(d.id)} aria-label="Sil"><Trash2 size={16} /></button>
          </li>
        ))}
        {closedDays.length === 0 && <p className="service-manager__empty">Kapalı gün eklenmedi.</p>}
      </ul>
    </div>
  );
}