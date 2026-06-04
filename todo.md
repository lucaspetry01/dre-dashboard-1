
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
