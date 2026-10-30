import { zonaDoPonto, NOME_ZONA, ZONAS } from './quadra.js?v=20261030-1';
import { FASES, posicoes, posicaoOficial, levantadorDe, numeroLevantador, funcoesDe, comArtigo, guardar, esc } from './dados.js?v=20261030-1';
import { fraseSobreposicao, vizinhos, linhasSobreposicao, ZONA_DESCRICAO, NUMERADOS, LETRAS } from './fundamentos.js?v=20261030-1';
import { criarPerguntas } from './perguntas.js?v=20261030-1';
import { criarMontar } from './montar.js?v=20261030-1';

// Repetição espaçada (caixas de Leitner): cada pergunta/desafio é uma carta.
// Acertou → sobe uma caixa e aparece menos. Errou → volta para a caixa 0 e aparece mais.
const CAIXAS = 5;                 // 0 a 4; caixa 4 = dominada
const PESO = [16, 8, 4, 2, 1];    // chance relativa de sair, por caixa
const PESO_NOVA = 10;             // cartas nunca vistas
const INTERVALO_MIN = 3;          // carta errada volta depois de ~3 perguntas

const MODOS = [
  { id: 'perguntas', nome: 'Perguntas', sub: 'toque na zona certa' },
  { id: 'montar', nome: 'Montar rodízio', sub: 'arraste os jogadores' },
  { id: 'alternado', nome: 'Os dois', sub: 'alternados' },
];
const NOME_POSICAO = { 1: 'fundo direita', 2: 'frente direita', 3: 'frente meio', 4: 'frente esquerda', 5: 'fundo esquerda', 6: 'fundo meio' };
// com artigo: "a frente direita", "o fundo meio"
const comArt = n => (n >= 2 && n <= 4 ? 'a ' : 'o ') + NOME_POSICAO[n];
const DEPOIS = { 2: 1, 1: 6, 6: 5, 5: 4, 4: 3, 3: 2 };   // rotação no sentido horário

function limpar(obj) {
  const ok = {};
  if (!obj || typeof obj !== 'object') return ok;
  const n = v => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  for (const [k, s] of Object.entries(obj)) if (s && typeof s === 'object') ok[k] = { caixa: Math.min(CAIXAS - 1, n(s.caixa)), a: n(s.a), e: n(s.e), visto: n(s.visto) };
  return ok;
}

