
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
