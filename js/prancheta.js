import { criarQuadra, habilitarArrasto, LIMITE_BANCO } from './quadra.js?v=20261021-5';
import { FASES, posicoes, funcoesDe, guardar, esc } from './dados.js?v=20261021-5';

// Prancheta: partir de um rodízio ou do zero, ajustar arrastando e traçar jogadas.
const SVGNS = 'http://www.w3.org/2000/svg';
const num = v => (Number.isFinite(v) ? Math.min(160, Math.max(-10, v)) : 0);

// só aceita estratégias bem formadas (o localStorage pode ter sido editado)
function validarSalvas(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter(s => s && typeof s.nome === 'string' && s.pos && typeof s.pos === 'object').slice(0, 100).map(s => {
    const pos = {};
    for (const [id, p] of Object.entries(s.pos)) if (p && typeof p === 'object') pos[id] = { x: num(p.x), y: num(p.y) };
    const tracos = Array.isArray(s.tracos) ? s.tracos.slice(0, 200).filter(Array.isArray)
      .map(t => t.slice(0, 400).filter(p => Array.isArray(p) && p.length === 2).map(([x, y]) => [num(x), num(y)])) : [];
    return { nome: s.nome.slice(0, 40), sistema: typeof s.sistema === 'string' ? s.sistema : '5-1', pos, tracos };
  });
}

