import { criarQuadra, ZONAS, NOME_ZONA, FUNCOES } from './quadra.js?v=20261030-1';
import { esc, negrito } from './dados.js?v=20261030-1';

// vizinhos de cada posição na regra de sobreposição
const FRENTE = [4, 3, 2], FUNDO = [5, 6, 1];
const PAR = { 1: 2, 2: 1, 3: 6, 6: 3, 4: 5, 5: 4 };
export function vizinhos(n) {
  const linha = FRENTE.includes(n) ? FRENTE : FUNDO, i = linha.indexOf(n);
  return { par: PAR[n], naFrente: FRENTE.includes(n), esq: linha[i - 1], dir: linha[i + 1] };
}

// "Se você é a 1, a 2 tem que estar à sua frente e a 6 à sua esquerda."
export function fraseSobreposicao(n) {
  const v = vizinhos(n), partes = [`a ${v.par} tem que estar ${v.naFrente ? 'atrás de você' : 'à sua frente'}`];
  if (v.esq) partes.push(`a ${v.esq} tem que estar à sua esquerda`);
  if (v.dir) partes.push(`a ${v.dir} tem que estar à sua direita`);
  const ultima = partes.pop();
  return `Se você é a ${n}, ${partes.length ? partes.join(', ') + ' e ' : ''}${ultima}.`;
}

// setas da regra: da posição n até cada vizinho com quem ela se compara
export function linhasSobreposicao(n) {
  const v = vizinhos(n), de = { x: ZONAS[n].x, y: ZONAS[n].y };
  return [v.par, v.esq, v.dir].filter(Boolean).map(m => {
    const alvo = ZONAS[m], dx = alvo.x - de.x, dy = alvo.y - de.y, d = Math.hypot(dx, dy);
    const txt = m === v.par ? (v.naFrente ? 'atrás' : 'à frente') : m === v.esq ? 'à esquerda' : 'à direita';
    return { de: { x: de.x + dx * 7 / d, y: de.y + dy * 7 / d }, para: { x: alvo.x - dx * 7.5 / d, y: alvo.y - dy * 7.5 / d }, txt };
  });
}

// nome de cada zona e um detalhe sobre ela (sem repetir o nome)
export const ZONA_NOME = { 1: 'fundo direita', 2: 'frente direita', 3: 'frente meio', 4: 'frente esquerda', 5: 'fundo esquerda', 6: 'fundo meio' };
export const ZONA_DESCRICAO = {
  1: 'É de onde sai quem saca.', 2: 'Fica na rede e também é chamada de saída.',
  3: 'Fica na rede, no meio. É o lugar do central.', 4: 'Fica na rede e também é chamada de entrada.',
  5: 'Na defesa, costuma ser o lugar do líbero.', 6: 'Cobre o meio do fundo e as bolas longas.',
};

// jogadores genéricos numerados para as ilustrações
export const NUMERADOS = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [String(n), { nome: `Posição ${n}`, funcao: 'atacante' }]));
export const LETRAS = Object.fromEntries(['A', 'B', 'C', 'D', 'E', 'F'].map(l => [l, { nome: `Jogador ${l}`, funcao: 'atacante' }]));
const noCentro = n => ({ x: ZONAS[n].x, y: ZONAS[n].y });

