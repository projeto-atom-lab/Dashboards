# Motor de Dashboards de Mídia Paga

Um único arquivo (`motor.js`) serve o dashboard de todos os clientes. Cada página no GreatPages só diz **quem é o cliente e onde estão as planilhas**. Toda correção ou melhoria feita no `motor.js` chega a todos os clientes de uma vez.

## Como montar a página de um cliente

No GreatPages, crie um bloco de **HTML personalizado** com:

```html
<div id="dash"></div>
<script>
window.DASH = {
  cliente: 'Nome do Cliente',
  pin: '1234',                 // opcional: senha de acesso (apaga a linha para não ter senha)
  logo: 'https://…/logo.png',  // opcional: link da imagem do logo (sem isso, aparece a inicial do cliente)
  moeda: 'BRL',                // BRL, ARS, USD...
  idiomas: ['pt'],             // ['pt'] ou ['pt','es'] (o primeiro é o padrão)
  cor: '#c9a96a',              // cor de destaque do cliente
  fontes: [
    { plataforma: 'meta',   conta: 'Nome da conta Meta',   url: 'LINK_CSV_PUBLICADO' },
    { plataforma: 'google', conta: 'Nome da conta Google', url: 'LINK_CSV_PUBLICADO' },
    { tipo: 'crm', funil: 'cadastro', nome: 'Leads do site', url: 'LINK_CSV_PUBLICADO' }
  ],
  verbas: { 'Nome da conta Meta': 3000 },  // opcional: verba mensal por conta
  funis: ['whatsapp', 'cadastro'],         // opcional: funis que fazem sentido para o cliente
  impostoMeta: 0.1215                      // opcional: imposto da Meta (padrão 12,15% em BRL, 0 nas outras moedas)
};
</script>
<script src="https://cdn.jsdelivr.net/gh/Joao-Mesan/dashboards@1/motor.js"></script>
```

O link de cada `url` vem de: planilha → **Arquivo → Compartilhar → Publicar na web** → escolher a aba → formato **CSV** → Publicar.

## Tipos de fonte

| Tipo | Como declarar | Para que serve |
| --- | --- | --- |
| Mídia Meta | `{ plataforma: 'meta', conta: '...', url: '...' }` | Gasto, impressões, cliques e resultados por dia e campanha |
| Mídia Google | `{ plataforma: 'google', conta: '...', url: '...' }` | Idem, do Google Ads |
| CRM / planilha de leads | `{ tipo: 'crm', funil: 'cadastro', url: '...' }` | Contatos que chegaram ao comercial. Se tiver uma coluna **Status**, o motor conta qualificados e vendas |
| Conversões por tipo (Google) | `{ tipo: 'conversoes_google', url: '...' }` | Tabela de ações de conversão na aba Campanhas |

Opções extras de uma fonte de mídia:
- `funil: 'whatsapp'` força todas as campanhas daquela fonte num funil.
- `conversaoComo: 'cadastro'` trata as "Conversões" do Google como cadastros (clientes de geração de lead).
- `decimal: 'comma'` ou `'dot'` força o formato numérico se a detecção automática errar.

Opções extras de uma fonte de CRM:
- `funil`: `'cadastro'` (padrão) ou `'whatsapp'`, conforme a origem dos contatos.
- `colunaStatus: 'Nome exato da coluna'` e `colunaValor: 'Nome exato da coluna'` se o motor não encontrar sozinho.

## Como o motor classifica as campanhas

Cada campanha vai para um funil (**Vendas no site, Cadastros, WhatsApp, Tráfego, Alcance e engajamento**), nesta ordem de critério:

1. Regra manual em `objetivos` (ver abaixo)
2. `funil` definido na fonte
3. Resultado que ela gerou (compras, cadastros ou conversas)
4. Palavras no nome da campanha (ex: "WPP", "Leads", "Engaj"), para campanhas sem resultado
5. Coluna de objetivo da planilha, se existir

Para corrigir uma campanha específica, acrescente em `window.DASH`:

```js
objetivos: { 'trecho do nome da campanha': 'whatsapp' }
```

Para limitar os funis que aparecem para um cliente (recomendado), acrescente:

```js
funis: ['whatsapp', 'cadastro']
```

Campanhas que não se encaixam nesses funis vão para "Alcance e engajamento". Sem essa linha, o motor mostra Vendas no site só se a planilha tiver coluna de compras, e Tráfego só se tiver visualizações da página de destino. Um funil só aparece quando teve investimento no período atual ou no anterior.

A aba **Diagnóstico** mostra a classificação de cada campanha e o critério usado.

## Colunas reconhecidas nas planilhas de mídia

Obrigatórias: **dia**, **campanha**, **valor gasto / custo**. As demais são opcionais e habilitam etapas do funil quando existem: impressões, cliques (no link), alcance, frequência, visualizações da página de destino, conversas por mensagem iniciadas, leads/cadastros, adições ao carrinho, finalizações de compra iniciadas, compras/conversões, valor de conversão. Nomes em português, espanhol ou inglês funcionam.

## Como publicar uma atualização do motor

1. Abra `motor.js` no GitHub → lápis ✏️ → substitua o conteúdo → **Commit changes**.
2. **Releases → Draft a new release** → nova tag (`v1.1.1`, `v1.2.0`…) → **Publish release**.
3. Para aparecer na hora em todos os clientes, abra uma vez:
   `https://purge.jsdelivr.net/gh/Joao-Mesan/dashboards@1/motor.js`

Regra de versão: mudanças compatíveis sobem o número do meio ou do fim (`1.2.0`, `1.2.1`) e chegam sozinhas a quem usa `@1`. Mudança que exige alterar a configuração dos clientes vira `2.0.0`, e cada página migra quando trocar `@1` por `@2`. Para travar um cliente numa versão específica, use o número completo no link (ex: `@1.1.0`).
