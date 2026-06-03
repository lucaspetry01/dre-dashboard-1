# Prompt de Continuação - Dashboard Financeiro DRE

## Tech Stack
- **Frontend**: React 19 + Tailwind 4 + shadcn/ui
- **Backend**: Express 4 + tRPC 11 + Drizzle ORM
- **Database**: MySQL/TiDB
- **Auth**: Manus OAuth (built-in)
- **Testing**: Vitest (88 tests passing)
- **Deployment**: Manus WebDev (auto-deploy on checkpoint)

## Projeto
**Dashboard Financeiro - Transportadora** (TR.PETRY Logística)
- URL: https://drefinance-bsz8ybpg.manus.space
- Checkpoint: manus-webdev://06043ebd
- 3 seções principais: Dashboard (KPIs), Reports (Combustível), Cargas (Fretes)

## Core Features Implementadas
1. **Dashboard**: 4 cards KPI (Lucro, Saldo, Receitas, Despesas) + gráficos de categoria
2. **Filtros**: Período rápido (Hoje/Sem/Trim/Ano + 12 meses) + filtro manual por data
3. **Combustível**: Registro de abastecimentos por placa (IES, IJD, DAJ, MFF, IGU)
4. **Cargas**: Tabela de fretes com filtros por rota, motorista, placa, período
5. **Upload OFX**: Parser de extratos bancários com categorização automática
6. **StickyFooter**: Navegação fixa (Dashboard, Reports, Cargas)

## Regras de Negócio (Caxias)
- **Tons**: Combustível, Boleto, Pagamentos, Impostos, Chapa, Pró-labore, Mecânica, Pedágios, Custo Op, Outros
- **Placas**: IES, IJD, DAJ, MFF, IGU (5 veículos)
- **Rotas**: GRAMADO, CAXIAS, FAZENDA, CD, POA, OUTROS
- **Motoristas**: FRED, DOUGLAS, CESAR (3 motoristas)
- **Período**: 02/01/2026 a 02/06/2026 (dados de 5 meses)

## Próxima Tarefa
**Implementar módulo de OCR/Imagem para Notas Fiscais**
- Upload de imagens (NF-e, recibos, comprovantes)
- Extração de dados via OCR (Tesseract ou API externa)
- Vinculação automática com transações existentes
- Armazenamento em S3 com metadata no banco

## Estrutura de Arquivos Chave
```
server/routers.ts          # Procedures tRPC
server/db.ts               # Query helpers
drizzle/schema.ts          # Database schema
client/src/pages/          # Dashboard, Combustivel, Cargas
client/src/components/     # StickyFooter, DashboardLayout, etc
```

## Comandos Úteis
```bash
pnpm dev              # Dev server
pnpm test             # Vitest (88 tests)
pnpm db:push          # Drizzle migrations
pnpm build            # Build production
```

## Notas Importantes
- Todos os secrets via `webdev_request_secrets` (OAuth, API keys)
- Imagens/media em S3 via `storagePut()` (não local)
- Testes obrigatórios antes de checkpoint
- Sempre rodar `pnpm test` após mudanças
- Manter todo.md atualizado com [x] items
