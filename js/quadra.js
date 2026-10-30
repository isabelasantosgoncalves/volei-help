// Quadra em SVG reutilizável (Fundamentos, Sistemas, Treino e Prancheta).
// Coordenadas: x 0–100 (lateral esq. → dir.), y 0–100 (rede → fundo), y > 100 = zona de saque.
const SVGNS = 'http://www.w3.org/2000/svg';

export const FUNCOES = {
  levantador: { nome: 'Levantador', legenda: 'Levantador (L)', cor: 'var(--jogador-l)' },
  oposto:     { nome: 'Oposto',     legenda: 'Oposto (OP)', cor: 'var(--jogador-op)' },
  ponteiro:   { nome: 'Ponteiro',   legenda: 'Ponteiros (P1, P2)', cor: 'var(--jogador-p)' },
  central:    { nome: 'Central',    legenda: 'Centrais (C1, C2)', cor: 'var(--jogador-c)' },
  libero:     { nome: 'Líbero',     legenda: 'Líbero (LI)', cor: 'var(--jogador-li)' },
  atacante:   { nome: 'Jogador',    legenda: 'Jogadores (J1 a J6)', cor: 'var(--jogador-a)' },
};

// centro de cada zona numerada
export const ZONAS = {
  1: { x: 83.3, y: 66.7 }, 2: { x: 83.3, y: 16.7 }, 3: { x: 50, y: 16.7 },
  4: { x: 16.7, y: 16.7 }, 5: { x: 16.7, y: 66.7 }, 6: { x: 50, y: 66.7 },
};

export const NOME_ZONA = {
  1: 'zona 1 (fundo direita)', 2: 'zona 2 (frente direita)', 3: 'zona 3 (frente meio)',
  4: 'zona 4 (frente esquerda)', 5: 'zona 5 (fundo esquerda)', 6: 'zona 6 (fundo meio)', S: 'zona de saque',
};

export const LIMITE_BANCO = 128;

// Outfit: maiúsculas e números têm cerca de 0,7 em de altura; a linha de base fica 0,35 em abaixo do centro visual
const CENTRO_CAIXA_ALTA = 0.35;

export function zonaDoPonto(x, y) {
  if (y > 100) return 'S';
  const col = x < 33.3 ? 0 : x < 66.7 ? 1 : 2;
  return y < 33.3 ? [4, 3, 2][col] : [5, 6, 1][col];
}

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

const texto = (attrs, conteudo, parent) => {
  const t = el('text', attrs, parent);
  t.textContent = conteudo;
  return t;
};

let contador = 0;