export function iniciarTreino(ctx) {
  const $ = id => document.getElementById(id);
  const { lista: sistemas, porId } = ctx.sistemas;
  const TEMAS = [
    { id: 'fundamentos', nome: 'Fundamentos', sub: 'zonas, rotação, sobreposição' },
    ...sistemas.map(s => ({ id: s.id, nome: s.rotulo, sub: s.nome })),
    { id: 'misturado', nome: 'Misturado', sub: 'tudo junto' },
  ];
  const st = {
    tema: guardar.ler('treino-tema', '5-1'), modo: guardar.ler('treino-modo', 'perguntas'),
    placar: { a: 0, e: 0 }, rodada: 0, recentes: [], vez: 0, atual: null,
  };
  if (!TEMAS.some(t => t.id === st.tema)) st.tema = '5-1';
  if (!MODOS.some(m => m.id === st.modo)) st.modo = 'perguntas';

  // progresso salvo por tema
  const lojas = {};
  const loja = tema => (lojas[tema] ??= limpar(guardar.ler('treino-' + tema, {})));
  const salvarLoja = tema => guardar.salvar('treino-' + tema, lojas[tema]);
  const temasDe = tema => (tema === 'misturado' ? TEMAS.filter(t => t.id !== 'misturado').map(t => t.id) : [tema]);

  // ---------------- cartas de perguntas ----------------
  function cartasFundamentos() {
    const c = [], base = { tema: 'fundamentos', chaveQuadra: 'fund' };
    for (let n = 1; n <= 6; n++) {
      const resolverZona = (texto = `A zona ${n} é ${comArt(n)}.`) => q => {
        q.acenderNumeros([n]);
        return { texto, itens: [`<li class="nota-item">${esc(ZONA_DESCRICAO[n])}</li>`, `<li>A contagem começa na 1 (quem saca) e segue no sentido anti-horário.</li>`] };
      };
      c.push({ ...base, chave: `zona-num-${n}`, grupo: 'Numeração', rotulo: 'Fundamentos · Numeração', enunciado: `Toque na zona ${n}.`, certa: n, esconderNumeros: true, preparar: q => q.mostrar({}), resolver: resolverZona() });
      c.push({ ...base, chave: `zona-nome-${n}`, grupo: 'Numeração', rotulo: 'Fundamentos · Numeração', enunciado: n === 1 ? 'Quem saca ocupa qual posição?' : `Onde fica ${comArt(n)}?`, certa: n, esconderNumeros: true, preparar: q => q.mostrar({}),
        resolver: resolverZona(n === 1 ? 'Quem saca ocupa a posição 1 (fundo direita).' : undefined) });

      const m = DEPOIS[n];
      c.push({
        tema: 'fundamentos', chaveQuadra: 'fund-letras', jogadores: LETRAS, chave: `rotacao-${n}`, grupo: 'Rotação', rotulo: 'Fundamentos · Rotação',
        enunciado: `O time recuperou o saque e vai girar. O jogador A está na zona ${n}: para qual zona ele vai?`, certa: m,
        preparar: q => q.mostrar({ A: { x: ZONAS[n].x, y: ZONAS[n].y } }, { setas: false, destaque: 'A' }),
        resolver: q => {
          q.animar({ A: { x: ZONAS[n].x, y: ZONAS[n].y } }, { A: { x: ZONAS[m].x, y: ZONAS[m].y } }, { destaque: 'A', duracao: 1400 });
          return { texto: `Da zona ${n} ele vai para a zona ${m}.`, itens: [`<li class="nota-item">Na rotação, todos andam uma posição no sentido horário.${m === 1 ? ' Quem chega na 1 é o novo sacador.' : ''}</li>`] };
        },
      });

      const v = vizinhos(n);
      const perguntasSob = [{ certa: v.par, rel: v.naFrente ? 'à frente de' : 'atrás de', id: 'par' }];
      if (v.esq) perguntasSob.push({ certa: v.esq, rel: 'à direita de', id: 'esq' });
      if (v.dir) perguntasSob.push({ certa: v.dir, rel: 'à esquerda de', id: 'dir' });
      for (const p of perguntasSob) c.push({
        tema: 'fundamentos', chaveQuadra: 'fund-num', jogadores: NUMERADOS, chave: `sobreposicao-${n}-${p.id}`, grupo: 'Sobreposição', rotulo: 'Fundamentos · Sobreposição',
        enunciado: `No momento do saque adversário (time que recebe), a posição ${n} tem que estar ${p.rel} qual posição?`, certa: p.certa,
        preparar: q => q.mostrar({ [n]: { x: ZONAS[n].x, y: ZONAS[n].y } }, { setas: false, destaque: String(n) }),
        resolver: q => {
          q.mostrar(Object.fromEntries([1, 2, 3, 4, 5, 6].map(k => [String(k), { x: ZONAS[k].x, y: ZONAS[k].y }])), { setas: false, destaque: String(n) });
          q.linhas(linhasSobreposicao(n));
          return { texto: `A ${n} tem que estar ${p.rel} ${p.certa}.`, itens: [`<li class="nota-item">${esc(fraseSobreposicao(n))}</li>`] };
        },
      });
    }
    return c;
  }

  function contexto(sis, r) {
    const n = numeroLevantador(r);
    return sis.id === '5-1' ? `Levantador na ${n}` : `${r.nome} (${levantadorDe(r)} levanta da ${n})`;
  }

  function enunciadoSistema(sis, r, fase, id, tipo) {
    const ctxTxt = contexto(sis, r), quem = comArtigo(sis, id);
    if (tipo === 'destino') return fase === 'recepcao'
      ? `${ctxTxt}, recepção. Depois do passe, para onde ${quem} vai?`
      : `${ctxTxt}, nosso saque. Depois do saque, para onde ${quem} vai?`;
    if (fase === 'saque') {
      const sac = r.fases.saque.sacador;
      return sac === id ? `${ctxTxt}: onde ${quem} está no momento do nosso saque?` : `${ctxTxt} e ${comArtigo(sis, sac)} vai sacar: onde está ${quem}?`;
    }
    if (fase === 'recepcao') return `${ctxTxt}. O adversário vai sacar: onde ${quem} fica na recepção?`;
    return `${ctxTxt}, defesa depois do nosso saque: onde ${quem} defende?`;
  }

  function cartasSistema(sis) {
    const regra = ctx.regra(), c = [];
    for (const r of sis.rodizios) for (const fase of Object.keys(FASES)) {
      const pos = posicoes(r, fase, regra), funcoes = funcoesDe(sis, r);
      for (const [id, p] of Object.entries(pos)) {
        const tipos = ['onde'];
        if (p.para && zonaDoPonto(p.para.x, p.para.y) !== zonaDoPonto(p.x, p.y)) tipos.push('destino');
        for (const tipo of tipos) {
          const alvo = tipo === 'destino' ? p.para : p;
          c.push({
            tema: sis.id, chaveQuadra: 'sis-' + sis.id, jogadores: sis.jogadores, legenda: ctx.legenda(sis),
            chave: [r.id, fase, fase === 'saque' ? regra : '', id, tipo].join('|'), grupo: `${r.nome} · ${FASES[fase]}`,
            rotulo: `${sis.rotulo} · ${r.nome} · ${FASES[fase]}${fase === 'saque' ? ' · ' + ctx.regrasSaque[regra].nome.toLowerCase() : ''}`,
            enunciado: enunciadoSistema(sis, r, fase, id, tipo), certa: zonaDoPonto(alvo.x, alvo.y),
            dica: tipo === 'destino' ? 'Toque na zona para onde ele vai.' : 'Toque na zona da quadra.',
            preparar: q => q.mostrar(tipo === 'destino' ? { [id]: { x: p.x, y: p.y } } : {}, { destaque: id, funcoes }),
            resolver: (q, zona) => explicarSistema(q, sis, r, fase, id, tipo, pos, zona, funcoes),
          });
        }
      }
    }
    return c;
  }

  function explicarSistema(q, sis, r, fase, id, tipo, pos, zona, funcoes) {
    q.mostrar(pos, { destaque: id, funcoes });
    const p = pos[id], certa = zonaDoPonto((tipo === 'destino' ? p.para : p).x, (tipo === 'destino' ? p.para : p).y);
    const nome = sis.jogadores[id].nome;
    const itens = [`<li class="nota-item"><b>Por quê:</b> ${esc(p.motivo || '')}</li>`];
    const oficial = posicaoOficial(r, id, pos);
    if (tipo === 'onde' && fase !== 'saque' && oficial && String(oficial) !== String(certa))
      itens.push(`<li>Na ordem do rodízio, ${esc(comArtigo(sis, id))} é a posição ${oficial}, mas nesta fase fica na ${esc(NOME_ZONA[certa])}.</li>`);
    // quem ocupa cada zona: por que as outras opções estão erradas
    const porZona = {};
    for (const [j, pj] of Object.entries(pos)) {
      const ref = tipo === 'destino' ? (pj.para || pj) : pj;
      (porZona[zonaDoPonto(ref.x, ref.y)] ??= []).push(j);
    }
    const zonas = fase === 'saque' && tipo === 'onde' ? ['S', 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
    for (const z of zonas) {
      if (String(z) === String(certa)) continue;
      const quem = porZona[z] || [];
      const sua = String(z) === String(zona);
      const txt = quem.length ? `${tipo === 'destino' ? 'vai' : 'fica'} ${quem.map(j => esc(comArtigo(sis, j))).join(' e ')}` : 'ninguém fica aí nesse momento';
      const porque = sua && quem.length && pos[quem[0]].motivo ? ` <span class="dica">${esc(pos[quem[0]].motivo)}</span>` : '';
      itens.push(`<li class="${sua ? 'sua' : ''}"><b>${sua ? 'Sua resposta · ' : ''}${esc(NOME_ZONA[z])}</b>: ${txt}.${porque}</li>`);
    }
    return { texto: `${nome} ${tipo === 'destino' ? 'vai para a' : 'fica na'} ${NOME_ZONA[certa]}.`, itens };
  }

  // ---------------- desafios de montar ----------------
  function desafiosSistema(sis) {
    const regra = ctx.regra(), c = [];
    for (const r of sis.rodizios) for (const fase of Object.keys(FASES)) c.push({
      tema: sis.id, sis, chave: [r.id, fase, fase === 'saque' ? regra : '', 'montar'].join('|'), grupo: `${r.nome} · ${FASES[fase]}`,
      rotulo: `${sis.rotulo} · ${r.nome} · ${FASES[fase]}${fase === 'saque' ? ` (${ctx.regrasSaque[regra].nome.toLowerCase()})` : ''}`,
      esperado: posicoes(r, fase, regra), funcoes: funcoesDe(sis, r), legenda: ctx.legenda(sis),
    });
    return c;
  }

  const perguntasDe = tema => tema === 'fundamentos' ? cartasFundamentos() : cartasSistema(porId[tema]);
  const montarDe = tema => tema === 'fundamentos' ? [] : desafiosSistema(porId[tema]);
  const itensPerguntas = () => temasDe(st.tema).flatMap(perguntasDe);
  const itensMontar = () => temasDe(st.tema).flatMap(montarDe);
  const itensDoModo = () => (st.modo === 'perguntas' ? itensPerguntas() : st.modo === 'montar' ? itensMontar() : [...itensPerguntas(), ...itensMontar()]);

  // ---------------- escolha ponderada ----------------
  const registro = c => loja(c.tema)[c.chave];
  function peso(c) {
    const s = registro(c);
    if (!s) return PESO_NOVA;
    if (s.caixa === 0 && st.rodada - s.visto >= INTERVALO_MIN) return PESO[0] * 3;
    return PESO[s.caixa];
  }
  function escolher(lista) {
    const disp = lista.filter(c => !st.recentes.includes(c.tema + c.chave));
    const pool = disp.length ? disp : lista;
    let t = pool.reduce((s, c) => s + peso(c), 0) * Math.random();
    for (const c of pool) if ((t -= peso(c)) <= 0) return c;
    return pool[pool.length - 1];
  }
  function selo(c) {
    const s = registro(c);
    if (!s) return { classe: 'inedita', texto: 'inédita' };
    if (s.caixa === 0) return { classe: 'revisar', texto: 'revisar' };
    if (s.caixa >= CAIXAS - 1) return { classe: 'dominada', texto: 'dominada' };
    return { classe: 'nivel', texto: `nível ${s.caixa}` };
  }

  function registrar(c, acertou) {
    st.rodada++;
    st.placar[acertou ? 'a' : 'e']++;
    const l = loja(c.tema), s = l[c.chave] || { caixa: 0, a: 0, e: 0, visto: 0 };
    s.caixa = acertou ? Math.min(CAIXAS - 1, l[c.chave] ? s.caixa + 1 : 2) : 0;
    s[acertou ? 'a' : 'e']++;
    s.visto = st.rodada;
    l[c.chave] = s;
    salvarLoja(c.tema);
    atualizarPlacar();
  }

  const perguntas = criarPerguntas(ctx, { aoResponder: ok => registrar(st.atual, ok), aoProxima: () => proxima() });
  const montar = criarMontar(ctx, { aoVerificar: ok => registrar(st.atual, ok), aoProxima: () => proxima() });

  function proxima() {
    // no modo alternado, intercala perguntas e montar (Fundamentos só tem perguntas)
    let tipo = st.modo;
    if (tipo === 'alternado') tipo = st.vez++ % 2 === 0 || !itensMontar().length ? 'perguntas' : 'montar';
    if (tipo === 'montar' && !itensMontar().length) tipo = 'perguntas';
    const lista = tipo === 'montar' ? itensMontar() : itensPerguntas();
    $('t-perguntas').hidden = tipo !== 'perguntas';
    $('t-montar').hidden = tipo !== 'montar';
    if (!lista.length) return;
    const c = escolher(lista);
    st.atual = c;
    st.recentes = [c.tema + c.chave, ...st.recentes].slice(0, Math.min(4, lista.length - 1));
    if (tipo === 'montar') montar.mostrar(c); else perguntas.mostrar(c, selo(c));
  }

  // ---------------- placar, domínio e pontos fracos ----------------
  function estatisticas(lista) {
    const vistas = lista.filter(c => registro(c)).length;
    const dominadas = lista.filter(c => registro(c)?.caixa >= CAIXAS - 1).length;
    const revisar = lista.filter(c => registro(c)?.caixa === 0).length;
    return { total: lista.length, vistas, dominadas, revisar, pct: lista.length ? Math.round(100 * dominadas / lista.length) : 0 };
  }

  function atualizarPlacar() {
    const { a, e } = st.placar, t = a + e;
    $('p-acertos').textContent = a;
    $('p-erros').textContent = e;
    $('p-taxa').textContent = t ? Math.round(100 * a / t) + '%' : '–';
    const s = estatisticas(itensDoModo());
    $('p-dominio').textContent = s.pct + '%';
    $('p-barra').style.width = s.pct + '%';
    $('p-progresso').textContent = `${s.total} itens neste treino · ${s.vistas} já vistos · ${s.dominadas} dominados · ${s.revisar} para revisar`;
  }

  function pontosFracos() {
    const grupos = {};
    for (const c of [...itensPerguntas(), ...itensMontar()]) {
      const s = registro(c);
      if (!s) continue;
      const nomeTema = TEMAS.find(t => t.id === c.tema)?.nome || c.tema;
      const g = grupos[c.tema + c.grupo] ??= { nome: st.tema === 'misturado' ? `${nomeTema} · ${c.grupo}` : c.grupo, revisar: 0, erros: 0 };
      if (s.caixa === 0) g.revisar++;
      g.erros += s.e;
    }
    const lista = Object.values(grupos).filter(g => g.revisar || g.erros).sort((x, y) => y.revisar - x.revisar || y.erros - x.erros).slice(0, 4);
    $('t-fracos').innerHTML = lista.length
      ? `<p>Onde você mais erra${st.tema === 'misturado' ? '' : ' neste tema'} (esses itens aparecem mais vezes):</p>` + lista.map(g =>
          `<div class="linha-hist"><span>${esc(g.nome)}</span><span class="erro">${g.erros} ${g.erros === 1 ? 'erro' : 'erros'}</span><span>${g.revisar} p/ revisar</span></div>`).join('')
        + '<button class="vh-btn vh-btn--texto" id="t-zerar" style="margin-top:8px;padding:0">Zerar progresso deste tema</button>'
      : '<p>Ainda não há erros salvos neste tema. Quando você errar, os pontos fracos aparecem aqui.</p>';
  }

  // ---------------- tela de configuração ----------------
  function renderConfig() {
    const op = (item, ativo) => `<button class="opcao" data-v="${esc(item.id)}" aria-pressed="${ativo}">${esc(item.nome)}<small>${esc(item.sub)}</small></button>`;
    $('t-temas').innerHTML = TEMAS.map(t => op(t, t.id === st.tema)).join('');
    $('t-modos').innerHTML = MODOS.map(m => op(m, m.id === st.modo)).join('');
    const SUB_REGRA = { nova: 'quem saca fica onde quiser', antiga: 'quem saca também segue a ordem' };
    $('t-regras').innerHTML = Object.entries(ctx.regrasSaque)
      .map(([id, r]) => op({ id, nome: r.curto || r.nome, sub: SUB_REGRA[id] || '' }, id === ctx.regra())).join('');
    $('t-aviso').textContent = st.tema === 'fundamentos' && st.modo !== 'perguntas'
      ? 'Fundamentos só tem perguntas: o treino vai usar Perguntas.' : '';
    pontosFracos();
  }

  function comecar() {
    guardar.salvar('treino-tema', st.tema);
    guardar.salvar('treino-modo', st.modo);
    st.placar = { a: 0, e: 0 }; st.vez = 0; st.recentes = [];
    const tema = TEMAS.find(t => t.id === st.tema), modo = MODOS.find(m => m.id === st.modo);
    $('t-rotulo').textContent = `${tema.nome} · ${st.tema === 'fundamentos' ? 'Perguntas' : modo.nome}`;
    $('t-config').hidden = true;
    $('t-sessao').hidden = false;
    atualizarPlacar();
    proxima();
    window.scrollTo(0, 0);
  }

  function configurar() {
    $('t-config').hidden = false;
    $('t-sessao').hidden = true;
    renderConfig();
  }

  $('t-temas').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { st.tema = b.dataset.v; renderConfig(); } };
  $('t-modos').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { st.modo = b.dataset.v; renderConfig(); } };
  $('t-regras').onclick = e => { const b = e.target.closest('[data-v]'); if (b) { ctx.definirRegra(b.dataset.v); renderConfig(); } };
  $('t-comecar').onclick = comecar;
  $('t-trocar').onclick = configurar;
  $('t-fracos').onclick = e => {
    if (!e.target.closest('#t-zerar')) return;
    if (!confirm('Apagar o progresso deste tema neste aparelho?')) return;
    for (const t of temasDe(st.tema)) { lojas[t] = {}; salvarLoja(t); }
    renderConfig();
  };
  ctx.aoMudarRegra(() => { if (!$('t-sessao').hidden) atualizarPlacar(); });

  renderConfig();
  return {
    // aberto por "Treinar fundamentos" / "Treinar este sistema": já começa filtrado no tema
    aoAbrir(opcoes) {
      if (opcoes?.tema && TEMAS.some(t => t.id === opcoes.tema)) { st.tema = opcoes.tema; comecar(); return; }
      if ($('t-sessao').hidden) renderConfig();
    },
  };
}
