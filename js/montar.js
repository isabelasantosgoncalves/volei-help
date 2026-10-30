import { criarQuadra, habilitarArrasto, LIMITE_BANCO } from './quadra.js?v=20261030-1';
import { guardar } from './dados.js?v=20261030-1';

// distância máxima (em unidades da quadra, 0–100) para considerar a posição certa
const TOLERANCIA = 14;
const ICONE_OK = '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>';
const ICONE_ERRO = '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>';

// Motor do "Montar rodízio": recebe um desafio { sis, rotulo, esperado, funcoes, legenda } do treino.js.
export function criarMontar(ctx, { aoVerificar, aoProxima }) {
  const $ = id => document.getElementById(id);
  let q = null, sisAtual = null, desafio = null;
  const st = { modo: 'time', atual: {}, moveis: [], verificado: false, contado: false };

  function quadraPara(sis) {
    if (sisAtual === sis.id && q) return;
    $('m-quadra').replaceChildren();
    q = criarQuadra($('m-quadra'), { jogadores: sis.jogadores, banco: true });
    sisAtual = sis.id;
    habilitarArrasto(q, {
      posicoes: () => st.atual,
      podeArrastar: id => st.moveis.includes(id),
      aoIniciar: id => {
        if (!st.verificado) return;
        st.verificado = false;
        q.fantasmas([]);
        desenhar();
        q.bola(id).classList.add('arrastando');
      },
    });
    $('m-jogador').replaceChildren(...Object.entries(sis.jogadores).map(([id, j]) => new Option(`${j.nome} (${id})`, id)));
    const salvo = guardar.ler('minha-' + sis.id, '');
    $('m-jogador').value = sis.jogadores[salvo] ? salvo : Object.keys(sis.jogadores)[0];
  }

  function mostrar(d) {
    desafio = d;
    quadraPara(d.sis);
    $('m-legenda').innerHTML = d.legenda || '';
    $('m-resultado').hidden = true;
    const ids = Object.keys(d.esperado);
    let jogador = $('m-jogador').value;
    // no modo "só a minha posição", se o jogador não está em quadra nesta fase, monta o time inteiro
    const soMinha = st.modo === 'minha' && ids.includes(jogador);
    st.moveis = soMinha ? [jogador] : ids;
    st.atual = {};
    st.verificado = false; st.contado = false;
    const passo = 100 / (st.moveis.length + 1);
    st.moveis.forEach((id, i) => { st.atual[id] = { x: passo * (i + 1), y: LIMITE_BANCO + 11 }; });
    for (const id of ids) if (!st.moveis.includes(id)) st.atual[id] = { x: d.esperado[id].x, y: d.esperado[id].y };
    $('m-enunciado').textContent = d.rotulo;
    $('m-dica').textContent = soMinha
      ? `Os outros já estão no lugar. Arraste ${d.sis.jogadores[jogador].nome.toLowerCase()} para a posição certa.`
      : st.modo === 'minha' ? `${d.sis.jogadores[jogador].nome} não está em quadra nesta fase: monte o time inteiro.` : 'Arraste cada bolinha para o lugar dela.';
    desenhar();
  }

  function desenhar(classes = {}) {
    const fixos = {};
    for (const id in st.atual) if (!st.moveis.includes(id)) fixos[id] = 'fixo';
    q.mostrar(st.atual, { setas: false, classes: { ...fixos, ...classes }, funcoes: desafio.funcoes || {} });
  }

  function verificar() {
    if (!desafio || !st.moveis.length) return;
    const classes = {}, fant = [];
    let certos = 0;
    for (const id of st.moveis) {
      const a = st.atual[id], e = desafio.esperado[id];
      const ok = a.y < LIMITE_BANCO && Math.hypot(a.x - e.x, a.y - e.y) <= TOLERANCIA;
      classes[id] = ok ? 'certo' : 'errado';
      if (ok) certos++; else fant.push({ id, x: e.x, y: e.y, de: a });
    }
    st.verificado = true;
    desenhar(classes);
    q.fantasmas(fant);
    const total = st.moveis.length, ok = certos === total;
    const msg = $('m-resultado');
    msg.hidden = false;
    msg.className = 'vh-feedback vh-feedback--' + (ok ? 'acerto' : 'erro');
    msg.innerHTML = (ok ? ICONE_OK : ICONE_ERRO) + '<div><b></b><span></span></div>';
    msg.querySelector('b').textContent = ok ? (total === 1 ? 'Certinho!' : 'Perfeito!') : 'Quase.';
    msg.querySelector('span').textContent = ok
      ? `${total} de ${total} no lugar.`
      : `${certos} de ${total} no lugar. O círculo verde tracejado mostra onde fica quem errou; arraste de novo e verifique.`;
    // só a primeira verificação de cada desafio conta para o placar
    if (!st.contado) { st.contado = true; aoVerificar(ok); }
  }

  $('m-modo').onclick = e => {
    const b = e.target.closest('[data-modo]');
    if (!b) return;
    st.modo = b.dataset.modo === 'minha' ? 'minha' : 'time';
    document.querySelectorAll('#m-modo button').forEach(x => x.setAttribute('aria-selected', x === b));
    $('m-boxJogador').hidden = st.modo !== 'minha';
    if (desafio) mostrar(desafio);
  };
  $('m-jogador').onchange = () => { if (desafio) { guardar.salvar('minha-' + desafio.sis.id, $('m-jogador').value); mostrar(desafio); } };
  $('m-verificar').onclick = verificar;
  $('m-novo').onclick = () => aoProxima();

  return { mostrar };
}
