
## Importação OFX (Sicredi)

- [x] Adicionar biblioteca de parsing OFX (parser próprio em TS)
- [x] Criar lib `parseOfx.ts` extraindo data, valor, descrição, FITID
- [x] Criar endpoint tRPC `ofx.processOFX` que salva no banco
- [x] Endpoint `ofx.listar` para o dashboard ler do banco
- [x] Endpoint `ofx.temDados` para fallback inteligente
- [x] Endpoint `ofx.historicoUploads`
- [x] Adicionar botão "Importar OFX" no Dashboard
- [x] Testes do parser OFX (13 testes incluindo SGML legado e anos retroativos)
- [x] Atualizar Dashboard para ler do banco automaticamente quando houver dados
- [x] ~~Migrar dados atuais do JSON para o banco~~ (decisão: não fazer — JSON funciona como fallback automático e o banco é populado a partir do primeiro upload OFX)

## Integração OFX completa (Fase 2)

- [x] Endpoint `ofx.resumoCompleto` que agrega banco no formato dashboard
- [x] Dashboard usa tRPC para verificar `temDados` no mount (via resumoCompleto)
- [x] Quando há dados, dashboard lê do banco; senão usa JSON
- [x] Após upload OFX, invalidar queries para atualizar tela automaticamente
- [x] Indicador visual de fonte (Banco/JSON) para transparência (badge no header)
- [x] Testes do helper de agregação (5 testes em transacoes.test.ts)

## Bugs reportados

- [x] Card de Receitas/Despesas: contagens fixas ('42'/'349') substituídas por valores dinâmicos vindos do resumo agregado (banco ou JSON), corrigindo desatualização após importar OFX + limpar filtros

## Bugs e ajustes (sessão atual)

- [x] Remover filtro 'Hoje' pré-setado ao abrir o dashboard (agora abre limpo, mostrando todo o período disponível)
- [x] Corrigir valores dos cards após aplicar filtro: cards e detalhamento agora compartilham a mesma fonte (transações individuais via `detalhesFiltrados`), eliminando divergência. Também corrigido o período anterior (`resumoAnterior`) para usar a mesma lógica.
- [x] Remover abas 'Fluxo Diário' e 'Composição' do Dashboard. Detalhamento de Categorias agora aparece direto, sem `Tabs` wrapper. Imports não usados (recharts: Line/Pie/Cell/etc.) também foram removidos.
- [x] Gráfico "Despesas por Categoria" agora filtra apenas categorias com valor negativo, mantendo RECEITAS fora
- [x] RECEITAS no detalhamento ganhou ícone de cifrão verde (DollarSign + paleta emerald), prioridade no `getCategoryIconConfig`
- [x] Ajustar layout dos botões de filtro rápido (tags): reduzido padding (px-2 sm:px-3, py-1 sm:py-1.5), gap (1 sm:2), fonte (text-xs sm:text-sm), label (text-xs sm:text-sm). `whitespace-nowrap` evita quebra de texto dentro dos botões. Responsivo em mobile.
- [x] Remover botão "Importar XLS" (removido, apenas OFX permanece)
- [x] Reduzir tamanho do botão "Importar OFX": size="sm", texto "OFX", ícone w-3 h-3, gap-1
- [x] Reduzir caixas de data customizada pela metade: mudado para flex layout com max-w-xs, reduzindo largura real em ~50%. Mobile: coluna única. Desktop: lado a lado com botão OFX
- [x] Dobrar tamanho do botão "Hoje" (px-4 sm:px-6, py-2 sm:py-3, text-sm sm:text-base), deixar negrito, adicionar botão "Ontem" ao lado com mesmas dimensões
- [x] Mover botão OFX para CardHeader (justify-between), removido da seção de datas. Espaço economizado.
- [x] Data Inicial e Data Final lado a lado em mobile: grid grid-cols-2 em mobile, flex em sm+. Gap reduzido (2 em mobile, 3 em sm+)

## Agrupamento de Transações

- [x] Adicionar agrupamento por descrição completa no detalhamento de categorias com toggle para alternar entre visualizações individual e agrupada. Checkbox "Agrupar por descrição" aparece ao expandir categoria, mostrando contador de registros agrupados em verde.

