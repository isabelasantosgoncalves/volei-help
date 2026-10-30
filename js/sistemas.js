import { criarQuadra, ZONAS } from './quadra.js?v=20261030-1';
import { FASES, posicoes, resumo, variacoesDe, posicaoOficial, levantadorDe, numeroLevantador, funcoesDe, guardar, esc } from './dados.js?v=20261030-1';

const SETAS = { formacao: 'Formação', jogo: 'Posição de jogo' };
const ICONE_PLAY = '<svg class="ico" viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z"/></svg>';
const NA_FASE = { recepcao: 'Na recepção', defesa: 'Na defesa' };
// Sistemas mostra só recepção e defesa: o nosso saque é a defesa, com quem saca saindo da zona de saque
const FASES_SIS = { recepcao: FASES.recepcao, defesa: FASES.defesa };
const PONTO_SAQUE = { x: 83, y: 112 };
const ICONE_SACA = '<svg width="14" height="14" viewBox="-3 -3 6 6" aria-hidden="true" class="q-saca-leg"><circle r="2.6"/><path d="M-2.4 -.9 Q0 .4 2.4 -.9 M-.9 2.4 Q.4 0 -.9 -2.4"/></svg>';

const chip = (valor, texto, ativo, titulo = '') =>
  `<button class="vh-chip" data-v="${esc(valor)}" aria-pressed="${ativo}"${titulo ? ` title="${esc(titulo)}"` : ''}>${esc(texto)}</button>`;
const aba = (valor, texto, ativo) => `<button role="tab" data-v="${esc(valor)}" aria-selected="${ativo}">${esc(texto)}</button>`;

// só as coordenadas (sem "para"), para a quadra não desenhar setas por conta própria
const soPontos = pos => Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { x: p.x, y: p.y }]));
const destinos = pos => Object.fromEntries(Object.entries(pos).map(([id, p]) => [id, { x: (p.para || p).x, y: (p.para || p).y }]));

