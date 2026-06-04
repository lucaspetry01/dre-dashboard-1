# Dashboard Financeiro - Visão Geral do Aplicativo

## O que é?
Dashboard financeiro para gerenciar fretes, combustível e receitas/despesas de uma transportadora (TR.PETRY Logística). Centraliza dados de 5 veículos, 3 motoristas e 6 rotas em um único lugar.

## Funcionalidades Principais

### 1. Dashboard (Home)
- **4 Cards KPI**: Lucro (verde), Saldo (azul), Receitas (verde), Despesas (vermelho)
- **Gráfico de Barras**: Despesas por categoria (Combustível, Boleto, Pagamentos, etc)
- **Detalhamento de Categorias**: Tabela clicável com 10 tipos de despesa e seus totais
- **Filtros Rápidos**: Hoje, Semana, Trimestre, Ano + 12 meses (Jan-Dez)
- **Filtro Manual**: Por data (Início/Fim)

### 2. Reports (Combustível)
- **Registro de Abastecimentos**: Por placa (IES, IJD, DAJ, MFF, IGU)
- **Sidebar com Pastas**: Cada pasta = uma placa com imagem do veículo
- **Formulário**: Data, Placa, Rota, Motorista, Protocolo
- **Ações**: Criar, Editar, Deletar abastecimentos
- **Imagens**: Foto de cada veículo exibida ao selecionar pasta

### 3. Cargas (Fretes)
- **Tabela de Fretes**: Data, Rota, Motorista, Placa, Frete, Custo, Lucro
- **Filtros**: Por período (Semana/Mês/Semestre), Rota, Motorista, Placa
- **Checkboxes**: Selecionar múltiplas cargas
- **Total Geral**: Faturado, Custo, Lucro (resumo no rodapé)
- **Ações**: Criar, Editar, Deletar cargas
- **Logo**: TR.PETRY exibida no topo

### 4. Upload OFX
- **Botão no Header**: "OFX" para upload de extratos bancários
- **Parser Automático**: Lê arquivo .ofx e extrai transações
- **Categorização**: Classifica automaticamente por tipo (Boleto, Pagamentos, etc)
- **Armazenamento**: Salva no banco de dados com data, valor, categoria

### 5. Busca
- **Botão no Header**: "Buscar" abre modal
- **Funcionalidade**: Procura transações por descrição/categoria/valor
- **Resultado**: Lista de transações encontradas

### 6. Navegação Fixa (StickyFooter)
- **3 Botões**: Dashboard (gráfico), Reports (gráfico), Cargas (caminhão)
- **Sempre Visível**: Fica no rodapé fixo ao rolar página
- **Indicador Ativo**: Destaca seção atual em azul

## Dados & Período
- **Período Coberto**: 02/01/2026 a 02/06/2026 (5 meses)
- **Total de Registros**: 1.630 transações
- **Placas**: IES, IJD, DAJ, MFF, IGU (5 veículos)
- **Motoristas**: FRED, DOUGLAS, CESAR (3 motoristas)
- **Rotas**: GRAMADO, CAXIAS, FAZENDA, CD, POA, OUTROS
- **Categorias**: 10 tipos (Combustível, Boleto, Pagamentos, Impostos, Chapa, Pró-labore, Mecânica, Pedágios, Custo Op, Outros)

## Resumo Financeiro (Período Completo)
- **Lucro**: R$ 5.477,58 (POSITIVO)
- **Saldo**: R$ 9.251,66
- **Receitas**: R$ 336.486,58 (165 entradas)
- **Despesas**: -R$ 331.009,00 (1.465 saídas)

## Tech Stack (Rápido)
- Frontend: React 19 + Tailwind 4 + shadcn/ui
- Backend: Express 4 + tRPC 11
- DB: MySQL/TiDB + Drizzle ORM
- Auth: Manus OAuth
- Testes: Vitest (88 testes ✓)

## Fluxo de Uso Típico
1. Abrir Dashboard → Ver KPIs e gráficos
2. Filtrar por período (ex: "Fevereiro")
3. Clicar em categoria para ver detalhes
4. Ir para Reports → Registrar combustível
5. Ir para Cargas → Visualizar fretes do período
6. Upload OFX → Importar extrato bancário
7. Buscar → Procurar transação específica

## Próximas Melhorias (Sugestões)
- OCR para Notas Fiscais (upload + extração automática)
- Exportar relatório em PDF
- Comparativo período anterior
- Atalhos de teclado (Ctrl+K para busca)
- Dark/Light theme toggle
