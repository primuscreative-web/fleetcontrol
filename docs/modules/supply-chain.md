# Supply Chain: fornecedores e estoque

O módulo cobre homologação de fornecedores, catálogo de peças, almoxarifados, pedidos de compra e movimentações de estoque multi-empresa/multi-filial.

## API

- `GET/POST /suppliers`, `GET /suppliers/:id`, `PATCH /suppliers/:id/approve|reject|suspend`
- `GET/POST /inventory/parts`, `GET/POST /inventory/warehouses`
- `GET/POST /inventory/purchase-orders`, `PATCH /inventory/purchase-orders/:id/approve|reject`
- `POST /inventory/purchase-orders/:id/receipts`
- `POST /inventory/issues`, `/inventory/transfers` e `/inventory/adjustments`
- `GET /inventory/dashboard` e `/inventory/options`

Recebimentos atualizam custo médio ponderado e geram eventos/auditoria. Baixas para manutenção vinculam o custo à ordem e alertam estoque abaixo do ponto de reposição.

## Permissões

As permissões `suppliers:*` controlam cadastro, homologação, compras e avaliação. As permissões `inventory:*` controlam consulta, movimentação, recebimento, ajuste e baixa. Todas as operações respeitam o `companyId` do contexto autenticado.

## Dados

A migration `20260714070000_suppliers_inventory_module` cria fornecedores, peças, relações de catálogo, almoxarifados, saldos, pedidos, itens, movimentos e avaliações.
