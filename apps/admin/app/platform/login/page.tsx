import { PlatformLoginForm } from "@/components/PlatformLoginForm";

export default function PlatformLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center text-lg font-semibold">
          <span className="text-emerald-400">Venta</span>
          <span className="text-blue-400">XLink</span>
          <span className="block text-sm font-normal text-slate-500">Acceso plataforma</span>
        </h1>
        <PlatformLoginForm />
      </div>
    </div>
  );
}
