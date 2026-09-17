import type { Tipo } from './api/client';

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_ABREV_CAP = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const LABEL_TIPO: Record<Tipo, string> = {
  texto: 'texto',
  audio: 'áudio',
  imagem: 'foto',
};

export const LABEL_TIPO_DETALHE: Record<Tipo, string> = {
  texto: 'Captura por texto',
  audio: 'Captura por áudio',
  imagem: 'Captura por foto',
};

export function formatarDataHora(timestamp: string): string {
  const data = new Date(timestamp);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = MESES_ABREV_CAP[data.getMonth()];
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${dia} ${mes} ${data.getFullYear()} ${hora}h${min}`;
}

export function formatarQuando(timestamp: string): string {
  const data = new Date(timestamp);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = MESES_ABREV[data.getMonth()];
  const hora = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${dia} ${mes} ${data.getFullYear()} · ${hora}:${min}`;
}