export function iniciarFundamentos(ctx) {
  const $ = id => document.getElementById(id);
  const { fundamentos } = ctx;
  const paragrafos = lista => lista.map(t => `<p>${negrito(t)}</p>`).join('');

  $('f-blocos').innerHTML = fundamentos.blocos.map(b => `
    <section class="bloco vh-card" id="fb-${esc(b.id)}">
      <h2>${esc(b.titulo)}</h2>
      <div class="${b.interativo === 'funcoes' ? '' : 'bloco-duplo'}">
        <div class="texto">${paragrafos(b.texto || [])}</div>
        <div class="interativo" data-tipo="${esc(b.interativo)}"></div>
      </div>
      ${b.quando ? `<div class="quando texto">${paragrafos(b.quando)}</div>` : ''}
    </section>`).join('');
  $('f-fonte').textContent = fundamentos.fonte || '';

  for (const b of fundamentos.blocos) {
    const alvo = document.querySelector(`#fb-${CSS.escape(b.id)} .interativo`);
    ({ numeracao, rotacao, sobreposicao, funcoes }[b.interativo])?.(alvo, b);
  }

  // ---- Numeração: tocar numa zona mostra o nome dela ----
  function numeracao(alvo, b) {
    alvo.innerHTML = `<div class="vh-quadra"></div><p class="dica">${esc(b.dica || '')}</p><div class="saida-interativa" aria-live="polite"></div>`;
    const saida = alvo.querySelector('.saida-interativa');
    const q = criarQuadra(alvo.querySelector('.vh-quadra'), {
      onZona: z => {
        if (z === 'S') { saida.textContent = 'Zona de saque: atrás da linha de fundo, de onde a posição 1 saca.'; q.marcarZonas({ S: 'marcada' }); q.acenderNumeros([]); return; }
        q.marcarZonas({ [z]: 'marcada' });
        q.acenderNumeros([z]);
        saida.innerHTML = `<strong>Zona ${z}</strong> · ${esc(ZONA_NOME[z])}. ${esc(ZONA_DESCRICAO[z])}`;
      },
    });
    q.acenderNumeros([1, 2, 3, 4, 5, 6]);
  }

  // ---- Rotação: girar no sentido horário, com animação ----
  function rotacao(alvo, b) {
    alvo.innerHTML = `<div class="vh-quadra"></div>
      <div class="acoes" style="margin-top:8px"><button class="vh-btn vh-btn--escuro">Girar</button></div>
      <div class="saida-interativa" aria-live="polite"></div>`;
    const q = criarQuadra(alvo.querySelector('.vh-quadra'), { jogadores: LETRAS, numeros: 'baixo' });
    const saida = alvo.querySelector('.saida-interativa');
    // ordem[zona] = jogador; depois do giro, quem está na zona z vai para DEPOIS[z]
    const DEPOIS = { 2: 1, 1: 6, 6: 5, 5: 4, 4: 3, 3: 2 };
    let ordem = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F' }, giros = 0;
    const posDe = o => Object.fromEntries(Object.entries(o).map(([z, j]) => [j, noCentro(z)]));
    // com setas: cada um aponta para a zona para onde vai no próximo giro
    const comSetas = o => Object.fromEntries(Object.entries(o).map(([z, j]) => [j, { ...noCentro(z), para: noCentro(DEPOIS[z]) }]));
    const texto = () => { saida.innerHTML = `Quem saca agora é o <strong>jogador ${ordem[1]}</strong>, que está na posição 1. ${giros ? `Antes do giro, ele estava na posição 2.` : 'Toque em Girar quando o time recuperar o saque.'}`; };
    q.mostrar(comSetas(ordem), { destaque: ordem[1] });
    texto();
    alvo.querySelector('button').onclick = () => {
      const antes = posDe(ordem);
      ordem = { 1: ordem[2], 2: ordem[3], 3: ordem[4], 4: ordem[5], 5: ordem[6], 6: ordem[1] };
      giros++;
      const agora = ordem;
      q.animar(antes, posDe(ordem), { destaque: ordem[1], duracao: 1200, aoTerminar: () => { if (agora === ordem) q.mostrar(comSetas(ordem), { destaque: ordem[1] }); } });
      texto();
    };
  }

  // ---- Sobreposição: escolha a sua posição e veja com quem se comparar ----
  function sobreposicao(alvo, b) {
    alvo.innerHTML = `<span class="vh-rotulo">Eu sou a posição</span>
      <div class="vh-chips">${[1, 2, 3, 4, 5, 6].map(n => `<button class="vh-chip" data-n="${n}" aria-pressed="${n === 1}">${n}</button>`).join('')}</div>
      <div class="vh-quadra" style="margin-top:10px"></div>
      <div class="saida-interativa" aria-live="polite"></div>`;
    const q = criarQuadra(alvo.querySelector('.vh-quadra'), { jogadores: NUMERADOS });
    const saida = alvo.querySelector('.saida-interativa');
    const todos = Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [String(n), noCentro(n)]));
    function escolher(n) {
      const v = vizinhos(n), envolvidos = [v.par, v.esq, v.dir].filter(Boolean);
      const classes = {};
      for (const m of [1, 2, 3, 4, 5, 6]) if (m !== n && !envolvidos.includes(m)) classes[m] = 'apagado';
      q.mostrar(todos, { setas: false, destaque: String(n), classes });
      q.linhas(linhasSobreposicao(n));
      alvo.querySelectorAll('.vh-chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.n === String(n)));
      const fora = [1, 2, 3, 4, 5, 6].filter(m => m !== n && !envolvidos.includes(m));
      saida.innerHTML = `${esc(fraseSobreposicao(n))} <span class="dica" style="display:block;margin-top:4px">Com ${fora.join(', ').replace(/, (\d)$/, ' e $1')} você não precisa se comparar.</span>`;
    }
    alvo.querySelector('.vh-chips').onclick = e => { const c = e.target.closest('[data-n]'); if (c) escolher(Number(c.dataset.n)); };
    escolher(1);
  }

  // ---- Funções ----
  function funcoes(alvo, b) {
    const sigla = { levantador: 'L', oposto: 'OP', ponteiro: 'P', central: 'C', libero: 'LI' };
    alvo.innerHTML = `<ul class="lista-funcoes">${b.funcoes.map(f => `
      <li><span class="bolinha" style="background:${FUNCOES[f.funcao]?.cor};${f.funcao === 'levantador' ? 'color:#fff' : ''}">${sigla[f.funcao] || ''}</span>
      <span><strong>${esc(f.nome)}</strong>${esc(f.texto)}${f.zonas ? `<span class="zonas-funcao">${f.zonas.map(z => `<span>${esc(z)}</span>`).join('')}</span>` : ''}</span></li>`).join('')}</ul>
      ${b.restricoes ? `<div class="restricoes vh-card vh-card--roxo"><strong>${esc(b.restricoes.titulo)}</strong><ul>${b.restricoes.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>` : ''}`;
  }

  $('f-treinar').onclick = () => ctx.abrir('treino', { tema: 'fundamentos' });
  return {};
}

export { NOME_ZONA };