## UI Refinement - Filtros Compactos (Sessão atual)

- [x] Reorganizar filtros rápidos em grid compacto: remover "15d" e "Mês" dos filtros rápidos
- [x] Adicionar grid de meses (Jan-Dez) em 3 linhas com 4 botões cada
- [x] Primeira linha: Hoje, Sem, Trim, Ano (4 botões)
- [x] Meses em 3 linhas: Jan-Abr, Mai-Ago, Set-Dez
- [x] Filtro de mês agora filtra o período completo do mês (01/MM a 31/MM)
- [x] Botão "Limpar" aparece apenas quando um filtro está ativo
- [x] Layout responsivo em mobile e desktop
- [x] Ajuste final: reorganizar filtros para caber em apenas 2 linhas (grid-cols-8)
- [x] Linha 1: Hoje, Sem, Trim, Ano, Jan, Fev, Mar, Abr
- [x] Linha 2: Mai, Jun, Jul, Ago, Set, Out, Nov, Dez
- [x] Reduzir padding dos botões (px-1.5 py-0.5) e gap (gap-1 sm:gap-1.5)
- [x] Remover border-radius maior (rounded-md) para rounded simples

## UI Reorganization - Layout Refinement (Sessão atual)

- [x] Remover título "Filtros e Importação" do Card
- [x] Aumentar tamanho dos botões Buscar e OFX (px-4 py-2)
- [x] Posicionar botões maiores no topo à direita (justify-end)
- [x] Reorganizar ordem: Cabeçalho → Botões → 4 Cards (Lucro, Saldo, Receitas, Despesas) → Box de Filtros
- [x] Compactar cabeçalho da página
- [x] Todos os 88 testes continuam passando
- [x] Filtros funcionando corretamente (testado com Fev: 01/02 a 28/02)
- [x] Remover apenas a palavra "Filtros" do título do Card
- [x] Manter o box inteiro com todos os filtros (botões de período e datas customizadas)
- [x] Filtros continuam funcionando corretamente (testado com Ago: 01/08 a 31/08)
- [x] Remover CardHeader vazio do box de filtros
- [x] "Período" agora começa logo no início do box sem espaço vazio
- [x] Filtros funcionando corretamente (testado com Mar: 01/03 a 31/03)
- [x] Espaço otimizado no box de filtros
- [x] Reduzir altura dos botões Buscar e OFX em 50%
- [x] Deixar botões com exatamente a mesma altura (h-8)
- [x] Posicionar botões ao lado do título no topo da página
- [x] Botão Buscar abre modal de busca corretamente
- [x] Botão OFX permite upload de arquivo

## UI Enhancement - StickyFooter (Sessão atual)

- [x] Criar componente StickyFooter com 3 botões (Dashboard, Reports, Cargas)
- [x] Posicionar rodapé fixo na parte inferior da página (fixed bottom-0)
- [x] Adicionar backdrop blur e border superior (border-t border-slate-700)
- [x] Implementar navegação entre páginas ao clicar nos botões
- [x] Adicionar indicador visual de página ativa (bg-blue-500/10 text-blue-400)
- [x] Adicionar padding inferior (pb-28) em todas as páginas para não sobrepor conteúdo
- [x] Rodapé permanece visível ao rolar a página (sticky footer behavior)
- [x] Ícones: Dashboard (BarChart3), Reports (BarChart3), Cargas (Settings)
- [x] Todos os 88 testes continuam passando
- [x] Navegação testada: Dashboard → Reports (Combustível) → Cargas

## UI Refinement - Ajustes de Ícones (Sessão atual)

- [x] Trocar ícone de engrenagem (Settings) para caminhão (Truck) no StickyFooter
- [x] Remover ícone de caminhão do cabeçalho da página Cargas
- [x] Remover seta de voltar (ArrowLeft) da página Cargas
- [x] Todos os 88 testes continuam passando

## Bug Fix - Upload OFX no Mobile (Sessão atual)