// numeros: 'baixo' coloca o número de cada zona pequeno, abaixo e à esquerda do centro, para não ficar atrás dos jogadores nem das setas
export function criarQuadra(container, { jogadores = {}, banco = false, onZona = null, onBola = null, numeros = 'centro' } = {}) {
  const uid = ++contador;
  const altura = banco ? 170 : 142;
  const svg = el('svg', { viewBox: `-9 -10 118 ${altura - 4}`, class: 'quadra', role: 'img', 'aria-label': 'Quadra de vôlei' });
  const defs = el('defs', {}, svg);
  const mk = el('marker', { id: `seta${uid}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--marinho)' }, mk);
  const mk2 = el('marker', { id: `regra${uid}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto' }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--roxo)' }, mk2);

  // piso externo + quadra
  el('rect', { x: -9, y: -10, width: 118, height: altura, class: 'q-piso' }, svg);
  el('rect', { x: 0, y: 0, width: 100, height: 100, class: 'q-campo' }, svg);
  el('rect', { x: 0, y: 0, width: 100, height: 33.3, class: 'q-ataque' }, svg);

  // zonas clicáveis + números
  const gZonas = el('g', { class: 'q-zonas' + (onZona ? ' clicavel' : '') }, svg);
  const zonaEl = {}, numEl = {};
  for (const [n, c] of Object.entries(ZONAS)) {
    const frente = c.y < 33.3;
    zonaEl[n] = el('rect', { x: c.x - 16.65, y: frente ? 0 : 33.3, width: 33.3, height: frente ? 33.3 : 66.7, class: 'q-zona', 'data-zona': n }, gZonas);
    numEl[n] = numeros === 'baixo'
      ? texto({ x: c.x - 9, y: c.y + 9 + 7 * CENTRO_CAIXA_ALTA * 2, class: 'q-num q-num--baixo' }, n, gZonas)
      : texto({ x: c.x, y: c.y + 17 * CENTRO_CAIXA_ALTA, class: 'q-num' }, n, gZonas);
  }

  // zona de saque (também clicável)
  zonaEl.S = el('rect', { x: 0, y: 101.5, width: 100, height: 24.5, rx: 1.5, class: 'q-saque q-zona', 'data-zona': 'S' }, gZonas);

  // linhas
  el('rect', { x: 0, y: 0, width: 100, height: 100, class: 'q-linha' }, svg);
  el('line', { x1: 0, y1: 33.3, x2: 100, y2: 33.3, class: 'q-linha q-3m' }, svg);
  texto({ x: 101.5, y: 34.5, class: 'q-leg-lado' }, '3 m', svg);

  // rede com postes
  el('line', { x1: -5, y1: 0, x2: 105, y2: 0, class: 'q-rede' }, svg);
  el('circle', { cx: -5, cy: 0, r: 2, class: 'q-poste' }, svg);
  el('circle', { cx: 105, cy: 0, r: 2, class: 'q-poste' }, svg);
  texto({ x: 50, y: -4.5, class: 'q-leg q-leg-rede' }, 'REDE', svg);
  texto({ x: 50, y: 121, class: 'q-leg' }, 'ZONA DE SAQUE', svg);

  if (banco) {
    el('rect', { x: -5, y: LIMITE_BANCO + 2, width: 110, height: 22, rx: 3, class: 'q-banco' }, svg);
    texto({ x: 50, y: LIMITE_BANCO + 22.5, class: 'q-leg q-leg-banco' }, 'ARRASTE PARA A QUADRA', svg);
  }

  const gExtra = el('g', { class: 'q-extras' }, svg);
  const gDes = el('g', { class: 'q-desenhos' }, svg);
  const gFant = el('g', { class: 'q-fantasmas' }, svg);
  const gSetas = el('g', { class: 'q-setas' }, svg);
  const gJog = el('g', { class: 'q-jogadores' }, svg);
  container.appendChild(svg);

  if (onBola) {
    svg.classList.add('clicavel-bolas');
    gJog.addEventListener('click', e => { const g = e.target.closest('.q-bola'); if (g) onBola(g.dataset.id); });
  }

  if (onZona) {
    gZonas.addEventListener('click', e => {
      const z = e.target.closest('[data-zona]');
      if (z) onZona(z.dataset.zona === 'S' ? 'S' : Number(z.dataset.zona));
    });
  }

  const bolas = {};

  function bola(id) {
    if (bolas[id]) return bolas[id];
    const info = jogadores[id] || {};
    const g = el('g', { class: 'q-bola fora', 'data-id': id, 'data-funcao': info.funcao || '' }, gJog);
    g.style.setProperty('--cor', FUNCOES[info.funcao]?.cor || '#fff');
    el('circle', { r: 7.4, class: 'q-halo' }, g);
    el('circle', { r: 5.6, class: 'q-disco' }, g);
    texto({ class: 'q-sigla', y: 4.6 * CENTRO_CAIXA_ALTA }, id, g);
    // bolinha de vôlei de quem saca (só aparece com a classe "sacador")
    const saca = el('g', { class: 'q-saca', transform: 'translate(5.6 -5.6)' }, g);
    el('circle', { r: 2.6 }, saca);
    el('path', { d: 'M-2.4 -.9 Q0 .4 2.4 -.9 M-.9 2.4 Q.4 0 -.9 -2.4 M.9 2.4 Q2 .8 2.5 .6' }, saca);
    bolas[id] = g;
    return g;
  }

  // alvo: onde cada bolinha está (ou para onde está indo)
  const alvo = {};
  function mover(id, x, y) {
    bola(id).style.transform = `translate(${x}px, ${y}px)`;
    alvo[id] = { x, y };
  }

  // de → para; com saindoDeBola = false a seta começa no ponto (sem bolinha na origem)
  function seta(de, para, destaque, saindoDeBola = true) {
    const dx = para.x - de.x, dy = para.y - de.y, d = Math.hypot(dx, dy);
    if (d <= 8) return;
    const k1 = (saindoDeBola ? 6.4 : 1.5) / d, k2 = (d - 7) / d;
    el('line', {
      x1: de.x + dx * k1, y1: de.y + dy * k1, x2: de.x + dx * k2, y2: de.y + dy * k2,
      class: 'q-seta' + (destaque ? ' destaque' : ''), 'marker-end': `url(#seta${uid})`,
    }, gSetas);
    if (saindoDeBola) el('circle', { cx: para.x, cy: para.y, r: 1.3, class: 'q-alvo' }, gSetas);
    else el('circle', { cx: de.x, cy: de.y, r: 1.3, class: 'q-alvo' }, gSetas);
  }

  // origens: id → {x, y} de onde o jogador veio; quando informado, a seta chega na bolinha
  // funcoes: id → função, para trocar a cor de quem muda de papel (ex.: levantador da vez no 6-0)
  // sacador: id de quem saca (ganha uma bolinha de vôlei ao lado)
  function mostrar(posicoes, { destaque = null, setas = true, classes = {}, origens = null, funcoes = {}, sacador = null } = {}) {
    gSetas.replaceChildren();
    gFant.replaceChildren();
    for (const id in bolas) if (!posicoes[id]) bolas[id].classList.add('fora');
    for (const [id, p] of Object.entries(posicoes)) {
      const g = bola(id);
      const entrando = g.classList.contains('fora') || !alvo[id];
      const f = funcoes[id] || jogadores[id]?.funcao || '';
      g.setAttribute('data-funcao', f);
      g.style.setProperty('--cor', FUNCOES[f]?.cor || '#fff');
      g.setAttribute('class', 'q-bola' + (id === destaque ? ' destaque' : '') + (id === sacador ? ' sacador' : '') + (classes[id] ? ' ' + classes[id] : ''));
      // quem estava fora aparece direto no lugar, sem deslizar de onde sumiu
      if (entrando) { g.style.transition = 'opacity .3s'; mover(id, p.x, p.y); g.getBoundingClientRect(); g.style.transition = ''; }
      else mover(id, p.x, p.y);
      if (setas && origens) { if (origens[id]) seta(origens[id], p, id === destaque, false); }
      else if (setas && p.para) seta(p, p.para, id === destaque);
    }
  }

  // posição correta de quem errou: círculo tracejado + linha até ele
  function fantasmas(lista) {
    gFant.replaceChildren();
    for (const f of lista) {
      if (f.de) el('line', { x1: f.de.x, y1: f.de.y, x2: f.x, y2: f.y, class: 'q-fant-linha' }, gFant);
      el('circle', { cx: f.x, cy: f.y, r: 5.6, class: 'q-fant' }, gFant);
      texto({ x: f.x, y: f.y + 4.2 * CENTRO_CAIXA_ALTA, class: 'q-fant-sigla' }, f.id, gFant);
    }
  }

  function marcarZonas(mapa = {}) {
    for (const [n, z] of Object.entries(zonaEl)) {
      z.classList.remove('certa', 'errada', 'marcada');
      if (mapa[n]) z.classList.add(mapa[n]);
    }
  }

  // acende os números de algumas zonas (Fundamentos)
  function acenderNumeros(lista = []) {
    for (const [n, t] of Object.entries(numEl)) t.classList.toggle('aceso', lista.map(String).includes(n));
  }

  // linhas da regra de sobreposição: [{ de: {x,y}, para: {x,y}, txt }]
  function linhas(lista = []) {
    gExtra.replaceChildren();
    for (const l of lista) {
      el('line', { x1: l.de.x, y1: l.de.y, x2: l.para.x, y2: l.para.y, class: 'q-regra', 'marker-end': `url(#regra${uid})` }, gExtra);
      if (!l.txt) continue;
      // o texto fica ao lado da seta (nunca em cima dela)
      const mx = (l.de.x + l.para.x) / 2, my = (l.de.y + l.para.y) / 2;
      const vertical = Math.abs(l.para.y - l.de.y) > Math.abs(l.para.x - l.de.x);
      texto(vertical
        ? { x: mx - 2, y: my + 1, class: 'q-regra-txt q-regra-txt--lado' }
        : { x: mx, y: my - 2.2, class: 'q-regra-txt' }, l.txt, gExtra);
    }
  }

  function pontoSVG(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }

  // Anima os jogadores do momento A para o momento B e, no fim, desenha as setas do caminho.
  // Sempre parte de onde as bolinhas estão agora (sem teletransporte): se alguém não está em A,
  // primeiro vai até A e depois segue para B.
  let animacao = 0;
  const semMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function parar() {
    animacao++;
    svg.classList.remove('animando');
  }

  // extra: outras opções de mostrar (classes, funcoes) mantidas durante e depois do movimento
  function animar(a, b, { destaque = null, duracao = 1800, aoMover, aoTerminar, ...extra } = {}) {
    const vez = ++animacao;
    const fim = () => { svg.classList.remove('animando'); mostrar(b, { ...extra, destaque, origens: a }); aoTerminar?.(); };
    if (semMovimento()) { fim(); return; }
    const etapa = (pos, dur, depois) => {
      svg.classList.add('animando');
      svg.style.setProperty('--dur', dur + 'ms');
      mostrar(pos, { ...extra, destaque, setas: false });
      setTimeout(() => { if (vez === animacao) depois(); }, dur + 40);
    };
    const paraB = () => { aoMover?.(); etapa(b, duracao, fim); };
    const foraDeA = Object.entries(a).some(([id, p]) => {
      const o = alvo[id];
      return o && !bolas[id].classList.contains('fora') && Math.hypot(o.x - p.x, o.y - p.y) > 1;
    });
    if (foraDeA) etapa(a, 900, paraB); else paraB();
  }

  // qualquer exibição direta cancela uma animação em andamento
  const exibir = (posicoes, opcoes) => { parar(); mostrar(posicoes, opcoes); };

  return { svg, mostrar: exibir, animar, mover, fantasmas, marcarZonas, acenderNumeros, linhas, pontoSVG, bola, desenhos: gDes, uid };
}

