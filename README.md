# DuoThink

Next.js 16, React 19 e Node.js 22 ou superior.

## Executar

Extraia este pacote em uma pasta nova. Encerre o servidor anterior com Ctrl+C antes de iniciar esta versão. A porta 3000 é explícita: caso já esteja ocupada, a execução informa o erro em vez de abrir outra porta e deixar o projeto antigo em localhost:3000.

```sh
npm ci
npm run dev
```

Abra `http://localhost:3000`.

## Produção

```sh
npm start
```

`npm start` executa um build novo antes de iniciar, para não servir um build anterior após a substituição dos arquivos.

Na Vercel, importe a pasta como um projeto Next.js e associe `grupoduothink.com.br` ao deploy. Em outro servidor Node.js, encaminhe o domínio para a porta usada por `npm start`.

## Organização

| Local | Conteúdo |
| --- | --- |
| `app/[[...route]]/route.js` | Entrega das páginas da DuoThink e dos 12 sites |
| `app/portfolio.mjs` | Apresentação compartilhada do grid e dos nove novos cases |
| `app/api/contact/route.js` | Endpoint de contato |
| `app/contact.js` e `app/sheets.js` | Validação, gravação no Google Sheets e notificação opcional |
| `content/projects.json` | Informações, identidade visual e paleta dos nove novos projetos |
| `pages-original/` | Páginas da DuoThink e dos sites de arquitetura |
| `pages-original/projects/collection.html` | Um único modelo para os nove novos cases |
| `public/assets/` | Imagens, estilos, fontes e scripts da DuoThink |
| `public/assets/images/cases/` | Mockups originais e capturas de cada site em português |
| `public/i18n/` | Navegação dos estudos, limpeza visual e integração dos formulários |
| `public/sites/` | Componentes e dados dos 12 estudos, já localizados em português |
| `content/translations/` | Catálogo de referência das traduções revisadas |
| `site.json` | Mapa das páginas e dos redirecionamentos |
| `tests/` e `tools/check.mjs` | Verificação de rotas, recursos e funcionalidades |

Os documentos preservam o HTML e os efeitos de cada site. As imagens, vídeos e fontes dos projetos continuam usando os CDNs definidos nos arquivos de origem e precisam de conexão com a internet. Os componentes e catálogos localizados são entregues pelo próprio projeto. Os recursos e formulários próprios dos fornecedores originais continuam sujeitos à disponibilidade e às configurações desses fornecedores.

## Acesso aos projetos

| Case | Site |
| --- | --- |
| `/projects/bruno-brandini` | `/bruno-brandini` |
| `/projects/cakra` | `/cakra` |
| `/projects/calibre` | `/calibre` |
| `/projects/cavora` | `/cavora` |
| `/projects/forma` | `/forma` |
| `/projects/grid` | `/grid` |
| `/projects/housemood` | `/housemood` |
| `/projects/intera` | `/intera` |
| `/projects/korda` | `/korda` |
| `/projects/totnt` | `/totnt` |
| `/projects/viresta` | `/viresta` |
| `/projects/zeta` | `/zeta` |

Os três destaques originais permanecem na apresentação anterior. Os outros nove projetos aparecem em um grid alfabético. Cada novo case usa apenas o mockup de notebook, suas informações, a paleta sem bordas e a descrição da identidade visual.

Os nove projetos usam fotografias finalizadas em 2880 × 2160 pixels, com reflexos roxos nos monitores e telas de notebook limpas. As capturas dos sites em português usam a proporção 16:10, com até 1600 pixels de largura. Cada mockup é carregado como uma única imagem, substituindo a montagem em camadas da edição anterior. Os arquivos finais estão em `public/assets/images/cases/collection/`.

O botão “Acessar site” aparece no início de cada case e acompanha a animação de entrada. `/cakro` redireciona para `/cakra`. As páginas internas usam o prefixo do respectivo site.

## Contato

O formulário da DuoThink revela uma pergunta por vez, conserva as respostas anteriores e valida cada etapa. Os pedidos são gravados no Google Sheets pelo servidor. Consulte [a configuração da planilha](docs/google-sheets.md); o cabeçalho inicial está em `docs/google-sheets-header.csv`.

Preencha `GOOGLE_SHEETS_ID`, `GOOGLE_SHEETS_TAB`, `GOOGLE_CLIENT_EMAIL` e `GOOGLE_PRIVATE_KEY` no ambiente do servidor. A integração não está conectada a uma planilha real até essas variáveis serem configuradas e a planilha ser compartilhada com a conta de serviço.

O Resend continua disponível como notificação opcional depois da gravação. Sem a configuração do Sheets ou diante de erro, o formulário conserva os dados e informa que o pedido não foi confirmado.

