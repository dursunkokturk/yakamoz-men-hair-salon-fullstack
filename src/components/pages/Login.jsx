import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { username: "", password: "" } });

  async function onSubmit(values) {
    try {
      await login(values.username.trim(), values.password);
      toast.success("Hoş geldiniz");
      navigate("/admin");
    } catch (err){
      setError("root", { message: "Kullanıcı adı veya şifre hatalı" });
    }
  }

  return (
    <div className="page page--login">
      <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="login-form__icon">
          <LogIn size={28} />
        </div>
        <h1>Berber Paneli Girişi</h1>
        <p>Randevuları yönetmek için giriş yapın.</p>

        <Input
          label="Kullanıcı adı"
          error={errors.username?.message}
          {...register("username", { required: "Kullanıcı adı zorunludur" })}
        />
        <Input
          label="Şifre"
          type="password"
          error={errors.password?.message}
          {...register("password", { required: "Şifre zorunludur" })}
        />
        {errors.root && <p className="login-form__error">{errors.root.message}</p>}

        <Button type="submit" size="lg" isLoading={isSubmitting}>
          Giriş Yap
        </Button>
      </form>
    </div>
  );
}