export function iniciarSistemas(ctx) {
  const $ = id => document.getElementById(id);
  const { lista, porId } = ctx.sistemas;
  const st = {
    sis: porId['5-1'] ? '5-1' : lista[0].id, i: 0, fase: 'recepcao', variante: null, sel: null, momento: 'b',
    setas: guardar.ler('setas', 'formacao') === 'jogo' ? 'jogo' : 'formacao',
    minha: {},   // por sistema
  };
  let q = null, atual = null;
  const sis = () => porId[st.sis];
  const minha = () => st.minha[st.sis] ?? (sis().jogadores[guardar.ler('minha-' + st.sis, '')] ? guardar.ler('minha-' + st.sis, '') : '');

  function novaQuadra() {
    $('s-quadra').replaceChildren();
    q = criarQuadra($('s-quadra'), { jogadores: sis().jogadores, onBola: id => { st.sel = st.sel === id ? null : id; render(); } });
    $('s-legenda').innerHTML = ctx.legenda(sis());
  }

  // posição de cada jogador na ordem do rodízio (centro da zona 1–6); o líbero ocupa a do central que substitui
  // na defesa (depois do nosso saque), quem saca sai da zona de saque
  function posicoesDoRodizio(r, emQuadra) {
    const res = {}, sacador = st.fase === 'defesa' ? r.fases.saque.sacador : null;
    for (const id of Object.keys(emQuadra)) {
      const n = posicaoOficial(r, id, emQuadra);
      if (id === sacador) res[id] = { ...PONTO_SAQUE };
      else if (n) res[id] = { x: ZONAS[n].x, y: ZONAS[n].y };
    }
    return res;
  }

  // Os dois momentos ligados pelas setas: formação (rodízio → fase) ou posição de jogo (fase → depois)
  function momentos(r, pos) {
    if (st.setas === 'formacao') return { a: posicoesDoRodizio(r, pos), b: pos, rotA: 'Posição no rodízio', rotB: NA_FASE[st.fase] };
    if (st.fase === 'defesa') return { aviso: 'Na defesa cada um já está na sua posição de jogo. Use "Formação" para ver de onde cada um sai.' };
    return { a: pos, b: destinos(pos), rotA: NA_FASE[st.fase], rotB: st.fase === 'recepcao' ? 'Depois do passe' : 'Depois do saque' };
  }

  function desenharMomentos(m) {
    const el = $('s-momentos');
    if (m.aviso) { el.innerHTML = `<p class="dica">${esc(m.aviso)}</p>`; return; }
    const passo = (k, n, rot) => `<button class="momento" data-m="${k}" aria-pressed="${st.momento === k}"><span class="momento-num">${n}</span><strong>${esc(rot)}</strong></button>`;
    el.innerHTML = `<div class="momentos-linha">${passo('a', 1, m.rotA)}<span class="momento-seta" aria-hidden="true">→</span>${passo('b', 2, m.rotB)}</div>
      <button class="vh-btn vh-btn--contorno vh-btn--largo" id="s-animar">${ICONE_PLAY}Ver o movimento</button>`;
  }

  const marcarMomento = k => {
    st.momento = k;
    $('s-momentos').querySelectorAll('.momento').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === k));
  };

  // classes visuais: jogador selecionado e quem mudou de lugar na variação
  let extras = {};

  function mostrarMomento() {
    const a = soPontos(atual.a), b = soPontos(atual.b);
    if (st.momento === 'a') {
      const comSeta = Object.fromEntries(Object.entries(a).map(([id, p]) => [id, b[id] ? { ...p, para: b[id] } : p]));
      q.mostrar(comSeta, { destaque: minha(), ...extras });
    } else q.mostrar(b, { destaque: minha(), origens: a, ...extras });
  }

  function tocar() {
    if (!atual || atual.aviso) return;
    marcarMomento('a');
    q.animar(soPontos(atual.a), soPontos(atual.b), {
      destaque: minha(), ...extras,
      aoMover: () => $('s-momentos').classList.add('em-movimento'),
      aoTerminar: () => { $('s-momentos').classList.remove('em-movimento'); marcarMomento('b'); },
    });
  }

  function render({ animar = false } = {}) {
    const S = sis(), r = S.rodizios[st.i];
    const sacador = st.fase === 'defesa' ? r.fases.saque.sacador : null;
    $('s-abas').innerHTML = lista.map(s => aba(s.id, s.rotulo, s.id === st.sis)).join('');
    $('s-sub').textContent = `${S.rotulo} · ${r.nome} · ${FASES[st.fase]} · ${S.id === '5-1' ? 'Levantador' : `Levantador da vez (${levantadorDe(r)})`} na posição ${numeroLevantador(r)}${sacador ? ` · quem saca: ${sacador}` : ''}`;
    $('s-fases').innerHTML = Object.entries(FASES_SIS).map(([id, n]) => aba(id, n, id === st.fase)).join('');
    $('s-rodizios').innerHTML = S.rodizios.map((x, i) => chip(i, i + 1, i === st.i, `${x.nome} · ${x.apelido}`)).join('');
    $('s-legenda').innerHTML = ctx.legenda(S) + (sacador ? `<span>${ICONE_SACA}Quem saca</span>` : '');

    const vars = variacoesDe(S, r, st.fase);
    const v = vars.find(x => x.id === st.variante);
    if (!v) st.variante = null;
    $('s-grupoVar').hidden = !vars.length;
    $('s-variacoes').innerHTML = [chip('', 'Padrão', !v)].concat(vars.map(x => chip(x.id, x.nome, v === x))).join('');
    $('s-varDesc').textContent = v ? v.descricao : '';

    $('s-setas').innerHTML = Object.entries(SETAS).map(([id, n]) => chip(id, n, id === st.setas)).join('');
    $('s-minha').innerHTML = [chip('', 'Ninguém', !minha())].concat(Object.keys(S.jogadores).map(id => chip(id, id, id === minha(), S.jogadores[id].nome))).join('');

    const padrao = posicoes(r, st.fase);
    const pos = v ? v.rodizios[r.id].posicoes : padrao;
    if (st.sel && !pos[st.sel]) st.sel = null;

    // destaques: selecionado e (com variação) quem mudou de lugar em relação ao padrão
    const classes = {};
    if (v) for (const id of Object.keys(pos)) {
      const p0 = padrao[id];
      if (!p0 || Math.hypot(p0.x - pos[id].x, p0.y - pos[id].y) > 3) classes[id] = 'mudou';
    }
    if (st.sel) classes[st.sel] = ((classes[st.sel] || '') + ' selecionado').trim();
    extras = { classes, funcoes: funcoesDe(S, r), sacador };

    // explicação: resumo da fase e motivo do jogador tocado
    $('s-resumo').textContent = (sacador ? `Nosso saque: ${sacador} saca da posição 1. ` : '') + (v ? v.rodizios[r.id].resumo : resumo(r, st.fase));
    const mot = $('s-motivo');
    mot.hidden = !st.sel;
    if (st.sel) mot.innerHTML = `<b>${esc(st.sel)} · ${esc(S.jogadores[st.sel].nome)}</b><p>${esc(pos[st.sel].motivo || '')}</p>`;

    atual = momentos(r, pos);
    desenharMomentos(atual);
    if (atual.aviso) { q.mostrar(soPontos(pos), { destaque: minha(), setas: false, ...extras }); return; }
    if (animar) { tocar(); return; }
    mostrarMomento();
  }

  function trocarSistema(id) {
    if (!porId[id] || id === st.sis) return;
    st.sis = id; st.i = 0; st.variante = null; st.sel = null;
    guardar.salvar('sistema', id);
    novaQuadra();
    introducao();
  }

  function introducao() {
    const d = sis().descricao || {};
    $('s-intro').innerHTML = `<summary>Como funciona o ${esc(sis().rotulo)}</summary>
      <p class="intro-resumo">${esc(d.resumo || '')}</p>
      ${(d.secoes || []).map(s => `<h3>${esc(s.titulo)}</h3><p>${esc(s.texto)}</p>`).join('')}`;
  }

  $('s-momentos').onclick = e => {
    if (e.target.closest('#s-animar')) { tocar(); return; }
    const b = e.target.closest('.momento');
    if (!b) return;
    $('s-momentos').classList.remove('em-movimento');
    marcarMomento(b.dataset.m === 'a' ? 'a' : 'b');
    mostrarMomento();
  };

  const ao = (id, sel, fn, animar = true) => {
    $(id).onclick = e => { const b = e.target.closest(sel); if (b) { fn(b.dataset.v); render({ animar }); } };
  };
  ao('s-abas', '[data-v]', v => trocarSistema(v));
  ao('s-fases', '[data-v]', v => { if (FASES_SIS[v]) { st.fase = v; st.sel = null; } });
  ao('s-rodizios', '.vh-chip', v => { st.i = Math.min(sis().rodizios.length - 1, Math.max(0, Number(v) || 0)); st.sel = null; });
  ao('s-variacoes', '.vh-chip', v => { st.variante = v || null; });
  ao('s-setas', '.vh-chip', v => { st.setas = v === 'jogo' ? 'jogo' : 'formacao'; guardar.salvar('setas', st.setas); });
  ao('s-minha', '.vh-chip', v => {
    const id = sis().jogadores[v] ? v : '';
    st.minha[st.sis] = id;
    guardar.salvar('minha-' + st.sis, id);
  }, false);
  $('s-treinar').onclick = () => ctx.abrir('treino', { tema: st.sis });

  novaQuadra();
  introducao();
  $('s-intro').open = !guardar.ler('intro-vista', false);
  $('s-intro').addEventListener('toggle', () => guardar.salvar('intro-vista', true));
  render();

  return {
    aoAbrir() { render({ animar: true }); },
  };
}
