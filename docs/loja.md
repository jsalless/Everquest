# Loja do Avatar

A aba **Loja** mostra o saldo de moedas das missões e o catálogo. Após confirmar uma compra, o saldo é atualizado e a peça aparece na categoria correspondente em **Personalizar → Equipamentos**. Use **Personalizar** no cartão da peça comprada ou abra o editor pelo perfil.

Os cartões de destaque, o catálogo e a confirmação de compra mostram os bônus de cada peça. Os bônus são os mesmos exibidos na personalização e só são aplicados quando a peça estiver equipada.

O banner [shop.svg](../assets/shop.svg) ocupa toda a largura no topo. Em telas estreitas, o recorte 5:4 amplia o lojista e mantém o balcão e o mapa à vista. Em telas largas, a imagem fica alinhada ao topo para preservar a parte superior da ilustração. Apenas o saldo aparece sobre a ilustração. O fundo `#48342E` continua a cor da ilustração abaixo do banner, onde começam os destaques. Builds de desenvolvimento já instalados precisam ser reconstruídos se ainda não incluírem o módulo nativo `expo-image`.

## Aparência, equipamentos e atributos

- **Aparência** permite escolher raça, cabelo, três expressões para os olhos e a cor da íris. As sobrancelhas acompanham a cor do cabelo.
- O **Cabelo Curto**, a **Túnica Bordada** e a **Calça de Couro** são opções iniciais personalizáveis, sem custo. A Túnica Bordada tem caimento amplo e enquadramento mais largo para acomodar a ponta lateral.
- **Equipamentos** tem cinco espaços: cabeça, torso, pernas, pés e arma. As roupas e cores já salvas continuam funcionando. Cabeça e arma começam vazias, com um chapéu e uma espada de madeira iniciais disponíveis sem compra.
- **Dano**, **Vida**, **Armadura** e **Magia** mostram os atributos base (5, 100, 0 e 0) mais os bônus das peças selecionadas. O painel atualiza na prévia antes de salvar; os valores são derivados do equipamento, não enviados pelo aplicativo como valores a persistir.

## Ativar a loja

1. No PostgreSQL/Supabase do ambiente, aplique [04_wardrobe_items.sql](../backend/sql/04_wardrobe_items.sql). A tabela tem RLS habilitada e é acessada pelo backend Prisma, não diretamente pelo aplicativo.
2. Execute `npx prisma generate` e inicie o backend com `npm run backend`. Aponte `EXPO_PUBLIC_API_URL` para esse servidor.
3. Entre novamente no aplicativo com uma conta do backend Prisma para receber uma sessão válida para a loja. Os modos local e Supabase Auth direto podem ver o catálogo, mas não comprar.

Em produção, defina `SHOP_SESSION_SECRET` no backend com um segredo forte, igual em todas as réplicas. Sem ele, o servidor gera uma chave temporária e pede um novo login após reiniciar.

O preço é definido no [catálogo compartilhado](../src/services/shopCatalog.json). O backend autentica a conta, desconta moedas e registra a peça na mesma transação. Não há cobrança duplicada ao repetir a compra de uma peça já adquirida.
