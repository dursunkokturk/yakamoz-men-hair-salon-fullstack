const STATUS_LABELS = {
  pending: "Onay Bekliyor",
  approved: "Onaylandı",
  completed: "Tamamlandı",
  cancelled: "İptal Edildi",
};

export function Badge({ status, children }) {
  const key = status?.toLowerCase();
  const label = children ?? STATUS_LABELS[key] ?? status;
  return <span className={`ui-badge ui-badge--${key}`}>{label}</span>;
}
