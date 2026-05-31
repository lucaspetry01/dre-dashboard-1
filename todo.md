
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
