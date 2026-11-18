export const STORY_LEVELS = [
  {
    title: 'O Chamado',
    kind: 'spark',
    text: 'Ao amanhecer, uma luz verde atravessa as janelas da vila. Dentro de uma lanterna esquecida, você encontra um mapa que se desenha sozinho. A primeira marca aponta para a Floresta dos Sussurros.',
  },
  {
    title: 'A Trilha Oculta',
    kind: 'leaf',
    text: 'A estrada termina diante de uma parede de raízes. No mapa, a trilha continua. Você ergue a lanterna e descobre pegadas brilhantes que levam a uma passagem entre duas árvores antigas.',
  },
  {
    title: 'A Ponte de Musgo',
    kind: 'bridge',
    text: 'O riacho cobre a ponte de pedra. Ao observar o reflexo da água, você percebe que as marcas na margem indicam uma sequência de pedras firmes. Do outro lado, um sino toca sozinho.',
  },
  {
    title: 'O Baú Guardado',
    kind: 'chest',
    text: 'Sob uma estátua coberta de folhas, você encontra um baú de madeira. Dentro dele há uma chave de vidro e um bilhete: “A floresta só abre caminho para quem sabe escutar”.',
  },
  {
    title: 'O Círculo de Pedra',
    kind: 'rune',
    text: 'Seis pedras cercam uma clareira. Quando o vento para, você ouve um sussurro vindo da menor delas. A chave de vidro responde com um brilho e revela o contorno de uma porta.',
  },
  {
    title: 'O Portal da Floresta',
    kind: 'portal',
    text: 'Você gira a chave no ar, onde a porta deveria estar. A clareira se enche de estrelas, e do outro lado aparece uma estrada que não estava no mapa. A Floresta dos Sussurros foi atravessada.',
  },
];

const keyFor = (userId) => `everquest_story_forest_v1:${encodeURIComponent(userId)}`;

export async function loadStoryProgress(storage, userId) {
  const saved = await storage.getItem(keyFor(userId));
  if (saved === null) return 0;
  const completed = JSON.parse(saved);
  if (!Number.isInteger(completed) || completed < 0 || completed > STORY_LEVELS.length) {
    throw new Error('O progresso da história está em um formato inválido.');
  }
  return completed;
}

export async function completeStoryLevel(storage, userId, levelIndex) {
  const completed = await loadStoryProgress(storage, userId);
  if (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex >= STORY_LEVELS.length || levelIndex > completed) {
    throw new Error('Conclua a fase anterior antes de avançar.');
  }
  if (levelIndex < completed) return completed;
  const next = completed + 1;
  await storage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}