## Verificações

```sh
npm run check
npm test
npm run build
```


### Português desde a primeira renderização

Os 12 estudos entregam o HTML em português. Os componentes interativos e os 199 registros dos catálogos também usam conteúdo localizado, inclusive em serviços, projetos, produtos e artigos. A tradução por mutação do DOM foi removida; o carregamento não depende mais de esperar um tradutor para trocar o inglês. Os arquivos de entrada têm uma versão de idioma para renovar o cache.

As coleções locais ficam em `public/sites/<estudo>/data/`. Os índices binários externos foram substituídos pela consulta completa com cache desses catálogos pequenos, mantendo filtros, ordenação, referências e endereços dos projetos compatíveis com os dados traduzidos. Não substitua esses arquivos pelos catálogos em inglês dos templates.

Os textos localizados estão no HTML, nos componentes de `public/sites/` e nesses dados. `content/translations/` registra o vocabulário da revisão. As imagens das thumbs foram conferidas e preservadas, sem alterações nos mockups, na identidade visual ou nos recortes.

Os créditos de criação dos estudos usam “Desenvolvido por DuoThink”. Os telefones de demonstração aparecem como `+00 (00) 00000-0000`. O Instagram aponta para `https://www.instagram.com/duo.think/`; as demais redes têm destinos vazios e seus cliques não navegam nem recarregam a página. Essas definições ficam em `public/i18n/studio-identity.mjs`, com os textos e destinos já aplicados ao HTML, aos componentes e aos catálogos. Os vídeos incorporados são preservados.

Os e-mails de demonstração e os links de contato usam `contato@email.com`. Endereços e destinos dos mapas dos estudos utilizam localidades brasileiras. As descrições de serviços, projetos, produtos e artigos foram revisadas para reduzir traduções literais e melhorar a leitura. O HTML inicial também preserva as palavras completas nos textos animados, inclusive em contatos e créditos.

A verificação automatizada inclui a resposta inicial em português nos 12 sites, as rotas internas e as dependências locais dos componentes (`npm test` e `npm run check`).

## Bruno Brandini

Substitui o case Archevo na coleção. O case fica em `/projects/bruno-brandini` e o site integrado em `/bruno-brandini`. Os endereços anteriores redirecionam para as novas páginas. A identidade e as fotografias estão em `public/sites/bruno-brandini/brand/`.

### Correção do layout Bruno Brandini

Os documentos e os módulos foram restaurados a partir do Archevo original da coleção. As mudanças se limitam ao nome, à substituição do carvão pelo verde #2A342B e às fotografias. O nome usa o mesmo espaço 123 × 21 da marca de origem; a logomarca BRN não é utilizada. A folha `photography.css` seleciona o enquadramento vertical na abertura mobile sem alterar a geometria das seções. Algumas fotografias foram ampliadas por IA; o entorno gerado não documenta áreas reais do imóvel. As prévias do case são mockups ilustrativos. Os prompts estão em `content/bruno-brandini-image-edits.json`. A validação por navegador não ficou disponível neste ambiente.

### Navegação e imagens revisadas

Os links internos do Bruno Brandini abrem documentos completos servidos pelo Next.js. Isso evita depender da troca de página do runtime do template em rotas de coleção; os efeitos e animações dentro das páginas permanecem nos módulos originais. A configuração canônica do runtime usa o domínio atual.

Os 19 retratos e fotos de estúdio originais estão em `public/sites/bruno-brandini/brand/team-original/`, sem edição. As fotografias de arquitetura que estavam na equipe foram direcionadas a galerias de projeto e serviços. As prévias da coleção tiveram as faixas verdes removidas por ampliação da fotografia, mantendo o mockup.

Validação desta revisão: build de produção; testes automatizados de navegação e identificação da equipe; leitura dos cinco registros de projetos pelo runtime real; carregamento dos componentes das cinco páginas de projeto e das páginas principais; respostas HTTP das 26 rotas de conteúdo e 95 referências de recursos. A revisão interativa em navegador ficou indisponível porque o ambiente bloqueou a inicialização do navegador.

### Revisão Bruno Brandini — 24/11/2026

- Os cinco detalhes de projetos usam o HTML responsivo já exportado, com navegação e animações de entrada independentes. O conteúdo não fica escondido aguardando a hidratação do catálogo; os demais sites mantêm seus runtimes originais.
- Rodapé com fotografia recortada pela máscara SVG vetorial do nome, links com quebra natural, créditos alinhados à direita e avaliações com espaçamento entre nome e cargo.
- O bloco “Apresentado por” não é exibido. A localização e os links de mapa apontam para São Paulo, SP; nenhum endereço de rua foi inventado.
- A validação estática é executada com `npm test` e `npm run check`.
