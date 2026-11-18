# Everquest no iPhone

O aplicativo compartilha o código React Native entre Android e iOS. O
identificador iOS em [app.json](../app.json) é `br.com.everquest.app`.
O ícone vem de `assets/favicon.png`, assim como o ícone principal do Android.
Não é necessário criar uma pasta `ios/` manualmente: o Expo gera o projeto
nativo durante a build.

## Testar gratuitamente com Expo Go

Esta opção não exige assinatura do Apple Developer Program nem Xcode.

1. Instale o **Expo Go** pela App Store, em versão compatível com o SDK 58.
2. Na raiz do projeto, configure a URL pública do backend no `.env`:

   ```dotenv
   EXPO_PUBLIC_API_URL=https://everquest-5m70.onrender.com
   ```

   O `.env` do aplicativo é diferente do `backend/.env`. Não coloque
   credenciais do banco ou chaves secretas no aplicativo. No iPhone,
   `localhost` aponta para o próprio telefone, não para o computador.
3. Entre na conta gratuita da Expo no computador:

   ```sh
   npx expo login
   ```

4. Entre na **mesma conta Expo** dentro do Expo Go no iPhone.
5. Conecte o computador e o iPhone à mesma rede Wi-Fi e execute:

   ```sh
   npx expo start --go --lan
   ```

6. Leia o QR Code do terminal com a câmera do iPhone e abra no Expo Go.

Mantenha o servidor de desenvolvimento aberto durante os testes. Esta opção
executa o Everquest dentro do Expo Go; não instala um aplicativo independente
com o ícone do Everquest. O nome, o ícone, as permissões nativas personalizadas
e o esquema `everquest://` precisam de uma build própria para validação final.
Para testar convites no Expo Go, prefira o leitor de QR Code ou cole o link
dentro de **Adicionar amigos**.

Depois do login, a sessão é salva no SecureStore do aparelho e restaurada
ao abrir o app. A opção **Sair da conta** remove a sessão salva. Builds de
desenvolvimento anteriores precisam ser reconstruídos se ainda não incluírem
o módulo `expo-secure-store`.

Os alertas de foco são notificações locais, não push remoto. Ative-os nas
configurações do aplicativo e aceite a permissão do iOS. Som e vibração
também dependem dos ajustes do sistema. Câmera, notificações em segundo plano,
layout e teclado ainda precisam ser conferidos em um iPhone real; exportar
o bundle não substitui esse teste.

## Instalar uma versão independente pelo EAS

Este fluxo para um iPhone físico exige assinatura ativa do
**Apple Developer Program**. Sem essa assinatura, use o Expo Go. Como
alternativa, o desenvolvimento local com uma conta pessoal gratuita no Xcode
tem restrições de assinatura e exige um Mac com Xcode.

O perfil `preview` em [eas.json](../eas.json) já usa distribuição interna
e a URL pública do backend para ambas as plataformas. Quando houver uma
assinatura Apple ativa, registre o iPhone e gere a build:

```sh
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

Siga as etapas de autenticação e assinatura no terminal, sem compartilhar
senhas ou certificados. A distribuição interna iOS permite instalar apenas
nos dispositivos incluídos no perfil de provisionamento da build; não é
equivalente a instalar um APK Android. TestFlight e App Store são fluxos
separados e também exigem a assinatura Apple.

Nenhuma build na nuvem, assinatura ou publicação é iniciada apenas por
adicionar essa configuração.

## Referências

- [Executar no dispositivo com Expo Go](https://docs.expo.dev/get-started/start-developing/)
- [Distribuição interna com EAS](https://docs.expo.dev/build/internal-distribution/)
