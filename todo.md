
## Importação OFX (Sicredi)

- [x] Adicionar biblioteca de parsing OFX (parser próprio em TS)
- [x] Criar lib `parseOfx.ts` extraindo data, valor, descrição, FITID
- [x] Criar endpoint tRPC `ofx.processOFX` que salva no banco
- [x] Endpoint `ofx.listar` para o dashboard ler do banco
- [x] Endpoint `ofx.temDados` para fallback inteligente
- [x] Endpoint `ofx.historicoUploads`
- [x] Adicionar botão "Importar OFX" no Dashboard
- [x] Testes do parser OFX (13 testes incluindo SGML legado e anos retroativos)
- [ ] Migrar dados atuais do JSON para o banco (opcional - fica para depois)
- [ ] Atualizar Dashboard para ler do banco automaticamente quando houver dados (opcional)

## Integração OFX completa (Fase 2)

- [ ] Endpoint `ofx.resumoCompleto` que agrega banco no formato dashboard
- [ ] Dashboard usa tRPC para verificar `temDados` no mount
- [ ] Quando há dados, dashboard lê do banco; senão usa JSON
- [ ] Após upload OFX, invalidar queries para atualizar tela automaticamente
- [ ] Indicador visual de fonte (Banco/JSON) para transparência