// Arrastar e soltar bolinhas com mouse e toque (Pointer Events).
// posicoes: objeto id → {x, y} que é atualizado durante o arrasto.
export function habilitarArrasto(q, { posicoes, podeArrastar = () => true, aoIniciar, aoSoltar }) {
  let arrasto = null;
  q.svg.addEventListener('pointerdown', e => {
    const g = e.target.closest('.q-bola');
    if (!g || g.classList.contains('fora') || !podeArrastar(g.dataset.id)) return;
    e.preventDefault();
    const id = g.dataset.id, atual = posicoes()[id], p = q.pontoSVG(e.clientX, e.clientY);
    arrasto = { id, g, dx: atual.x - p.x, dy: atual.y - p.y };
    aoIniciar?.(id);
    g.classList.add('arrastando');
    g.parentNode.appendChild(g);
    q.svg.setPointerCapture(e.pointerId);
  });
  q.svg.addEventListener('pointermove', e => {
    if (!arrasto) return;
    const p = q.pontoSVG(e.clientX, e.clientY);
    const x = Math.min(104, Math.max(-4, p.x + arrasto.dx));
    const y = Math.min(150, Math.max(-6, p.y + arrasto.dy));
    posicoes()[arrasto.id] = { x, y };
    q.mover(arrasto.id, x, y);
  });
  const soltar = () => {
    if (!arrasto) return;
    arrasto.g.classList.remove('arrastando');
    const id = arrasto.id;
    arrasto = null;
    aoSoltar?.(id);
  };
  q.svg.addEventListener('pointerup', soltar);
  q.svg.addEventListener('pointercancel', soltar);
  // reforço para celulares que ignoram touch-action: enquanto arrasta, a página não rola
  q.svg.addEventListener('touchmove', e => { if (arrasto) e.preventDefault(); }, { passive: false });
}