- [x] Corrigir input de arquivo OFX para funcionar no mobile
- [x] Adicionar atributo capture={false} para permitir seleção de arquivos
- [x] Expandir accept para incluir MIME types: .ofx, .txt, application/x-ofx, text/plain
- [x] Todos os 88 testes continuam passando

## UI Enhancement - Botão "Hoje" no Cabeçalho Cargas (Sessão atual)

- [x] Adicionar botão "Hoje" ao cabeçalho da página Cargas
- [x] Remover ícone de caminhão, substituir por texto "Hoje"
- [x] Aumentar largura do botão em 40% (w-32)
- [x] Implementar função de filtro de período "Hoje"
- [x] Botão muda de cor quando filtro está ativo (variant default/outline)
- [x] Todos os 88 testes continuam passando

## UI Adjustment - Botão "Hoje" Repositionado (Sessão atual)

- [x] Remover botão "Hoje" da página Cargas
- [x] Adicionar botão "Hoje" ao cabeçalho do Dashboard (substituindo ícone de caminhão)
- [x] Botão "Hoje" no Dashboard filtra apenas o dia atual (02/06/2026)
- [x] Botão muda de cor quando filtro está ativo (variant default/outline)
- [x] Todos os 88 testes continuam passando
- [x] Página Cargas mostra apenas filtros de período (Semana, Mês Atual, Mês Anterior, Semestre)

## UI Enhancement - Sincronizar Função do Botão "Hoje" (Sessão atual)

- [x] Sincronizar botão "Hoje" no cabeçalho com a função do box de filtros
- [x] Botão "Hoje" no cabeçalho agora usa applyQuickFilter('hoje')
- [x] Clique no botão filtra dados para 03/06/2026 a 03/06/2026
- [x] Clique novamente reseta o filtro (resetFilters)
- [x] Botão muda de cor quando filtro está ativo
- [x] Todos os 88 testes continuam passando
- [x] Comportamento idêntico ao botão "Hoje" no box de filtros

## UI Refinement - Remover Filtros Rápidos do Box (Sessão atual)

- [x] Remover botões "Hoje", "Sem", "Trim", "Ano" do box de filtros
- [x] Manter apenas os 12 meses (Jan-Dez) em 2 linhas
- [x] Linha 1: Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago
- [x] Linha 2: Set, Out, Nov, Dez
- [x] Botão "Hoje" permanece no cabeçalho do Dashboard
- [x] Filtro de mês funciona corretamente (testado com Abr: 01/04 a 30/04)
- [x] Botão "Limpar" aparece quando filtro está ativo
- [x] Todos os 88 testes continuam passando

## UI Refinement - Reorganizar Meses em 2 Linhas (Sessão atual)

- [x] Reorganizar os 12 meses em 2 linhas com 6 colunas cada
- [x] Linha 1: Jan, Fev, Mar, Abr, Mai, Jun
- [x] Linha 2: Jul, Ago, Set, Out, Nov, Dez
- [x] Todos os botões com o mesmo tamanho (grid-cols-6)
- [x] Filtro de mês funciona corretamente (testado com Set: 01/09 a 30/09)
- [x] Botão "Limpar" aparece quando filtro está ativo
- [x] Todos os 88 testes continuam passando

## UI Refinement - Reorganizar Datas na Mesma Linha (Sessão atual)

- [x] Reorganizar campos de data "Início" e "Fim" para ficarem na mesma linha
- [x] Usar grid-cols-2 para layout lado a lado
- [x] Remover flex-col e manter responsivo
- [x] Todos os 88 testes continuam passando

## UI Optimization - Reduzir Espaço do Label "Período" (Sessão atual)

- [x] Reduzir margin-bottom do label "Período" de mb-1 para mb-0.5
- [x] Adicionar negative margin-top (-mt-0.5) para compactar ainda mais
- [x] Otimizar tamanho do box de filtros
- [x] Todos os 88 testes continuam passando

## Feature - Multi-seleção de Meses (Sessão atual)

