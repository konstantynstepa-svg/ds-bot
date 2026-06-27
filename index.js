const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");
const fs = require("fs");
 
/* ================= [ НАСТРОЙКИ СЕМЬИ META ] ================= */
const META_IMAGE = "Gemini_Generated_Image_vx5awhvx5awhvx5a.png"; 
 
const CONFIG = {
  // === Каналы (актуальные ID с нового сервера) ===
  COMMAND_CHANNEL_ID: "1520394576999747677",   // Канал "Заявка" — где стоит кнопка "Подать заявку"
  MAIN_LOG_CHANNEL: "1520394577222172679",     // Канал "Итог" — сюда падают заявки/тиры/отчеты на проверку
  REPORT_LOG_CHANNEL: "1520394577222172679",   // Канал "Итог" — туда же и еженедельные отчеты
  AFK_LOG_CHANNEL: "1520394577222172679",      // Канал "Итог" — уведомления о блокировке ЛС
  AFK_COMMAND_CHANNEL: "1520394577721295020",  // Канал команды /afk
  NEWS_CHANNEL_ID: "1520394577549201415",      // Канал новостей — куда постится /новости
  WARN_SYSTEM_CHANNEL: "1520394577549201417", 
  WARN_WORKOFF_CHANNEL: "1520394577721295019",
  TIER_CHANNEL_ID: "1490912215341989978",
  POINTS_CHANNEL_ID: "1520394577549201414",    // Канал баллов — где стоит /menu (заработать/баланс/повышение)
  
  // === 🟢 РОЛИ РАНГОВ ===
  ROLE_ACCEPTED_ID: "1520394576458682395", // 1 ранг (Выдается при принятии)
  RANK_2_ROLE_ID: "1520394576458682396",   // 2 ранг (Система повышения)
  RANK_3_ROLE_ID: "1520394576458682397",   // 3 ранг (Система повышения)
  
  VACATION_ROLE: "1479988454484869271",       
  FINE_ROLE_1: "1479987457591218410",         
  FINE_ROLE_2: "1479987547395325984",         

  IMAGE: META_IMAGE,
  TIER_IMAGE: META_IMAGE,
 
  INTERVIEW_CHANNELS: [
    "1480227608846143548",
    "1480227634393649324",
    "1499718934977445979",
    "1499718997225111702",
    "1499719070885482648"
  ],
 
  // === 👑 АДМИН-РОЛИ (Полный доступ ко всему функционалу бота) ===
  ADMIN_ROLES: [
    "1520394576467198072", 
    "1520394576467198069", 
    "1520394576467198073", 
    "1520394576467198068", 
    "1520394576467198066", 
    "1520394576467198065"
  ]
};
 
const CAPT_CONFIG = {
  CHANNEL_ID: "1520394577381687344",  // Канал капта/спама — куда летят +на капт и спам-рассылка
  IMAGE_URL: META_IMAGE,
  TIERS: {
    "1": "1479566016924221510", 
    "2": "1479565407319883806",
    "3": "1479564709354016929"
  },
  OWNER_ID: "530064311310352415"
};
 
const activeInterviews = new Map();
let currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };

// Стоимость повышения
const RANK_COSTS = { "2": 89, "3": 179 };

const EARN_OPTIONS = [
  { label: 'Капт (5 баллов)', value: 'capt_5' },
  { label: 'Заправка (3 балла)', value: 'gas_3' },
  { label: 'Топ 1 на арене (2 балла)', value: 'arena_2' },
  { label: 'Развозка грина (3 балла)', value: 'green_3' },
  { label: 'Выезд на трассу (3 балла)', value: 'highway_3' },
  { label: 'Тайники (2 балла)', value: 'stashes_2' },
  { label: 'Мойка машин (3 балла)', value: 'carwash_3' },
  { label: 'Загрузка коробок (1 балл)', value: 'boxes_1' },
  { label: 'Другой контракт (1 балл)', value: 'other_1' }
];
 
/* ================= [ БАЗА ДАННЫХ ] ================= */
let db = { points: {} };
if (fs.existsSync("db.json")) {
  try { db = Object.assign({ points: {} }, JSON.parse(fs.readFileSync("db.json", "utf8"))); }
  catch(e) { console.error("Ошибка чтения db.json:", e); }
}
 
let afkdb = { roles: {} };
if (fs.existsSync("afkdb.json")) {
  try { afkdb = JSON.parse(fs.readFileSync("afkdb.json", "utf8")); }
  catch(e) { console.error("Ошибка чтения afkdb.json:", e); }
}
 