// legenda com as funções presentes no sistema e as siglas de cada uma
const PLURAL = { levantador: ['Levantador', 'Levantadores'], oposto: ['Oposto', 'Opostos'], ponteiro: ['Ponteiro', 'Ponteiros'], central: ['Central', 'Centrais'], libero: ['Líbero', 'Líberos'], atacante: ['Jogador', 'Jogadores'] };
export function legendaHTML(jogadores = {}) {
  const por = {};
  for (const [id, j] of Object.entries(jogadores)) (por[j.funcao] ??= []).push(id);
  const itens = Object.keys(FUNCOES).filter(f => por[f]).map(f => [f, `${PLURAL[f][por[f].length > 1 ? 1 : 0]} (${por[f].join(', ')})`]);
  // 6-0: ninguém é levantador fixo, o da vez ganha a cor de levantador
  if (!por.levantador && por.atacante) itens.unshift(['levantador', 'Levantador da vez']);
  return itens.map(([f, t]) => `<span><i style="background:${FUNCOES[f].cor}"></i>${t}</span>`).join('')
    + '<span><svg width="22" height="8" aria-hidden="true"><path d="M1 4h15" stroke="var(--marinho)" stroke-width="1.6" stroke-dasharray="3 2.4"/><path d="M15 1l5 3-5 3z" fill="var(--marinho)"/></svg>Deslocamento</span>';
}