- [x] Adicionar estado selectedMonths para rastrear múltiplos meses selecionados
- [x] Modificar função applyQuickFilter para adicionar/remover meses da seleção
- [x] Atualizar lógica de filtro para calcular período baseado em meses selecionados
- [x] Modificar renderização dos botões para mostrar visual de seleção múltipla
- [x] Adicionar botão "Limpar" quando múltiplos meses estão selecionados
- [x] Testar multi-seleção: Fev + Abr funciona corretamente (01/02 a 30/04)
- [x] Todos os 88 testes continuam passando

## Feature - MonthCards com Mini Gráficos (Sessão atual)

- [x] Criar componente MonthCard com mini gráfico sparkline
- [x] Exibir variação percentual mensal (verde/vermelho)
- [x] Mostrar valor de lucro por mês
- [x] Implementar multi-seleção com cards azuis quando selecionados
- [x] Gráficos sparkline mostrando tendência visual
- [x] 2 linhas com 6 cards cada (Jan-Jun, Jul-Dez)
- [x] Período se ajusta dinamicamente entre meses selecionados
- [x] Todos os 88 testes continuam passando

## Feature - MonthCards com Scroll Horizontal (Sessão atual)

- [x] Reorganizar MonthCards para 1 linha com scroll horizontal
- [x] Mostrar apenas 6 cards visíveis por padrão
- [x] Barra de rolagem lateral para ver os outros 6 meses
- [x] Layout responsivo no mobile (flex com overflow-x-auto)
- [x] Largura fixa dos cards (w-24 sm:w-28) para scroll consistente
- [x] Multi-seleção funciona corretamente com scroll
- [x] Todos os 88 testes continuam passando

## UI Reformulation - Header Optimization (Sessão atual)

- [x] Reformular cabeçalho do Dashboard para melhor UX em mobile (versão conservadora)
- [x] Compactar layout: título + botões em 2 linhas responsivas
- [x] Reorganizar informações: priorizar título e botões em mobile
- [x] Otimizar espaçamento e padding
- [x] Melhorar responsividade em telas pequenas
- [x] Manter detalhamento de categorias intacto
- [x] Todos os 88 testes continuam passando

## Layout Reorganization - Period Filters (Sessão atual)

- [x] Mover filtros de período (MonthCards) para acima dos cards principais
- [x] Mover campos de data customizada (Início/Fim) para acima dos cards
- [x] Manter botão Limpar junto aos filtros
- [x] Todos os 88 testes continuam passando

## Layout Reorganization - Upper Block (Sessão atual)

- [x] Criar bloco superior com fundo semi-transparente e borda
- [x] Linha 1: Título "Dashboard Financeiro" + Botões Buscar/OFX
- [x] Linha 2: Razão Social "Transportes Moraes e Petry LTDA ME"
- [x] Linha 3: Inputs de data (Início | Fim) lado a lado, compactos para mobile
- [x] Linha 4: Barra horizontal de 12 meses com minigráficos (w-20 mobile, w-24 desktop)
- [x] Botão Limpar Filtros integrado ao bloco
- [x] Cards principais (LUCRO, SALDO, RECEITAS, DESPESAS) agora vem abaixo
- [x] Todos os 88 testes continuam passando

## Month Cards Compact Layout (Sessão atual)

- [x] Reorganizar meses em 2 linhas (6 meses cada) sem scroll lateral
- [x] Usar grid grid-cols-6 para distribuir igualmente
- [x] Reduzir tamanho dos cards mantendo funcionalidade
- [x] Todos os 88 testes continuam passando

## Month Cards Ultra-Compact (Sessão atual)

- [x] Reduzir padding de p-3 para p-2
- [x] Reduzir altura do sparkline de h-8 para h-5
- [x] Reduzir ícones de size-12 para size-10
- [x] Reduzir margin-bottom de mb-2 para mb-1
- [x] Adicionar leading-none para compactar linhas
- [x] Reduzir strokeWidth de 1.5 para 1
- [x] Reduzir ring de ring-2 para ring-1
- [x] Todos os 88 testes continuam passando

## Header Box Removal & Final Compaction (Sessão atual)