const save = () => { try { fs.writeFileSync("db.json", JSON.stringify(db, null, 2)); } catch(e) {} };
const saveAfk = () => { try { fs.writeFileSync("afkdb.json", JSON.stringify(afkdb, null, 2)); } catch(e) {} };
const addPoints = (id, amt) => { db.points[id] = (db.points[id] || 0) + amt; save(); };
const getPoints = (id) => db.points[id] || 0;
 
setInterval(() => { save(); saveAfk(); }, 5 * 60 * 1000);
 
/* ================= [ ИНИЦИАЛИЗАЦИЯ БОТА ] ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});
 
const notifyBlocked = async (guild, member) => {
  try {
    const ch = await guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL).catch(() => null);
    if (ch) ch.send(`⚠️ **ВНИМАНИЕ!** <@${member.id}> закрыл ЛС или заблокировал бота.`);
  } catch(e) {}
};
 
const openInterviewChannels = async (guild, userId) => {
  for (const chId of CONFIG.INTERVIEW_CHANNELS) {
    try {
      const ch = await guild.channels.fetch(chId).catch(() => null);
      if (ch) await ch.permissionOverwrites.create(userId, { ViewChannel: true, Connect: true }).catch(() => {});
    } catch(e) {}
  }
};
 
const closeInterviewChannels = async (guild, userId) => {
  for (const chId of CONFIG.INTERVIEW_CHANNELS) {
    try {
      const ch = await guild.channels.fetch(chId).catch(() => null);
      if (ch) await ch.permissionOverwrites.delete(userId).catch(() => {});
    } catch(e) {}
  }
};
 
/* ================= [ СЛЭШ-КОМАНДЫ ] ================= */
const commands = [
  new SlashCommandBuilder().setName('новости').setDescription('Разослать новость семье Meta').addStringOption(opt => opt.setName('текст').setDescription('Текст новости').setRequired(true)),
  new SlashCommandBuilder().setName('спам').setDescription('Разослать спам в ЛС всем участникам Meta о капте').addStringOption(opt => opt.setName('текст').setDescription('Текст сообщения').setRequired(false)),
  new SlashCommandBuilder().setName('тир').setDescription('Панель получения тира'),
  new SlashCommandBuilder().setName('give').setDescription('Выдать баллы игроку').addUserOption(opt => opt.setName('user').setDescription('Кому').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Количество').setRequired(true)),
  new SlashCommandBuilder().setName('menu').setDescription('Открыть систему баллов Meta'),
  new SlashCommandBuilder().setName('заявка').setDescription('Открыть панель заявки в Meta'),
  new SlashCommandBuilder().setName('afk').setDescription('Управление статусом AFK / Отпуск'),
  new SlashCommandBuilder().setName('startcapt').setDescription('Начать сбор на капт Meta'),
  new SlashCommandBuilder().setName('капт').setDescription('Оповещение о капте Meta').addStringOption(opt => opt.setName('time').setDescription('Время').setRequired(false)),
  new SlashCommandBuilder().setName('clear').setDescription('Очистить сообщения в чате').addIntegerOption(opt => opt.setName('amount').setDescription('От 1 до 100').setRequired(true)),
  new SlashCommandBuilder().setName('отчеты').setDescription('Панель еженедельного отчёта'),
];
 
/* ================= [ СОБЫТИЯ ЗАПУСКА ] ================= */
client.once("ready", async () => {
  console.log(`🤖 Бот ${client.user.tag} запущен и готов к работе!`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(cmd => cmd.toJSON()) });
    console.log('✅ Слэш-команды успешно зарегистрированы.');
  } catch (error) {
    console.error('Ошибка регистрации команд:', error);
  }

  // === ДИАГНОСТИКА КОНФИГА: проверяем что все ID из CONFIG реально существуют на сервере ===
  await checkConfig();
});

