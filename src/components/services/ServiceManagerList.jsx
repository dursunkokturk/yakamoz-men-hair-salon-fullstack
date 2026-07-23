import { useState } from "react";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { useServices } from "../../context/ServiceContext";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { ServiceForm } from "./ServiceForm";
import { toast } from "react-toastify";

export function ServiceManagerList() {
  const { services, addService, updateService, deleteService, toggleServiceStatus } = useServices();
  const [editingService, setEditingService] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  function openNewForm() {
    setEditingService(null);
    setIsFormOpen(true);
  }

  function openEditForm(service) {
    setEditingService(service);
    setIsFormOpen(true);
  }

  async function handleSubmit(values) {
    try {
      if (editingService) {
        updateService(editingService.id, values);
        toast.success("Hizmet güncellendi");
      } else {
        addService(values);
        toast.success("Hizmet eklendi");
      }
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("İşlem Başarısız, Tekrar Deneyin");
    }
  }

  async function handleDelete(service) {
    if (window.confirm(`"${service.name}" hizmetini silmek istediğinize emin misiniz?`)) {
      try {
        deleteService(service.id);
        toast.info("Hizmet Silindi");
      } catch (err) {
        console.log(err);
        toast.error("Hizmet Silinemedi");
      }
    }
  }

  // Servis Aktif Pasif Bildirimi
  async function handleToggle(service) {
    try {
      toggleServiceStatus(service.id);
    toast.info(
      service.isActive ? `"${service.name}" pasife alındı` : `"${service.name}" aktif edildi`
    );
    } catch (err) {
      console.log(err)
      toast.error("Durum Güncellenemedi");
    }
  }

  return (
    <div className="service-manager">
      <div className="service-manager__header">
        <h3>Hizmetler</h3>
        <Button size="sm" onClick={openNewForm}>
          <Plus size={16} /> Yeni hizmet
        </Button>
      </div>
      <ul className="service-manager__list">
        {services.map((service) => (
          <li key={service.id} className="service-manager__item">
            <div>
              <strong>{service.name}</strong>
              <span className="service-manager__item-meta">
                {service.durationMinutes} dk · {service.price} ₺
              </span>
              <span className={`ui-badge ${service.isActive ? "ui-badge--approved" : "ui-badge--cancelled"}`}>
                {service.isActive ? "Aktif" : "Pasif"}
              </span>
            </div>
            <div className="service-manager__item-actions">
              <button type="button" onClick={() => handleToggle(service)} aria-label={service.isActive ? "Pasife al" : "Aktif et"}>
                {service.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button type="button" onClick={() => openEditForm(service)} aria-label="Düzenle">
                <Pencil size={16} />
              </button>
              <button type="button" onClick={() => handleDelete(service)} aria-label="Sil">
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
        {services.length === 0 && <p className="service-manager__empty">Henüz Hizmet Eklenmedi.</p>}
      </ul>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingService ? "Hizmeti Düzenle" : "Yeni Hizmet Ekle"}
      >
        <ServiceForm
          initialValues={editingService}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
