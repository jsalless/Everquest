# Convites de amizade

O cartão de QR Code do perfil contém um convite para a conta atual. Em
**Adicionar amigos**, use **Ler QR Code** ou cole o link; o pedido só se torna
uma amizade após o destinatário aceitá-lo em **Pedidos pendentes**.

O fluxo requer o servidor Prisma (`npm run backend`) e o banco configurado.
Em dispositivos físicos, configure `EXPO_PUBLIC_API_URL` com um endereço
acessível pela rede; `localhost` aponta para o próprio dispositivo. Não há
confirmação offline de pedidos.

O servidor Prisma não cria usuários de demonstração nem amizades automáticas
na inicialização. A busca consulta os perfis cadastrados, sem sugestões
fictícias. Registros de demonstração que já estejam no banco não são excluídos
automaticamente.

O leitor usa `expo-camera`. O esquema `everquest://` e as permissões nativas
exigem uma nova build de desenvolvimento ou produção após alterar a
configuração. O leitor dentro do aplicativo também funciona com Expo Go.

A navegação usa Expo Router, com rotas em `src/app/`. A rota `add-friend`
preserva o convite quando é necessário fazer login antes de adicionar o amigo.
A engrenagem do perfil abre as configurações; a edição do avatar continua
disponível tocando no próprio personagem.

Nas configurações, alterações de usuário, e-mail e senha usam a API Prisma e
exigem a senha atual. O e-mail de acesso é atualizado sem confirmação por
e-mail, que ainda não foi implementada. Preferências de tema, som, vibração
e alertas de foco ficam salvas no aparelho. Os alertas são locais: não
exigem serviço de push, são cancelados ao pausar/interromper o temporizador
e precisam de permissão do sistema. Em navegadores, a aba precisa ficar
aberta; no Android, a economia de bateria pode atrasar a entrega.
Uma nova build é necessária para incluir os módulos nativos adicionados.

As rotas de amizade exigem uma conta do servidor e usam o token assinado da
sessão. Contas locais e clientes antigos precisam entrar novamente com uma
conta do servidor. Para impedir acesso direto não autenticado à tabela de
amizades, aplique as permissões em `backend/sql/05_focus_sessions.sql` no banco
antes de disponibilizar a mudança.

O aplicativo não usa mais chaves secretas do Supabase. Se alguma chave
privilegiada já tiver sido configurada como variável `EXPO_PUBLIC_`, revogue-a
no Supabase e substitua-a no ambiente privado do servidor; builds antigos
podem continuar contendo a chave. O cadastro alternativo via administrador do
Supabase foi removido.

## Focar com um amigo

Na tela de foco, configure o cronômetro ou temporizador e toque no ícone de
adicionar pessoa. Escolha um amigo confirmado. O convite dura 15 minutos e
cada pessoa pode participar de apenas um convite ou sessão compartilhada por
vez. Quando o convidado aceita, o relógio dos dois começa no servidor; somente
quem convidou pode pausar, retomar ou encerrar. A tela informa quando perde
conexão e atualiza o relógio ao reconectar.

Antes de disponibilizar o recurso, aplique `backend/sql/05_focus_sessions.sql`
e depois `backend/sql/06_focus_statistics.sql` em um banco de teste, gere o
cliente Prisma (`npx prisma generate`) e atualize o servidor e o aplicativo
juntos. Depois de validar, aplique os scripts no banco apropriado. O primeiro
script revoga o acesso direto às amizades e pode interromper clientes antigos.
Configure `SHOP_SESSION_SECRET` como segredo estável no servidor e use um
endereço `EXPO_PUBLIC_API_URL` acessível pelos aparelhos. Não inclua segredos
em variáveis `EXPO_PUBLIC_`.

Para avisos com o aplicativo fechado no Android:

1. No Firebase, registre o pacote `br.com.everquest.app` e baixe o
   `google-services.json`. Para uso local, coloque-o na raiz do projeto.
   Para builds na nuvem, adicione esse arquivo ao projeto Everquest no EAS
   como variável do tipo **File** chamada `GOOGLE_SERVICES_JSON` nos ambientes
   dos builds usados (por exemplo, `preview` para o APK de teste).
2. Em **Credentials → Android**, configure a chave **FCM V1** de uma conta de
   serviço do mesmo projeto Firebase. Essa chave privada é diferente do
   `google-services.json`: não inclua a chave privada no repositório, no app
   ou nas variáveis do cliente.
3. Gere um novo APK (`npx eas-cli@latest build --platform android --profile preview`).
   Uma atualização JavaScript não adiciona a configuração nativa ao APK instalado.

Consulte o [guia de FCM do Expo](https://docs.expo.dev/push-notifications/fcm-credentials/).
No iOS, configure as [credenciais de push da Apple](https://docs.expo.dev/push-notifications/push-notifications-setup/)
no EAS e gere um novo build.
Cada convidado precisa abrir a nova versão e permitir notificações para
registrar o aparelho. O navegador não recebe esses avisos remotos, e o Expo Go
no Android não oferece push remoto. Sem um aparelho registrado, o convite
continua disponível na tela de foco e o anfitrião recebe um aviso. Os envios
são acompanhados por comprovantes do Expo; falhas de entrega são registradas
no servidor. Valide o fluxo em dois aparelhos e duas contas reais antes da
publicação.

As estatísticas individuais são salvas no aparelho. Sessões compartilhadas
concluídas são recuperadas do servidor ao abrir o app e ao voltar às telas;
cada participante recebe o crédito de missão uma única vez. O histórico
compartilhado também tem um cache por conta para consulta no aparelho. Na
recuperação, a data considera o fuso horário do aparelho. É necessário acesso
ao servidor para recuperar novas sessões e contabilizá-las nas missões.