export function iniciarPrancheta(ctx) {
  const $ = id => document.getElementById(id);
  const { lista, porId } = ctx.sistemas;
  const st = { sis: '5-1', pos: {}, tracos: [], ferramenta: 'mover', rodizio: null };
  let q = null, salvas = validarSalvas(guardar.ler('estrategias', []));
  const sis = () => porId[st.sis];
  const ids = () => Object.keys(sis().jogadores);

  for (const s of lista) $('e-sistema').add(new Option(s.rotulo, s.id));
  for (const id of ['recepcao', 'defesa']) $('e-fase').add(new Option(FASES[id], id));
  $('e-fase').value = 'recepcao';

  // opções de rodízio do sistema escolhido no seletor (a quadra só muda ao carregar)
  function listarRodizios() {
    const s = porId[$('e-sistema').value] || sis();
    $('e-rodizio').replaceChildren(...s.rodizios.map((r, i) => new Option(`${r.nome} · ${r.apelido}`, i)));
  }

  // monta a quadra e a legenda de um sistema
  function prepararSistema(id) {
    st.sis = porId[id] ? id : '5-1';
    $('e-quadra').replaceChildren();
    q = criarQuadra($('e-quadra'), { jogadores: sis().jogadores, banco: true });
    $('e-legenda').innerHTML = ctx.legenda(sis());
    habilitarArrasto(q, { posicoes: () => st.pos, podeArrastar: () => st.ferramenta === 'mover' });
    ligarDesenho();
  }

  const vagaNoBanco = id => ({ x: (100 / (ids().length + 1)) * (ids().indexOf(id) + 1), y: LIMITE_BANCO + 11 });

  function desenhar() {
    const todos = {};
    for (const id of ids()) todos[id] = st.pos[id] || vagaNoBanco(id);
    st.pos = todos;
    q.mostrar(todos, { setas: false, funcoes: st.rodizio ? funcoesDe(sis(), st.rodizio) : {} });
    desenharTracos();
  }

  function carregarDoSistema() {
    if ($('e-sistema').value !== st.sis) prepararSistema($('e-sistema').value);
    const r = sis().rodizios[Number($('e-rodizio').value) || 0], fase = $('e-fase').value;
    st.rodizio = r;
    const pos = posicoes(r, fase, ctx.regra());
    st.pos = {};
    for (const [id, p] of Object.entries(pos)) st.pos[id] = { x: p.x, y: p.y };
    desenhar();
  }

  // começa do zero no sistema que está na quadra: todos no banco e sem traços
  function zerar() {
    st.pos = {}; st.tracos = []; st.rodizio = null;
    desenhar();
  }

  const aviso = txt => { $('e-aviso').textContent = txt; };

  // ---------- desenho de jogadas ----------
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent?.appendChild(n);
    return n;
  };
  function caminho(pts) {
    return svgEl('path', {
      d: pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
      'marker-end': `url(#regra${q.uid})`,
    });
  }

  // cada traço: área de toque larga + linha visível; o selecionado ganha uma lixeira na ponta
  let selTraco = null;
  function desenharTracos() {
    if (selTraco !== null && !st.tracos[selTraco]) selTraco = null;
    q.desenhos.replaceChildren(...st.tracos.map((t, i) => {
      const g = svgEl('g', { class: 'traco' + (i === selTraco ? ' selecionado' : ''), 'data-traco': i });
      if (t.length < 2) return g;
      const d = caminho(t).getAttribute('d');
      svgEl('path', { d, class: 'traco-toque' }, g);
      g.appendChild(caminho(t));
      return g;
    }));
    // lixeira no começo do traço selecionado, por cima dos jogadores
    q.svg.querySelector('.traco-apagar')?.remove();
    if (selTraco !== null && st.tracos[selTraco].length > 1) {
      const [x, y] = st.tracos[selTraco][0];
      const lixo = svgEl('g', { class: 'traco-apagar', transform: `translate(${x.toFixed(1)} ${(y - 7).toFixed(1)})`, role: 'button', 'aria-label': 'Apagar este traço' }, q.svg);
      svgEl('circle', { r: 5 }, lixo);
      svgEl('path', { d: 'M-2.4 -1.6h4.8M-1 -1.6v-.9h2v.9M-1.8 -1.6l.4 4h2.8l.4 -4' }, lixo);
    }
  }

  function ligarDesenho() {
    let atual = null, el = null;
    // no modo Mover, tocar num traço seleciona; tocar na lixeira apaga
    q.svg.addEventListener('click', e => {
      if (st.ferramenta !== 'mover') return;
      if (e.target.closest('.traco-apagar')) { st.tracos.splice(selTraco, 1); selTraco = null; desenharTracos(); return; }
      const t = e.target.closest('[data-traco]');
      const novo = t ? Number(t.dataset.traco) : null;
      if (novo !== selTraco) { selTraco = novo; desenharTracos(); }
    });
    q.svg.addEventListener('pointerdown', e => {
      if (st.ferramenta !== 'desenhar') return;
      e.preventDefault();
      const p = q.pontoSVG(e.clientX, e.clientY);
      atual = [[p.x, p.y]];
      el = caminho(atual);
      q.desenhos.appendChild(el);
      q.svg.setPointerCapture(e.pointerId);
    });
    q.svg.addEventListener('pointermove', e => {
      if (!atual) return;
      const p = q.pontoSVG(e.clientX, e.clientY), u = atual[atual.length - 1];
      if (Math.hypot(p.x - u[0], p.y - u[1]) < 1.2) return;
      atual.push([p.x, p.y]);
      el.replaceWith(el = caminho(atual));
    });
    const fim = () => {
      if (!atual) return;
      el.remove();
      if (atual.length > 1) { st.tracos.push(atual); desenharTracos(); }
      atual = null; el = null;
    };
    q.svg.addEventListener('pointerup', fim);
    q.svg.addEventListener('pointercancel', fim);
  }

  $('e-ferramentas').onclick = e => {
    const b = e.target.closest('[data-ferramenta]');
    if (b) {
      st.ferramenta = b.dataset.ferramenta;
      document.querySelectorAll('#e-ferramentas [data-ferramenta]').forEach(x => x.setAttribute('aria-pressed', x === b));
      $('e-quadra').classList.toggle('desenhando', st.ferramenta === 'desenhar');
      selTraco = null; desenharTracos();
    } else if (e.target.closest('#e-desfazer')) { st.tracos.pop(); desenharTracos(); }
    else if (e.target.closest('#e-limparDesenho')) { st.tracos = []; desenharTracos(); }
  };

  // ---------- estratégias salvas ----------
  function listarSalvas() {
    $('e-salvas').innerHTML = salvas.length
      ? salvas.map((s, i) => `<div class="salva"><span>${esc(s.nome)} <small class="dica">${esc(porId[s.sistema]?.rotulo || '')}</small></span><button data-carregar="${i}" class="vh-btn vh-btn--texto">abrir</button><button data-excluir="${i}" class="vh-btn vh-btn--texto">excluir</button></div>`).join('')
      : '<p class="dica">Nenhuma estratégia salva ainda.</p>';
  }

  $('e-sistema').onchange = listarRodizios;
  $('e-zerar').onclick = zerar;
  $('e-carregar').onclick = carregarDoSistema;
  $('e-salvar').onclick = () => {
    const nome = $('e-nome').value.trim().slice(0, 40) || `Estratégia ${salvas.length + 1}`;
    const item = { nome, sistema: st.sis, pos: st.pos, tracos: st.tracos };
    const existente = salvas.findIndex(s => s.nome === nome);
    if (existente >= 0) salvas[existente] = item; else salvas.push(item);
    guardar.salvar('estrategias', salvas);
    $('e-nome').value = '';
    listarSalvas();
    aviso(`“${nome}” salva neste aparelho.`);
  };
  $('e-salvas').onclick = e => {
    const b = e.target.closest('[data-carregar], [data-excluir]');
    if (!b) return;
    if (b.dataset.carregar !== undefined) {
      const s = salvas[Number(b.dataset.carregar)];
      if (s.sistema !== st.sis) prepararSistema(s.sistema);
      $('e-sistema').value = st.sis; listarRodizios(); st.rodizio = null;
      st.pos = structuredClone(s.pos); st.tracos = structuredClone(s.tracos);
      desenhar();
      aviso(`“${s.nome}” aberta.`);
    } else if (confirm(`Excluir “${salvas[Number(b.dataset.excluir)].nome}”?`)) {
      salvas.splice(Number(b.dataset.excluir), 1);
      guardar.salvar('estrategias', salvas);
      listarSalvas();
    }
  };

  $('e-sistema').value = '5-1';
  listarRodizios();
  prepararSistema('5-1');
  listarSalvas();
  carregarDoSistema();
  return {};
}
