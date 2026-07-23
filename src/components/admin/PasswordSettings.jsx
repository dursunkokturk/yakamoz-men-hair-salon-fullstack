import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function PasswordSettings() {
  const { changePassword } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword");

  async function onSubmit(values) {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success("Şifreniz güncellendi");
      reset();
    } catch (err) {
      if (err.code === "WRONG_CURRENT_PASSWORD") {
        setError("currentPassword", { message: "Mevcut şifre hatalı" });
      } else if (err.code === "WEAK_PASSWORD") {
        setError("newPassword", { message: "Şifre en az 6 karakter olmalı" });
      } else {
        toast.error("Şifre güncellenemedi, tekrar deneyin");
      }
    }
  }

  return (
    <div className="password-settings">
      <div className="password-settings__header">
        <KeyRound size={20} />
        <h3>Şifre Değiştir</h3>
      </div>
      <form className="password-settings__form" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Mevcut Şifre"
          type="password"
          error={errors.currentPassword?.message}
          {...register("currentPassword", { required: "Mevcut şifre zorunludur" })}
        />
        <Input
          label="Yeni Şifre"
          type="password"
          error={errors.newPassword?.message}
          {...register("newPassword", {
            required: "Yeni şifre zorunludur",
            minLength: { value: 6, message: "Şifre en az 6 karakter olmalı" },
          })}
        />
        <Input
          label="Yeni Şifre (Tekrar)"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            required: "Şifreyi tekrar girin",
            validate: (v) => v === newPassword || "Şifreler eşleşmiyor",
          })}
        />
        <Button type="submit" isLoading={isSubmitting}>
          Şifreyi Güncelle
        </Button>
      </form>
    </div>
  );
}