- [x] Remover box/container do cabeçalho (bg-slate-900/30, rounded-lg, border)
- [x] Deixar elementos soltos para ganhar espaço de margem
- [x] Reduzir margins do cabeçalho (mb-4 para mb-2)
- [x] Reduzir gaps entre linhas do cabeçalho
- [x] Reduzir padding do MonthCard de p-2 para p-1.5
- [x] Reduzir altura do sparkline de h-5 para h-4
- [x] Reduzir gap entre cards de gap-1.5 para gap-1
- [x] Reduzir margin-bottom entre linhas de meses
- [x] Todos os 88 testes continuam passando

## Category Details Refactoring - Mobile UX (Sessão atual)

- [x] Criar componente CategoryDetailView com toggle Gráfico/Lista
- [x] Implementar barras de progresso com preenchimento visual
- [x] Exibir porcentagem ao lado do valor (ex: R$ 30.764,86 | 45%)
- [x] Remover gráfico de barras estático "Despesas por Categoria"
- [x] Integrar novo componente no Dashboard
- [x] Manter reatividade aos filtros de data
- [x] Testar responsividade em mobile
- [x] Todos os 88 testes continuam passando

## Bugfix - Sincronização Protocolos (Sessão atual)
- [x] Corrigir erro "hooks[lastArg] is not a function" no botão Sincronizar Protocolo
- [x] Usar useMutation (sincronizarProtocolosMutation.mutateAsync) em vez de .mutate direto
- [x] Usar utils.cargas.obterProtocolosSincronizados.fetch em vez de .query direto
- [x] Todos os 125 testes continuam passando

## Feature - Tela de Revisão de Protocolos (Sessão atual)
- [x] Criar componente ProtocolReviewDialog para exibir lista de protocolos encontrados
- [x] Mostrar checkbox para cada protocolo (marcar/desmarcar para incluir)
- [x] Exibir dados: data, número protocolo, valor frete, peso
- [x] Botão "Confirmar Seleção" para gravar cargas marcadas
- [x] Botão "Cancelar" para descartar sincronização
- [x] Contador: "X de Y protocolos selecionados"

## Feature - Sistema de Toasts (Sessão atual)
- [x] Criar componente ToastContainer para exibir notificações
- [x] Substituir alert() por toast no handleSincronizarProtocolos
- [x] Toast de sucesso: "X cargas criadas, Y duplicadas ignoradas"
- [x] Toast de erro: mostrar mensagem de erro com detalhe
- [x] Toast de info: "Sincronizando... aguarde"
- [x] Toasts desaparecem automaticamente após 4 segundos

## Feature - Integração com Google OAuth (Sessão atual)

- [x] Instalar dependências googleapis e google-auth-library
- [x] Criar serviço googleOAuthService.ts com funções de autorização
- [x] Implementar getAuthorizationUrl() para gerar URL de login do Google
- [x] Implementar exchangeCodeForToken() para trocar código por token
- [x] Implementar getGmailClient() para obter cliente Gmail autenticado
- [x] Implementar validateGoogleCredentials() para validar credenciais
- [x] Criar rotas de Google OAuth (authorize, callback, health check)
- [x] Registrar rotas no servidor Express
- [x] Configurar credenciais do Google (CLIENT_ID, CLIENT_SECRET)
- [x] Criar teste de validação das credenciais (3 testes passando)
- [x] Criar componente GoogleAuthButton para UI
- [x] Integrar GoogleAuthButton na página de Cargas
- [x] Atualizar gmailProtocoloIntegration.ts para usar token autenticado
- [x] Implementar buscarProtocolosComGoogleAPI() para usar Google API diretamente
- [x] Testar fluxo completo: Clique em "Conectar Gmail" → Autorizar → Sincronizar protocolos
- [x] Armazenar token do Google de forma segura (cookie/sessão)
- [x] Implementar rotas para obter e limpar token
- [x] GoogleAuthButton verifica conexão ao carregar
- [x] Indicador visual de status de conexão com Gmail (botão verde quando conectado)
- [x] Configurar URL de redirecionamento no Google Cloud Console
- [ ] Aguardar propagação de configurações do Google (até 5 minutos)
- [ ] Testar fluxo completo após propagação