async function checkConfig() {
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.warn('⚠️ Бот не состоит ни на одном сервере!');
    return;
  }

  console.log(`\n🔍 Проверка конфигурации для сервера: ${guild.name} (${guild.id})\n`);

  const channelFields = [
    "COMMAND_CHANNEL_ID", "MAIN_LOG_CHANNEL", "REPORT_LOG_CHANNEL", "AFK_LOG_CHANNEL",
    "AFK_COMMAND_CHANNEL", "NEWS_CHANNEL_ID", "WARN_SYSTEM_CHANNEL", "WARN_WORKOFF_CHANNEL",
    "TIER_CHANNEL_ID", "POINTS_CHANNEL_ID"
  ];
  const roleFields = [
    "ROLE_ACCEPTED_ID", "RANK_2_ROLE_ID", "RANK_3_ROLE_ID", "VACATION_ROLE", "FINE_ROLE_1", "FINE_ROLE_2"
  ];

  let problems = 0;

  for (const field of channelFields) {
    const id = CONFIG[field];
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch) {
      console.warn(`❌ CONFIG.${field} = "${id}" — КАНАЛ НЕ НАЙДЕН на этом сервере!`);
      problems++;
    } else {
      console.log(`✅ CONFIG.${field} -> #${ch.name}`);
    }
  }

  for (const field of roleFields) {
    const id = CONFIG[field];
    const role = await guild.roles.fetch(id).catch(() => null);
    if (!role) {
      console.warn(`❌ CONFIG.${field} = "${id}" — РОЛЬ НЕ НАЙДЕНА на этом сервере!`);
      problems++;
    } else {
      console.log(`✅ CONFIG.${field} -> @${role.name}`);
    }
  }

  for (const id of CONFIG.ADMIN_ROLES) {
    const role = await guild.roles.fetch(id).catch(() => null);
    if (!role) {
      console.warn(`❌ ADMIN_ROLES содержит "${id}" — РОЛЬ НЕ НАЙДЕНА на этом сервере!`);
      problems++;
    } else {
      console.log(`✅ ADMIN_ROLES -> @${role.name}`);
    }
  }

  for (const id of CONFIG.INTERVIEW_CHANNELS) {
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch) {
      console.warn(`❌ INTERVIEW_CHANNELS содержит "${id}" — КАНАЛ НЕ НАЙДЕН на этом сервере!`);
      problems++;
    } else {
      console.log(`✅ INTERVIEW_CHANNELS -> #${ch.name}`);
    }
  }

  for (const [tier, id] of Object.entries(CAPT_CONFIG.TIERS)) {
    const role = await guild.roles.fetch(id).catch(() => null);
    if (!role) {
      console.warn(`❌ CAPT_CONFIG.TIERS["${tier}"] = "${id}" — РОЛЬ НЕ НАЙДЕНА на этом сервере!`);
      problems++;
    } else {
      console.log(`✅ CAPT_CONFIG.TIERS["${tier}"] -> @${role.name}`);
    }
  }

  const captChannel = await guild.channels.fetch(CAPT_CONFIG.CHANNEL_ID).catch(() => null);
  if (!captChannel) {
    console.warn(`❌ CAPT_CONFIG.CHANNEL_ID = "${CAPT_CONFIG.CHANNEL_ID}" — КАНАЛ НЕ НАЙДЕН на этом сервере!`);
    problems++;
  } else {
    console.log(`✅ CAPT_CONFIG.CHANNEL_ID -> #${captChannel.name}`);
  }

  if (problems === 0) {
    console.log(`\n🎉 Все ID в CONFIG валидны для этого сервера!\n`);
  } else {
    console.warn(`\n⚠️ Найдено проблем: ${problems}. Замени соответствующие ID в CONFIG на актуальные ID с твоего нового сервера (ПКМ по каналу/роли -> "Копировать ID", нужен включенный режим разработчика в настройках Discord).\n`);
  }
}
 
function buildCaptEmbed() {
  const fmt = (arr) => arr.length > 0 ? arr.map(id => `<@${id}>`).join('\n') : "Пусто";
  return new EmbedBuilder()
    .setTitle("⚔️ Война Семей Meta (Капт)")
    .setDescription("Нажмите кнопку ниже, чтобы записаться на капт.")
    .setColor("#2b2d31")
    .setImage(CAPT_CONFIG.IMAGE_URL)
    .addFields(
      { name: `Tier 1: (${currentCapt.tier1.length})`, value: fmt(currentCapt.tier1), inline: true },
      { name: `Tier 2: (${currentCapt.tier2.length})`, value: fmt(currentCapt.tier2), inline: true },
      { name: `Tier 3: (${currentCapt.tier3.length})`, value: fmt(currentCapt.tier3), inline: true },
      { name: `Замены: (${currentCapt.subs.length})`, value: fmt(currentCapt.subs), inline: false }
    );
}
 
