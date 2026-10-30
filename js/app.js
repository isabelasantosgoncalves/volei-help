import { legendaHTML } from './quadra.js?v=20261021-5';
import { carregarSistemas, carregarFundamentos, guardar } from './dados.js?v=20261021-5';
import { iniciarFundamentos } from './fundamentos.js?v=20261021-5';
import { iniciarSistemas } from './sistemas.js?v=20261021-5';
import { iniciarTreino } from './treino.js?v=20261021-5';
import { iniciarPrancheta } from './prancheta.js?v=20261021-5';

const [sistemas, fundamentos] = await Promise.all([carregarSistemas(), carregarFundamentos()]);
const padrao = sistemas.porId['5-1'] || sistemas.lista[0];

// configuração compartilhada: regra de posicionamento no saque (vale para todos os sistemas)
const ouvintesRegra = [];
const ctx = {
  sistemas,
  fundamentos,
  legenda: sis => legendaHTML(sis.jogadores),
  regrasSaque: padrao.regrasSaque,
  regra() {
    const r = guardar.ler('regra', padrao.regraSaquePadrao);
    return padrao.regrasSaque[r] ? r : padrao.regraSaquePadrao;
  },
  definirRegra(v) {
    if (!padrao.regrasSaque[v]) return;
    guardar.salvar('regra', v);
    ouvintesRegra.forEach(f => f(v));
  },
  aoMudarRegra: f => ouvintesRegra.push(f),
  abrir: (nome, opcoes) => abrir(nome, opcoes),
};

// uma seção com erro não derruba as outras
const seguro = f => { try { return f(ctx); } catch (e) { console.error(e); return {}; } };
const views = {
  inicio: {},
  fundamentos: seguro(iniciarFundamentos),
  sistemas: seguro(iniciarSistemas),
  treino: seguro(iniciarTreino),
  prancheta: seguro(iniciarPrancheta),
};

function abrir(nome, opcoes) {
  if (!Object.hasOwn(views, nome)) nome = 'inicio';
  document.body.classList.toggle('na-inicio', nome === 'inicio');
  document.querySelectorAll('.menu button').forEach(b => {
    if (b.dataset.view === nome) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'v-' + nome; });
  views[nome].aoAbrir?.(opcoes);
  if (location.hash !== '#' + nome) history.replaceState(null, '', '#' + nome);
  window.scrollTo(0, 0);
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-view], [data-ir]');
  if (b) abrir(b.dataset.view || b.dataset.ir);
});
document.querySelector('.logo-link').addEventListener('click', e => { e.preventDefault(); abrir('inicio'); });
window.addEventListener('hashchange', () => abrir(location.hash.slice(1)));
abrir(location.hash.slice(1));
