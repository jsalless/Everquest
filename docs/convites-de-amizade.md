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
em um banco de teste, gere o cliente Prisma (`npx prisma generate`) e atualize
o servidor e o aplicativo juntos. Depois de validar, aplique o SQL no banco
apropriado. Configure `SHOP_SESSION_SECRET` como segredo estável no servidor e
use um endereço `EXPO_PUBLIC_API_URL` acessível pelos aparelhos. Não inclua
segredos em variáveis `EXPO_PUBLIC_`.

Para avisos com o aplicativo fechado, configure as credenciais de push do
Firebase e/ou Apple no EAS e crie uma nova build de desenvolvimento ou
produção. Consulte a [configuração de push do Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/).
Cada convidado precisa abrir a nova versão e permitir notificações para
registrar o aparelho. O navegador não recebe esses avisos remotos, e o Expo Go
no Android não oferece push remoto. Sem um aparelho registrado, o convite
continua disponível na tela de foco e o anfitrião recebe um aviso. Os envios
são acompanhados por comprovantes do Expo; falhas de entrega são registradas
no servidor. Valide o fluxo em dois aparelhos e duas contas reais antes da
publicação.

Se a sessão terminar enquanto o aplicativo estiver fechado, o registro local
de estatísticas e o progresso da missão diária podem não ser atualizados ao
reabrir. As estatísticas existentes também não persistem entre reinícios no
aplicativo nativo.
