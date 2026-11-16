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

**Segurança:** a API atual identifica usuários por ID, sem validar uma sessão
autenticada nas rotas de amizade. Antes de disponibilizar esse fluxo em
produção, implemente autenticação e autorização no servidor.
