## Plan: Sistema de Ponto Eletronico

Implementar um modulo de ponto diario consolidado no backend e uma interface dedicada no frontend, reutilizando os padroes existentes de aprovacao e isolamento por conta. A regra central sera: usuario comum edita apenas enquanto pendente; ADMIN pode editar inclusive aprovado; exportacao CSV disponivel para ADMIN com filtros por periodo/status e escopo da conta.

**Steps**
1. Fase 1 - Contrato e dominio backend
2. Definir o schema de ponto diario com campos de auditoria e aprovacao: funcionario, data, entrada, saida, intervaloMinutos, horasTrabalhadas, status (pending/approved), aprovadoPor, aprovadoEm, account, createdBy, updatedBy. *base para as demais fases*
3. Criar DTOs de criacao/edicao/aprovacao com validacoes de negocio (horario valido, data obrigatoria, horas totais coerentes).
4. Criar service com CRUD, aprovacao, listagem paginada e filtros por periodo/status/funcionario, mantendo account filter em todas as consultas. *depende de 2 e 3*
5. Implementar regra de permissao no update: usuario nao ADMIN so altera quando status = pending e registro proprio; ADMIN pode alterar qualquer status dentro da conta. *depende de 4*
6. Expor endpoint de exportacao CSV para ADMIN, aplicando mesmos filtros da listagem e serializando dados para colunas de relatorio. *depende de 4*
7. Integrar modulo no AppModule e incluir limpeza por conta no fluxo de exclusao administrativa. *depende de 4*
8. Fase 2 - Interface frontend
9. Criar tela de ponto com tabela paginada, filtros por periodo/status/funcionario e acoes por role (aprovar/editar/exportar).
10. Implementar formularios de criar/editar ponto com validacao local e mutacoes React Query; bloquear edicao do usuario comum apos aprovacao.
11. Implementar acao de aprovar para ADMIN e botao de exportar CSV (download), ambos visiveis apenas para ADMIN.
12. Adicionar textos de i18n em PT e EN para labels, mensagens de sucesso/erro e estados de aprovacao.
13. Fase 3 - Qualidade e validacao
14. Cobrir backend com testes de service/controller para: isolamento por conta, bloqueio de edicao apos aprovacao para nao ADMIN, edicao por ADMIN em aprovado e exportacao CSV.
15. Validar frontend com cenarios de role (ADMIN vs usuario comum), filtros, aprovacao e exportacao.
16. Executar build/testes dos repos afetados e registrar lacunas se houver testes e2e pendentes. *depende de 1 e 2*

**Relevant files**
- e:/Projects/salvtec/salvtec-app/salvtec-app-be/src/vehicle-usages/vehicle-usages.service.ts - referencia de fluxo de aprovacao e filtros.
- e:/Projects/salvtec/salvtec-app/salvtec-app-be/src/vehicle-usages/vehicle-usages.controller.ts - referencia de endpoints e guards por role.
- e:/Projects/salvtec/salvtec-app/salvtec-app-be/src/auth/decorators/get-account.decorator.ts - extracao de account para isolamento.
- e:/Projects/salvtec/salvtec-app/salvtec-app-be/src/auth/guards/roles.guard.ts - padrao de autorizacao por role.
- e:/Projects/salvtec/salvtec-app/salvtec-app-be/src/admin/admin.service.ts - incluir deleteAllByAccount do novo modulo.
- e:/Projects/salvtec/salvtec-app/salvtec-app-be/src/app.module.ts - registrar novo modulo de ponto.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/components/vehicle-usages/VehicleUsagesPage.tsx - referencia de tabela + aprovacao + acoes.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/components/reports/SoldItemsReportPage.tsx - referencia de filtros por periodo.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/components/Main.tsx - incluir rotas da funcionalidade.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/hooks/useAuth.ts - gate de acoes por role.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/utils/api.ts - padrao de chamadas e tratamento de auth.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/locales/pt.json - novas strings em PT.
- e:/Projects/salvtec/salvtec-app/salvtec-app-fe/src/locales/en.json - novas strings em EN.

**Verification**
1. Backend: executar npm run build e npm run test no repositorio salvtec-app-be.
2. Backend: validar via testes/colecao que usuario comum nao edita registro aprovado e ADMIN edita registro aprovado dentro da mesma conta.
3. Backend: validar exportacao CSV por ADMIN com filtros de periodo/status e conferencia de colunas/encoding.
4. Frontend: executar npm run build e npm run test no repositorio salvtec-app-fe.
5. Frontend: teste manual de UI com dois perfis (ADMIN e usuario comum) para garantir visibilidade correta de aprovar/exportar e bloqueio de edicao apos aprovado.

**Decisions**
- Aprovacao: somente ADMIN.
- ADMIN pode editar registros mesmo apos aprovacao.
- Exportacao CSV: escopo padrao de todos os funcionarios da conta, com filtros.
- Modelo adotado nesta fase: registro diario consolidado (nao evento de batida).
- Escopo excluido desta fase: banco de horas, regra de jornada/turno, folha de pagamento, assinatura digital de espelho de ponto.

**Further Considerations**
1. Recomendar timezone unico de persistencia (UTC) e exibicao local no frontend para evitar divergencia em virada de dia.
2. Recomendar definir se a aprovacao pode ser revertida para pendente por ADMIN (impacta auditoria e UI de historico).
