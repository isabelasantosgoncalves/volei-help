import { criarQuadra } from './quadra.js?v=20261021-5';
import { esc } from './dados.js?v=20261021-5';

// Motor das perguntas: mostra uma "carta" (montada pelo treino.js), recebe o toque na zona e explica.
// Uma carta tem: rotulo, enunciado, dica, certa (zona), jogadores, chaveQuadra,
//   preparar(q) → desenha a quadra antes da resposta
//   resolver(q, zona, acertou) → { texto, itens } (itens em HTML já escapado)
const ICONE_OK = '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>';
const ICONE_ERRO = '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>';

export function criarPerguntas(ctx, { aoResponder, aoProxima }) {
  const $ = id => document.getElementById(id);
  let q = null, chaveQ = null, carta = null, respondida = false;

  function quadraPara(c) {
    if (chaveQ === c.chaveQuadra && q) return;
    $('p-quadra').replaceChildren();
    q = criarQuadra($('p-quadra'), { jogadores: c.jogadores || {}, onZona: responder });
    chaveQ = c.chaveQuadra;
    $('p-legenda').innerHTML = c.legenda || '';
  }

  function mostrar(c, selo) {
    carta = c; respondida = false;
    quadraPara(c);
    $('p-resposta').hidden = true;
    q.marcarZonas(); q.linhas([]); q.acenderNumeros([]);
    q.svg.classList.toggle('sem-numeros', !!c.esconderNumeros);
    c.preparar(q);
    $('p-etiqueta').innerHTML = `${esc(c.rotulo)} <span class="selo selo-${selo.classe}">${esc(selo.texto)}</span>`;
    $('p-enunciado').textContent = c.enunciado;
    $('p-dica').textContent = c.dica || 'Toque na zona da quadra.';
    $('p-dica').hidden = false;
  }

  function responder(zona) {
    if (!carta || respondida) return;
    respondida = true;
    const acertou = String(zona) === String(carta.certa);
    q.svg.classList.remove('sem-numeros');
    q.marcarZonas({ [carta.certa]: 'certa', ...(acertou ? {} : { [zona]: 'errada' }) });
    const { texto, itens } = carta.resolver(q, zona, acertou);
    const fb = $('p-feedback');
    fb.className = 'vh-feedback vh-feedback--' + (acertou ? 'acerto' : 'erro');
    fb.innerHTML = `${acertou ? ICONE_OK : ICONE_ERRO}<div><b>${acertou ? 'Isso!' : 'Quase.'}</b>${esc(texto)}</div>`;
    const lembrete = acertou ? 'Essa pergunta vai aparecer menos daqui pra frente.' : 'Essa pergunta vai voltar daqui a pouco para você revisar.';
    $('p-explicacao').innerHTML = itens.join('') + `<li class="nota-item">${lembrete}</li>`;
    $('p-resposta').hidden = false;
    $('p-dica').hidden = true;
    aoResponder(acertou);
    if (window.innerWidth < 900) $('p-resposta').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('p-proxima').onclick = () => {
    aoProxima();
    if (window.innerWidth < 900) $('p-enunciado').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return { mostrar };
}
