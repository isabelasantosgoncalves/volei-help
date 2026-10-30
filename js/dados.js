// Carregamento dos dados (sistemas, variações, fundamentos) e funções de acesso.
// Tudo é estático em data/: o mesmo código serve para o site e, no futuro, para o app (PWA).

export const FASES = {
  saque: 'Saque',
  recepcao: 'Recepção',
  defesa: 'Defesa',
};

const json = url => fetch(url, { cache: 'no-store' }).then(r => {
  if (!r.ok) throw new Error(`Não foi possível carregar ${url}`);
  return r.json();
});

// Carrega todos os sistemas listados em data/sistemas/index.json (com as variações de cada um).
export async function carregarSistemas() {
  const indice = await json('data/sistemas/index.json');
  const lista = await Promise.all(indice.map(async item => {
    const sis = await json(`data/sistemas/${item.arquivo}`);
    sis.variacoes = item.variacoes ? (await json(`data/variacoes/${item.variacoes}`)).variacoes : [];
    sis.rotulo = item.nome;
    return sis;
  }));
  return { lista, porId: Object.fromEntries(lista.map(s => [s.id, s])) };
}

export const carregarFundamentos = () => json('data/fundamentos/fundamentos.json');

// posições padrão de uma fase (no saque depende da regra escolhida)
export function posicoes(rodizio, fase, regra) {
  const f = rodizio.fases[fase];
  return fase === 'saque' ? f[regra] : f.posicoes;
}

export function resumo(rodizio, fase, regra) {
  const r = rodizio.fases[fase].resumo;
  return typeof r === 'string' ? r : r?.[regra] || '';
}

// variações que se aplicam a este rodízio e fase
export function variacoesDe(sis, rodizio, fase) {
  return (sis.variacoes || []).filter(v => v.fase === fase && v.rodizios[rodizio.id]);
}

// posição oficial (1–6) do jogador na ordem do rodízio; o líbero herda a do central que substitui
export function posicaoOficial(rodizio, id, emQuadra) {
  for (const [pos, j] of Object.entries(rodizio.ordem)) if (j === id) return Number(pos);
  if (id === 'LI') {
    for (const [pos, j] of Object.entries(rodizio.ordem)) if (j[0] === 'C' && !emQuadra[j]) return Number(pos);
  }
  return null;
}

// quem levanta neste rodízio (5-1: L; 4-2 e 6-0: o levantador da vez)
export const levantadorDe = rodizio => rodizio.levantador || 'L';
export const numeroLevantador = rodizio => posicaoOficial(rodizio, levantadorDe(rodizio), {});

// no 6-0 o levantador da vez ganha a cor de levantador
export const funcoesDe = (sis, rodizio) =>
  rodizio.levantador && sis.jogadores[rodizio.levantador]?.funcao !== 'levantador' ? { [rodizio.levantador]: 'levantador' } : {};

// artigo + nome em minúsculas: "o oposto", "o ponteiro 1"
export const comArtigo = (sis, id) => 'o ' + sis.jogadores[id].nome.toLowerCase();

export const sortear = lista => lista[Math.floor(Math.random() * lista.length)];

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// **negrito** em textos de dados (já escapados)
export const negrito = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

export const guardar = {
  ler(chave, padrao) {
    try { const v = localStorage.getItem('vh-' + chave); return v === null ? padrao : JSON.parse(v); }
    catch { return padrao; }
  },
  salvar(chave, valor) {
    try { localStorage.setItem('vh-' + chave, JSON.stringify(valor)); } catch { /* sem armazenamento */ }
  },
};
