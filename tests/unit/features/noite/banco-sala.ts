import { vi } from "vitest";

export const SALA = "5b0f3c9e-6a1d-4c51-9a8e-2f4d1c7b9e10";
export const RIR = { humor: "animado", experiencia: "rir", companhia: "a-dois" };
export const TENSO = { humor: "cansado", experiencia: "tenso", companhia: "a-dois" };

type Resposta = { data?: unknown; error?: { code: string; message: string } | null };

/** Supabase falso: `rpc` responde por nome; a leitura de `salas_noite` devolve `linha`. */
export function bancoFalso(rpcs: Record<string, Resposta>, linha: object | null = null) {
  const rpc = vi.fn(async (nome: string) => ({ data: null, error: null, ...rpcs[nome] }));
  const consulta = {
    select: () => consulta,
    eq: () => consulta,
    maybeSingle: async () => ({ data: linha, error: null }),
  };
  const cliente = {
    rpc,
    from: () => consulta,
    auth: { getUser: async () => ({ data: { user: { id: "u-1" } } }) },
  };
  return { cliente: cliente as never, rpc };
}