/* ================= [ ОБРАБОТКА ВЗАИМОДЕЙСТВИЙ ] ================= */
client.on("interactionCreate", async i => {
  try {
    if (i.isChatInputCommand()) {
      const cmd = i.commandName;
 
      if (cmd === 'clear') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ У вас нет прав админа.", ephemeral: true });
        const n = i.options.getInteger('amount');
        if (n < 1 || n > 100) return i.reply({ content: "❌ Укажите число от 1 до 100.", ephemeral: true });
        await i.channel.bulkDelete(n, true).catch(() => {});
        return i.reply({ content: `✅ Удалено сообщений: ${n}.`, ephemeral: true });
      }
 
      if (cmd === 'новости') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder().setTitle("📢 ВАЖНАЯ НОВОСТЬ META").setDescription(text).setColor("Red").setImage(CONFIG.IMAGE).setTimestamp();
        
        const newsCh = await i.guild.channels.fetch(CONFIG.NEWS_CHANNEL_ID).catch(() => null);
        if (newsCh) {
            await newsCh.send({ embeds: [embed] }).catch(() => {});
        }

        await i.guild.members.fetch().catch(() => {});
        const members = i.guild.members.cache.filter(m => !m.user.bot);
        let sent = 0;
        for (const [, m] of members) {
          try { await m.send({ embeds: [embed] }); sent++; } catch { notifyBlocked(i.guild, m); }
        }
        return i.editReply(`✅ Новость опубликована в канале и доставлена в ЛС: **${sent}** участников.`);
      }
 
      if (cmd === 'спам') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст') || "🚨 **СБОР НА КАПТ META!** Быстро заходи в игру и садись в дискорд!";
        await i.guild.members.fetch().catch(() => {});
        const members = i.guild.members.cache.filter(m => !m.user.bot);
        let sent = 0;
        for (const [, m] of members) {
          try {
            for (let r = 0; r < 5; r++) { await m.send(text); await new Promise(res => setTimeout(res, 300)); }
            sent++;
          } catch { notifyBlocked(i.guild, m); }
        }
        return i.editReply(`✅ Спам-оповещение отправлено **${sent}** людям.`);
      }
 
      if (cmd === 'тир') {
        const embed = new EmbedBuilder().setTitle("🎯 ПОЛУЧЕНИЕ ТИРА (META)").setDescription("Нажмите кнопку ниже, чтобы подать заявку на проверку стрельбы.").setImage(CONFIG.TIER_IMAGE).setColor("#8A2BE2");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("TIERBTN").setLabel("Получить тир").setStyle(ButtonStyle.Primary));
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель отправлена.", ephemeral: true });
      }
 
      if (cmd === 'give') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const user = i.options.getUser('user');
        const amt = i.options.getInteger('amount');
        addPoints(user.id, amt);
        return i.reply({ content: `✅ Выдано ${amt} 💎 игроку ${user}`, ephemeral: true });
      }
 
      if (cmd === 'menu') {
        const embed = new EmbedBuilder().setTitle("💎 СИСТЕМА БАЛЛОВ И ПОВЫШЕНИЯ META").setDescription(`📜 **Цены повышения:**\n🔹 1 ➔ 2 ранг: **${RANK_COSTS["2"]} 💎**\n🔹 2 ➔ 3 ранг: **${RANK_COSTS["3"]} 💎**`).setImage(CONFIG.IMAGE).setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("earn_btn").setLabel("Заработать баллы").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("balance_btn").setLabel("Мой Баланс").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("rankup_btn").setLabel("Купить Повышение").setStyle(ButtonStyle.Success),
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Главное меню баллов отправлено.", ephemeral: true });
      }
 
      if (cmd === 'заявка') {
        const embed = new EmbedBuilder().setTitle("📝 ЗАЯВКА В СЕМЬЮ META").setDescription("Нажми на кнопку ниже, чтобы заполнить анкету на вступление.").setImage(CONFIG.IMAGE).setColor("#ff0000");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger));
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель заявок создана.", ephemeral: true });
      }
 
      if (cmd === 'afk') {
        const embed = new EmbedBuilder().setTitle("💤 УПРАВЛЕНИЕ AFK / ОТПУСКАМИ").setDescription("🏖 **Отпуск** — Подать заявку на отпуск.\n🌙 **Уйти в AFK** — Бот снимет роли до возвращения.\n✅ **Выйти из AFK** — Вернуть роли обратно.").setImage(CONFIG.IMAGE).setColor("#2f3136");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("afk_vacation").setLabel("🏖 В отпуск").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("afk_on").setLabel("🌙 Включить AFK").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("afk_off").setLabel("✅ Я вернулся").setStyle(ButtonStyle.Success)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ AFK-панель выведена.", ephemeral: true });
      }
 
      if (cmd === 'startcapt') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("capt_plus").setLabel("➕ На Капт").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_sub").setLabel("🔄 В Замену").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_minus").setLabel("❌ Выйти").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("capt_force").setLabel("✏️ Вписать (Админы)").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("capt_remove").setLabel("🧹 Кикнуть (Админы)").setStyle(ButtonStyle.Danger)
        );
        await i.channel.send({ embeds: [buildCaptEmbed()], components: [row] });
        return i.reply({ content: "✅ Регистрация на капт запущена.", ephemeral: true });
      }
 
      if (cmd === 'капт') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const time = i.options.getString('time') || "ближайшее время";
        await i.guild.members.fetch().catch(() => {});
        const members = i.guild.members.cache.filter(m => !m.user.bot);
        const embed = new EmbedBuilder().setTitle("⚔️ СБОР НА КАПТ META!").setDescription(`Сбор объявлен! Будьте в игре через: **${time}**!`).setImage(CAPT_CONFIG.IMAGE_URL).setColor("Red");
        members.forEach(async m => { try { await m.send({ embeds: [embed] }); } catch {} });
        return i.editReply(`✅ Рассылка запущена для ${members.size} участников.`);
      }
 
      if (cmd === 'отчеты') {
        const embed = new EmbedBuilder().setTitle("📋 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ СЕМЬИ META").setDescription("Нажмите кнопку ниже для отправки вашего отчета старшему составу.").setImage(CONFIG.IMAGE).setColor("#5865F2");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("WREPORTBTN").setLabel("📋 Отправить отчёт").setStyle(ButtonStyle.Primary));
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель отчётов готова.", ephemeral: true });
      }
    }
 
    /* ================= [ ПРОВЕРКА ПРАВ НА КНОПКИ УПРАВЛЕНИЯ ] ================= */
    if (i.isButton()) {
      const isAppBtn = i.customId.startsWith("ADMWATCH.") || i.customId.startsWith("ADMFAM.") || 
                       i.customId.startsWith("ADMCALL.") || i.customId.startsWith("ADMNO.") || 
                       i.customId.startsWith("ADMCALLOFF.");
      if (isAppBtn) {
        const hasPerm = CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r));
        if (!hasPerm) {
          return i.reply({ content: "❌ Ты не можешь сделать это действие.", ephemeral: true });
        }
      }
    }

    /* ================= [ ОБРАБОТКА КНОПОК И МОДАЛОК ] ================= */
    
    // --- СИСТЕМА ПОВЫШЕНИЙ ---
    if (i.isButton() && i.customId === "rankup_btn") {
        let nextRankRole = null;
        let cost = 0;
        let rankName = "";
        
        // Проверяем текущий ранг
        if (i.member.roles.cache.has(CONFIG.RANK_2_ROLE_ID)) {
            nextRankRole = CONFIG.RANK_3_ROLE_ID;
            cost = RANK_COSTS["3"];
            rankName = "3 ранг";
        } else if (i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID)) {
            nextRankRole = CONFIG.RANK_2_ROLE_ID;
            cost = RANK_COSTS["2"];
            rankName = "2 ранг";
        } else {
            return i.reply({ content: "❌ Вы не состоите в семье или у вас уже максимальный ранг для автоматического повышения.", ephemeral: true });
        }

        const pts = getPoints(i.user.id);
        if (pts < cost) {
            return i.reply({ content: `❌ Недостаточно баллов! У вас **${pts}** 💎, а нужно **${cost}** 💎 для повышения на ${rankName}.`, ephemeral: true });
        }

        // Списываем баллы и выдаем роль
        addPoints(i.user.id, -cost);
        await i.member.roles.add(nextRankRole).catch(() => {});
        
        return i.reply({ content: `✅ Поздравляем! Вы успешно купили повышение на **${rankName}** за ${cost} 💎!`, ephemeral: true });
    }

    if (i.isButton() && i.customId === "TIERBTN") {
      const sel = new StringSelectMenuBuilder().setCustomId("TIERSEL").setPlaceholder("Выберите ваш стрелковый уровень:")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("Tier 1 (Сильный)").setValue("T1"),
          new StringSelectMenuOptionBuilder().setLabel("Tier 2 (Средний)").setValue("T2"),
          new StringSelectMenuOptionBuilder().setLabel("Tier 3 (Новичок)").setValue("T3")
        );
      return i.reply({ content: "Укажите ваш текущий тир:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }
 
    if (i.isStringSelectMenu() && i.customId === "TIERSEL") {
      const n = i.values[0].replace("T", "");
      const modal = new ModalBuilder().setCustomId(`TIERM${n}`).setTitle(`Заявка на Tier ${n}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tnick").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tskills").setLabel("Откат стрельбы (ссылка)").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tsayga").setLabel("Владение сайгой (от 1 до 10)").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && /^TIERM[123]$/.test(i.customId)) {
      const n = i.customId.replace("TIERM", "");
      const logCh = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      if (!logCh) return i.reply({ content: "❌ Канал логов на сервере не настроен или удален. Обратитесь к создателю.", ephemeral: true });
      
      const emb = new EmbedBuilder().setTitle(`🎯 ЗАЯВКА НА TIER ${n} [META]`).setColor("#8A2BE2")
        .addFields(
          { name: "👤 Отправитель", value: `${i.user}` },
          { name: "📝 Ник/Статик", value: i.fields.getTextInputValue("tnick") },
          { name: "🎬 Доказательства", value: i.fields.getTextInputValue("tskills") },
          { name: "🔫 Сайга", value: i.fields.getTextInputValue("tsayga") },
          { name: "📊 Статус", value: "⏳ На рассмотрении" }
        ).setTimestamp();
      
      const uid = i.user.id;
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Взял на проверку").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMTIER.${uid}.${n}`).setLabel(`✅ Одобрить Tier ${n}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      await logCh.send({ embeds: [emb], components: [row1] });
      return i.reply({ content: "✅ Заявка на проверку тира отправлена руководству семьи!", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "WREPORTBTN") {
      const modal = new ModalBuilder().setCustomId("WREPORTM").setTitle("Еженедельный отчет");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("wrphoto").setLabel("Ссылка на скриншоты").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("wraccepted").setLabel("Кого приняли/Что сделали").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("wrdone").setLabel("Итоги за неделю").setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId === "WREPORTM") {
      const repCh = await i.guild.channels.fetch(CONFIG.REPORT_LOG_CHANNEL).catch(() => null);
      if (!repCh) return i.reply({ content: "❌ Канал для отчётов не найден на этом сервере.", ephemeral: true });
      const emb = new EmbedBuilder().setTitle("📋 НОВЫЙ ЕЖЕНЕДЕЛЬНЫЙ ОТЧЕТ META").setColor("#5865F2")
        .addFields(
          { name: "👤 Автор", value: `${i.user}` },
          { name: "🔗 Скриншоты", value: i.fields.getTextInputValue("wrphoto") },
          { name: "👥 Работа", value: i.fields.getTextInputValue("wraccepted") },
          { name: "📊 Итог", value: i.fields.getTextInputValue("wrdone") },
          { name: "📊 Статус", value: "⏳ Ожидает проверки" }
        ).setTimestamp();
      const uid = i.user.id;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`WRWATCH.${uid}`).setLabel("👀 Проверяю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`WROK.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`WRFINE1.${uid}`).setLabel("⚠️ Выдать Штраф 1").setStyle(ButtonStyle.Danger)
      );
      await repCh.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Отчет отправлен руководству на рассмотрение!", ephemeral: true });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMWATCH.")) {
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `👀 Проверяет: ${i.user.username}` } : f));
      return i.update({ embeds: [emb] });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMTIER.")) {
      const [, uid, tierNum] = i.customId.split(".");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        await target.roles.remove(Object.values(CAPT_CONFIG.TIERS)).catch(() => {});
        const role = CAPT_CONFIG.TIERS[tierNum];
        if (role) await target.roles.add(role).catch(() => {});
        target.send(`🎯 Руководство Meta одобрило тебе **Tier ${tierNum}**!`).catch(() => {});
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрил ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMFAM.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        // Выдаем 1 ранг
        await target.roles.add(CONFIG.ROLE_ACCEPTED_ID).catch(() => {});
        target.send("🎉 Поздравляем! Вы успешно приняты в семью **Meta**! Вам выдан 1 ранг.").catch(() => {});
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Принял: ${i.user.username}` } : f));
      
      return i.update({ embeds: [emb], components: [] });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMCALL.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      
      await openInterviewChannels(i.guild, uid);
      if (target) target.send(`📞 Вас вызвали на обзвон в семью **Meta**! Срочно зайдите в один из каналов обзвона в течение 7 минут.`).catch(() => {});
      
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Purple");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `📞 На обзвоне у ${i.user.username}` } : f));
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMCALLOFF.${uid}`).setLabel("🔴 Закончить обзвон").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );

      return i.update({ embeds: [emb], components: [row] });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMCALLOFF.")) {
      const uid = i.customId.split(".")[1];
      await closeInterviewChannels(i.guild, uid);
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Orange");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: "🔴 Обзвон завершен. Ожидает вердикта" } : f));
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      return i.update({ embeds: [emb], components: [row] });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMNO.")) {
      const uid = i.customId.split(".")[1];
      const modal = new ModalBuilder().setCustomId(`REJM.${uid}.${i.message.id}`).setTitle("Причина отказа");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Почему отказ?").setStyle(TextInputStyle.Short).setRequired(true)));
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId.startsWith("REJM.")) {
      const [, uid, mid] = i.customId.split(".");
      const reason = i.fields.getTextInputValue("reason");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const msg = await i.channel.messages.fetch(mid).catch(() => null);
      
      if (msg) {
        const emb = EmbedBuilder.from(msg.embeds[0]).setColor("Red");
        emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `❌ Отказал ${i.user.username}. Причина: ${reason}` } : f));
        await msg.edit({ embeds: [emb], components: [] });
      }
      
      if (target) target.send(`❌ Ваша заявка в Meta отклонена. Причина: ${reason}`).catch(() => {});
      
      return i.reply({ content: "✅ Отказ оформлен.", ephemeral: true });
    }
 
    const getTier = m => {
      if (!m || !m.roles) return "tier3";
      if (m.roles.cache.has(CAPT_CONFIG.TIERS["1"])) return "tier1";
      if (m.roles.cache.has(CAPT_CONFIG.TIERS["2"])) return "tier2";
      return "tier3";
    };
    const rmCapt = id => {
      currentCapt.tier1 = currentCapt.tier1.filter(u => u !== id);
      currentCapt.tier2 = currentCapt.tier2.filter(u => u !== id);
      currentCapt.tier3 = currentCapt.tier3.filter(u => u !== id);
      currentCapt.subs = currentCapt.subs.filter(u => u !== id);
    };
 
    if (i.isButton() && i.customId.startsWith("capt_")) {
      const uid = i.user.id;
      if (i.customId === "capt_plus") { rmCapt(uid); const t = getTier(i.member); currentCapt[t].push(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_sub") { rmCapt(uid); currentCapt.subs.push(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_minus") { rmCapt(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_force") {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("captforceM").setTitle("Вписать игрока");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tid").setLabel("Discord ID игрока").setStyle(TextInputStyle.Short)));
        return i.showModal(modal);
      }
      if (i.customId === "capt_remove") {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("captremoveM").setTitle("Удалить с капта");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tid").setLabel("Discord ID").setStyle(TextInputStyle.Short)));
        return i.showModal(modal);
      }
    }
 
    if (i.isModalSubmit() && i.customId === "captforceM") {
      const tid = i.fields.getTextInputValue("tid");
      const tm = await i.guild.members.fetch(tid).catch(() => null);
      if (!tm) return i.reply({ content: "❌ Игрок не найден на сервере.", ephemeral: true });
      rmCapt(tid); currentCapt[getTier(tm)].push(tid);
      await i.message.edit({ embeds: [buildCaptEmbed()] });
      return i.reply({ content: "✅ Игрок вписан.", ephemeral: true });
    }
 
    if (i.isModalSubmit() && i.customId === "captremoveM") {
      const tid = i.fields.getTextInputValue("tid");
      rmCapt(tid);
      await i.message.edit({ embeds: [buildCaptEmbed()] });
      return i.reply({ content: "✅ Игрок удален из списков капта.", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "earn_btn") {
      const sel = new StringSelectMenuBuilder().setCustomId("earnsel").setPlaceholder("Выберите выполненный контракт:");
      EARN_OPTIONS.forEach(o => sel.addOptions(new StringSelectMenuOptionBuilder().setLabel(o.label).setValue(o.value)));
      return i.reply({ content: "Что было сделано?", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }
 
    if (i.isStringSelectMenu() && i.customId === "earnsel") {
      const key = i.values[0];
      const modal = new ModalBuilder().setCustomId(`EARN.${key}`).setTitle("Отчет на баллы");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e1").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e2").setLabel("Ссылка на скриншот (Imgur/Япикс)").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId.startsWith("EARN.")) {
      const key = i.customId.replace("EARN.", "");
      const task = EARN_OPTIONS.find(o => o.value === key);
      const pts = parseInt(key.split("_")[1]);
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      if (!log) return i.reply({ content: "❌ Канал логов не найден.", ephemeral: true });
 
      const emb = new EmbedBuilder().setTitle("💰 ОТЧЕТ НА БАЛЛЫ — META").setColor("Yellow")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "🛠 Работа", value: task.label },
          { name: "📝 Инфо", value: i.fields.getTextInputValue("e1") },
          { name: "🔗 Доказательства", value: i.fields.getTextInputValue("e2") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();
      const uid = i.user.id;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMPTS.${uid}.${pts}`).setLabel("✅ Выдать баллы").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Отчет на баллы успешно отправлен!", ephemeral: true });
    }
 
    if (i.isButton() && i.customId.startsWith("ADMPTS.")) {
      const [, uid, pts] = i.customId.split(".");
      addPoints(uid, parseInt(pts));
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send(`✅ Ваш отчет одобрен! Вам начислено **${pts}** 💎 баллов Meta.`).catch(() => {});
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрил ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    if (i.isButton() && i.customId === "balance_btn") {
      return i.reply({ content: `💎 Ваш текущий баланс: **${getPoints(i.user.id)}** баллов Meta.`, ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("applyM").setTitle("Анкета в Meta Famq");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a1").setLabel("Ник, Возраст, Статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a2").setLabel("Ссылка на откат стрельбы").setStyle(TextInputStyle.Paragraph)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a3").setLabel("Ваш средний онлайн в день").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }
 
    /* ================= [ ЛОГИКА ОТПРАВКИ ЗАЯВКИ (БЕЗ ВЕТОК) ] ================= */
    if (i.isModalSubmit() && i.customId === "applyM") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      if (!log) return i.reply({ content: "❌ Канал заявок не найден. Проверьте MAIN_LOG_CHANNEL в настройках бота.", ephemeral: true });
      
      const uid = i.user.id;

      const emb = new EmbedBuilder().setTitle("📩 НОВАЯ ЗАЯВКА В META").setColor("Red")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "📝 Данные", value: i.fields.getTextInputValue("a1") },
          { name: "🎬 Стрельба", value: i.fields.getTextInputValue("a2") },
          { name: "🕒 Онлайн", value: i.fields.getTextInputValue("a3") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять сразу").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMCALL.${uid}`).setLabel("📞 Вызвать на обзвон").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      
      await log.send({ 
        content: `Заявка от <@${uid}>`,
        embeds: [emb], 
        components: [row] 
      });
      
      return i.reply({ content: "✅ Ваша анкета успешно отправлена на рассмотрение!", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "afk_on") {
      const roles = i.member.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
      afkdb.roles[i.user.id] = roles; saveAfk();
      for (const r of roles) await i.member.roles.remove(r).catch(() => {});
      await i.member.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
      return i.reply({ content: "🌙 Вы ушли в AFK статус. Ваши роли временно сняты.", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "afk_off") {
      const saved = afkdb.roles[i.user.id];
      if (!saved) return i.reply({ content: "❌ Вы не находились в AFK статусе бота.", ephemeral: true });
      for (const r of saved) await i.member.roles.add(r).catch(() => {});
      await i.member.roles.remove(CONFIG.VACATION_ROLE).catch(() => {});
      delete afkdb.roles[i.user.id]; saveAfk();
      return i.reply({ content: "✅ С возвращением! Все ваши роли возвращены.", ephemeral: true });
    }
 
  } catch (e) {
    console.error("❌ Критическая ошибка в обработке interaction:");
    console.error(`   Тип: ${i.isChatInputCommand() ? `команда /${i.commandName}` : i.customId || "неизвестно"}`);
    console.error(e);
    const errText = `❌ Что-то пошло не так: \`${e.message || e}\``;
    if (!i.replied && !i.deferred) {
      await i.reply({ content: errText, ephemeral: true }).catch(() => {});
    } else if (i.deferred && !i.replied) {
      await i.editReply({ content: errText }).catch(() => {});
    }
  }
});
 
client.login(process.env.TOKEN);