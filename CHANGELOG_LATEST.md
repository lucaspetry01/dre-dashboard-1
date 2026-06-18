# Changelog - Sincronização Retroativa de Regras e Correções

## Data: 18/06/2026
## Versão: 151e9296

### 🔧 Principais Alterações

#### 1. **Sincronização Retroativa de Regras de Categorização**
- **Arquivo**: `server/db/regras.ts`
- **Função**: `aplicarRegrasRetroativamente()`
- **O que foi feito**: 
  - Reativada função que estava desabilitada
  - Agora aplica regras apenas a transações em categorias genéricas (PAGAMENTOS, SAÍDAS NÃO CATEGORIZADAS)
  - Não recategoriza transações já categorizadas corretamente
  - Retorna número de transações atualizadas

#### 2. **Botão de Sincronizar com Progresso Visual**
- **Arquivo**: `client/src/pages/Dashboard.tsx`
- **Função**: `handleSync()`
- **O que foi feito**:
  - Adicionado estado `syncProgress` (0-100%)
  - Barra de progresso azul visual no botão durante sincronização
  - Tooltip mostrando percentual em tempo real
  - Indicador amarelo desaparece durante sincronização
  - Progresso simulado com incrementos aleatórios (0-90% enquanto aguarda, depois 95-100%)

#### 3. **Correção de Parser de Datas**
- **Arquivo**: `client/src/pages/Dashboard.tsx`
- **Função**: `parseRegistroDate()`
- **O que foi feito**:
  - Agora aceita ambos os formatos de data:
    - ISO: `YYYY-MM-DD`
    - Brasileiro: `DD/MM/YYYY`
  - Resolve bug onde categorias com datas em formato ISO não apareciam

#### 4. **Remoção de Filtro de Categorias Vazias**
- **Arquivo**: `client/src/pages/Dashboard.tsx`
- **Linha**: ~481
- **O que foi feito**:
  - Removido filtro `valor_abs > 0` quando nenhuma data é selecionada
  - Agora mostra TODAS as categorias com registros, independente do saldo

#### 5. **Desativação Temporária de Filtros de Banco**
- **Arquivo**: `client/src/pages/Dashboard.tsx`
- **Função**: `toggleAccount()` (comentada)
- **O que foi feito**:
  - Botões BB, Itaú, Nubank agora são visuais apenas
  - Funcionalidade de filtro comentada com bloco TODO
  - Pronto para implementação futura

### 🐛 Bugs Corrigidos

1. ✅ Categorias ocultas quando nenhum filtro de data era selecionado
2. ✅ Registros com formato ISO de data não apareciam
3. ✅ Sincronização retroativa causando recategorização incorreta
4. ✅ Falta de feedback visual durante sincronização

### 📝 Próximos Passos

1. **Implementar filtro de banco** (BB/Itaú/Nubank)
   - Descomente código em `Dashboard.tsx` linha ~138-150
   - Implemente lógica de filtro baseada em `selectedAccounts`

2. **Página Cargas**
   - Criar novo arquivo: `client/src/pages/Cargas.tsx`
   - Adicionar formulário com filtros por placa, motorista, status

3. **Página Rotas PM**
   - Criar novo arquivo: `client/src/pages/RotasPM.tsx`
   - Integrar componente Map.tsx para visualização de rotas

### 📦 Arquivos Modificados

- `server/db/regras.ts` - Função `aplicarRegrasRetroativamente()` reativada
- `server/routers/ofx.ts` - Router `aplicarRegrasRetroativas` já existente
- `client/src/pages/Dashboard.tsx` - Múltiplas melhorias (handleSync, parseRegistroDate, UI do botão)

### 🔗 Commits Relacionados

- Anterior: `9aa736c0` - Correção de parseRegistroDate
- Atual: `151e9296` - Sincronização retroativa + Barra de progresso

---

**Desenvolvido por**: Manus AI Assistant
**Para**: Continuação por próximo desenvolvedor
