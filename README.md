# Vôlei Help

Site estático focado em **rodízios de vôlei**, feito só com HTML, CSS e JavaScript (sem backend, sem APIs externas). Pensado para o celular e preparado para virar app (PWA) no futuro.

- **Início:** logo, slogan e quatro cards (Fundamentos, Sistemas, Quiz, Prancheta).
- **Fundamentos:** numeração da quadra, rotação animada, regra de sobreposição interativa e funções (com as restrições do líbero).
- **Sistemas:** abas 5-1 | 4-2 | 6-0 (abre sempre no 5-1). Quadra com rodízio, fase (recepção ou defesa; na defesa, quem saca aparece com uma bolinha), variação, setas animadas e "minha posição". Embaixo, a explicação da fase e, ao tocar num jogador, o motivo da posição dele.
- **Quiz:** escolha o tema (Fundamentos, 5-1, 4-2, 6-0 ou Misturado), o modo (Perguntas, Montar rodízio ou os dois alternados) e a regra do saque (atual, desde 2025, ou até 2024). Repetição espaçada: o que você erra volta mais vezes. Placar e pontos fracos salvos por tema.
- **Prancheta:** carregue um rodízio pronto ou comece do zero, ajuste arrastando, trace jogadas (e apague um traço específico tocando nele) e salve estratégias.

Navegação: a logo volta para o início. No computador, as seções ficam na barra azul de cima; no celular, numa barra fixa embaixo.

## Estrutura

```
index.html
css/tokens.css     cores, espaços e fonte do design
css/style.css      componentes e telas
js/
  app.js           navegação e configurações compartilhadas
  quadra.js        quadra em SVG (usada em todas as telas)
  dados.js         leitura dos JSON e funções auxiliares
  fundamentos.js   sistemas.js   treino.js   perguntas.js   montar.js   prancheta.js
data/
  sistemas/        index.json + um JSON por sistema (5-1.json, 6-0.json, 4-2.json)
  variacoes/       variações por sistema (5-1.json)
  fundamentos/     textos dos Fundamentos (fundamentos.json)
assets/logos/      logo, logo negativa, ícone e favicon (SVG)
assets/fonts/      Outfit (fonte livre, com a licença OFL)
```

## Rodar no computador

O site precisa de um servidor local (abrir o `index.html` direto bloqueia a leitura dos JSON). Na pasta do projeto:

```bash
python -m http.server 5500
```

Depois abra `http://localhost:5500`.

## Editar os sistemas (`data/sistemas/*.json`)

Coordenadas: `x` de 0 (lateral esquerda) a 100 (lateral direita), olhando para a rede; `y` de 0 (rede) a 100 (linha de fundo). Acima de 100 é a zona de saque (o sacador usa `y: 112`). A linha de 3 m fica em `y ≈ 33`.

Cada rodízio:

```json
{
  "id": "L1", "nome": "L em P1", "apelido": "Levantador sacando",
  "ordem": { "1": "L", "2": "P1", "3": "C1", "4": "OP", "5": "P2", "6": "C2" },
  "fases": {
    "saque":    { "sacador": "L", "resumo": { "antiga": "…", "nova": "…" }, "antiga": { … }, "nova": { … } },
    "recepcao": { "resumo": "…", "receptores": ["P2", "LI", "P1"], "posicoes": { … } },
    "defesa":   { "resumo": "…", "posicoes": { … } }
  }
}
```

Cada jogador numa fase:

```json
"P1": { "x": 78, "y": 58, "para": { "x": 88, "y": 22 }, "motivo": "Texto curto explicando por que ele fica ali." }
```

- `para` (opcional) é para onde ele vai depois (setas de "Posição de jogo").
- `motivo` aparece quando a pessoa toca no jogador e nas explicações do Treino.
- `resumo` é o texto curto da fase inteira, embaixo da quadra.
- Só coloque quem está em quadra (se o líbero entrou no lugar do C2, não coloque o C2).
- No 4-2 e no 6-0, o campo `levantador` do rodízio diz quem levanta naquele rodízio. No 4-2 só os levantadores (L1, L2) têm função; os outros são J1 a J4, sem central fixo e sem líbero.

Para criar um sistema novo, crie o JSON em `data/sistemas/` e registre em `data/sistemas/index.json`.

## Variações (`data/variacoes/5-1.json`)

```json
{ "id": "empilhamento-esquerda", "nome": "Empilhamento na esquerda", "fase": "recepcao",
  "descricao": "…",
  "rodizios": { "L1": { "resumo": "…", "posicoes": { … } } } }
```

A variação aparece no seletor só nos rodízios listados em `rodizios`. Quem mudou de lugar em relação ao padrão ganha um contorno roxo tracejado.

## Fundamentos (`data/fundamentos/fundamentos.json`)

Cada bloco tem `titulo`, `texto` (parágrafos; `**negrito**` funciona) e `interativo` (`numeracao`, `rotacao`, `sobreposicao` ou `funcoes`). Os textos citam a fonte (Regras Oficiais FIVB 2025–2028, edição CBV).

## Versão dos arquivos

Os arquivos de `css/` e `js/` são carregados com um número de versão (`?v=20261021-5`) para o navegador não usar cópias antigas. Ao mudar algum deles, troque esse número em todos os lugares (no `index.html` e nos `import` dos arquivos `js/*.js`). Os arquivos de `data/` sempre são buscados de novo.

## Preparação para app (PWA)

Ainda não foi feito, mas o código já está pronto para isso: tudo é estático, os caminhos são relativos e não há scripts embutidos no HTML. Faltam o `manifest.json` (nome, ícones, cores) e um service worker para funcionar offline.

## Publicar no GitHub Pages

```bash
git init
git add .
git commit -m "Vôlei Help"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/volei-help.git
git push -u origin main
```

No GitHub: **Settings → Pages → Deploy from a branch → main / (root)**.

## Segurança e privacidade

- Sem login, servidor, banco de dados ou coleta de dados. O progresso, a "minha posição" e as estratégias ficam só no `localStorage` de cada navegador.
- Uma Content-Security-Policy no `index.html` só permite scripts, estilos e fontes do próprio site.
- Textos digitados (nome de estratégia) são escapados, e os dados lidos do `localStorage` são validados.
- Não coloque dados pessoais de atletas nos arquivos: tudo no repositório fica público.

## Licenças

- **Outfit** (The Outfit Project Authors): SIL Open Font License 1.1, livre para site e app. Os arquivos ficam em `assets/fonts/` junto com a licença (`OFL-Outfit.txt`).
- **Logo**: SVG desenhado a partir da Grandstander, cujo uso em logo é permitido. O arquivo da fonte não faz parte do projeto.
- **Regras:** os textos são resumos próprios, com a fonte citada. O site não tem vínculo com a FIVB nem com a CBV.
