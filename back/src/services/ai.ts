// Seam único de invocação de IA. Hoje seria Claude Code CLI headless (`claude -p`)
// via subprocess, usando login de assinatura — sem custo extra de API.
//
// A Anthropic sinalizou que pode revisar de novo a política de billing do `claude -p`
// (a mudança que tiraria isso da cota da assinatura foi pausada, não cancelada) —
// checar support.claude.com periodicamente enquanto isso rodar em produção. Se a
// política mudar, as opções de troca (sem reescrever quem chama esta função) são: API
// key da Claude Platform com limite de gasto, ou uma IA local/open-source.
export async function executarSkill(_skill: string, _input: unknown): Promise<never> {
  throw new Error('services/ai.ts: invocação de IA ainda não implementada');
}