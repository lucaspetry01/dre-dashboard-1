
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
- [ ] Migrar dados atuais do JSON para o banco (opcional - não crítico, JSON segue como fallback)

## Integração OFX completa (Fase 2)

- [x] Endpoint `ofx.resumoCompleto` que agrega banco no formato dashboard
- [x] Dashboard usa tRPC para verificar `temDados` no mount (via resumoCompleto)
- [x] Quando há dados, dashboard lê do banco; senão usa JSON
- [x] Após upload OFX, invalidar queries para atualizar tela automaticamente
- [x] Indicador visual de fonte (Banco/JSON) para transparência (badge no header)
- [x] Testes do helper de agregação (5 testes em transacoes.test.ts)
