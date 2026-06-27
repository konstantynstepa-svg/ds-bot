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
const express = require("express");
const bodyParser = require("body-parser");

/* ================= [ НАСТРОЙКИ СЕМЬИ META ] ================= */
// Теперь это let, чтобы мы могли менять их через сайт
let META_IMAGE = "https://cdn.discordapp.com/attachments/1520394577222172675/1520427420333637862/Gemini_Generated_Image_vx5awhvx5awhvx5a.png?ex=6a4127e1&is=6a3fd661&hm=169a0e6ea041e124d9ba168a5c46e5b40c09e4612d8e61355569bc521eac4cb9&";

let CONFIG = {
  COMMAND_CHANNEL_ID: "1520394576999747677",
  MAIN_LOG_CHANNEL: "1520394577222172679",
  REPORT_LOG_CHANNEL: "1520394577222172679",
  AFK_LOG_CHANNEL: "1520394577222172679",
  AFK_COMMAND_CHANNEL: "1520394577721295020",
  NEWS_CHANNEL_ID: "1520394577549201415",
  WARN_SYSTEM_CHANNEL: "1520394577549201417",
  WARN_WORKOFF_CHANNEL: "1520394577721295019",
  TIER_CHANNEL_ID: "1490912215341989978",
  POINTS_CHANNEL_ID: "1520394577549201414",
  RANKUP_LOG_CHANNEL: "1520394577222172678", 

  ROLE_ACCEPTED_ID: "1520394576458682395", 
  RANK_2_ROLE_ID:   "1520394576458682396", 
  RANK_3_ROLE_ID:   "1520394576458682397", 

  VACATION_ROLE: "1479988454484869271",
  FINE_ROLE_1:   "1479987457591218410",
  FINE_ROLE_2:   "1479987547395325984",

  IMAGE:      META_IMAGE,
  TIER_IMAGE: META_IMAGE,

  INTERVIEW_CHANNELS: [
    "1480227608846143548",
    "1480227634393649324",
    "1499718934977445979",
    "1499718997225111702",
    "1499719070885482648"
  ],

  ADMIN_ROLES: [
    "1520394576467198072",
    "1520394576467198069",
    "1520394576467198073",
    "1520394576467198068",
    "1520394576467198066",
    "1520394576467198065"
  ]
};

let CAPT_CONFIG = {
  CHANNEL_ID: "1520394577381687344",
  IMAGE_URL:  META_IMAGE,
  TIERS: {
    "1": "1479566016924221510",
    "2": "1479565407319883806",
    "3": "1479564709354016929"
  },
  OWNER_ID: "530064311310352415"
};

/* ================= [ ЗАГРУЗКА И СОХРАНЕНИЕ НАСТРОЕК С ВЕБ-САЙТА ] ================= */
const SERVER_CONFIG_FILE = "server_settings.json";

// Загружаем настройки из файла, если он есть
if (fs.existsSync(SERVER_CONFIG_FILE)) {
  try {
    const savedSettings = JSON.parse(fs.readFileSync(SERVER_CONFIG_FILE, "utf8"));
    CONFIG = Object.assign(CONFIG, savedSettings.CONFIG);
    CAPT_CONFIG = Object.assign(CAPT_CONFIG, savedSettings.CAPT_CONFIG);
  } catch(e) {
    console.error("Ошибка загрузки настроек веб-сайта:", e);
  }
}

// Функция для сохранения настроек
const saveWebConfig = () => {
  try {
    fs.writeFileSync(SERVER_CONFIG_FILE, JSON.stringify({ CONFIG, CAPT_CONFIG }, null, 2), "utf8");
  } catch(e) {
    console.error("Ошибка сохранения настроек:", e);
  }
};

/* ================= [ ИНФОРМАЦИЯ О ТИРАХ ] ================= */
const TIER_INFO = {
  "3": {
    label: "Tier 3 (Слабый)",
    emoji: "🟢",
    color: "#2ecc71",
    requirements: [
      "✅ Откат спешик + сайга",
      "✅ КД минимум 0.9",
      "✅ Минимум 6 человек на арене",
      "✅ Выйти хотя бы в 0.9 КД"
    ],
    description:
      "**Требования для Tier 3:**\n" +
      "🔹 Откат спешик + сайга (КД минимум **0.9**)\n" +
      "🔹 Арена от **6 человек**\n" +
      "🔹 Выйти хотя бы в **0.9** КД\n\n" +
      "Нажмите **«Подать заявку на Tier 3»** чтобы продолжить."
  },
  "2": {
    label: "Tier 2 (Средний)",
    emoji: "🟡",
    color: "#f1c40f",
    requirements: [
      "✅ 6 откатов арены (от 6 человек каждый)",
      "✅ КД минимум 1.1",
      "✅ Откат спешик + сайга"
    ],
    description:
      "**Требования для Tier 2:**\n" +
      "🔹 **6 откатов** арены (от **6 человек** каждый)\n" +
      "🔹 КД минимум **1.1**\n" +
      "🔹 Откат спешик + сайга\n\n" +
      "Нажмите **«Подать заявку на Tier 2»** чтобы продолжить."
  },
  "1": {
    label: "Tier 1 (Сильный)",
    emoji: "🔴",
    color: "#e74c3c",
    requirements: [
      "✅ 9 откатов арены (от 6 человек каждый)",
      "✅ КД минимум 1.5",
      "✅ 12 скринов с МП семьи"
    ],
    description:
      "**Требования для Tier 1:**\n" +
      "🔹 **9 откатов** арены (от **6 человек** каждый)\n" +
      "🔹 КД минимум **1.5**\n" +
      "🔹 **12 скринов** участия в МП семьи\n\n" +
      "Нажмите **«Подать заявку на Tier 1»** чтобы продолжить."
  }
};

/* ================= [ ТРЕБОВАНИЯ ПОВЫШЕНИЯ РАНГОВ ] ================= */
const RANKUP_INFO = {
  "1_to_2": {
    title: "Повышение 1 → 2 ранг",
    description:
      "**Требования для повышения с 1 на 2 ранг:**\n" +
      "🔹 Сменить фамилию\n" +
      "🔹 **2 скрина** с арены (КД минимум **0.8**, **500 урона**, **5 убитых** игроков)\n" +
      "🔹 **3 скрина** с МП семьи\n\n" +
      "Нажмите **«Подать заявку»** для отправки доказательств.",
    fields: [
      { id: "ru_nick",    label: "Ваш ник + новая фамилия",                style: TextInputStyle.Short },
      { id: "ru_arena",   label: "2 скрина арены (500 ур., 5 кил, КД 0.8+)", style: TextInputStyle.Paragraph },
      { id: "ru_mp",      label: "3 скрина с МП семьи",                    style: TextInputStyle.Paragraph }
    ]
  },
  "2_to_3": {
    title: "Повышение 2 → 3 ранг",
    description:
      "**Требования для повышения со 2 на 3 ранг:**\n" +
      "🔹 **2 отката** спешик + сайга\n" +
      "🔹 **2 отката** по 5 минут от **1000 урона** и **20 убитых** человек\n" +
      "🔹 КД минимум **1.0**\n" +
      "🔹 **4 скрина** с МП семьи\n\n" +
      "Нажмите **«Подать заявку»** для отправки доказательств.",
    fields: [
      { id: "ru_nick",    label: "Ваш ник",                                        style: TextInputStyle.Short },
      { id: "ru_recoil",  label: "2 отката спешик+сайга (ссылки)",                 style: TextInputStyle.Paragraph },
      { id: "ru_5min",    label: "2 отката по 5мин (1000 ур./20 кил) + КД 1.0+",  style: TextInputStyle.Paragraph },
      { id: "ru_mp",      label: "4 скрина с МП семьи",                            style: TextInputStyle.Paragraph }
    ]
  }
};

const activeInterviews = new Map();
let currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };

const EARN_OPTIONS = [
  { label: 'Капт (5 монет)',           value: 'capt_5' },
  { label: 'Заправка (3 монеты)',       value: 'gas_3' },
  { label: 'Топ 1 на арене (2 монеты)', value: 'arena_2' },
  { label: 'Развозка грина (3 монеты)', value: 'green_3' },
  { label: 'Выезд на трассу (3 монеты)',value: 'highway_3' },
  { label: 'Тайники (2 монеты)',         value: 'stashes_2' },
  { label: 'Мойка машин (3 монеты)',     value: 'carwash_3' },
  { label: 'Загрузка коробок (1 монета)',value: 'boxes_1' },
  { label: 'Другой контракт (1 монета)', value: 'other_1' }
];

/* ================= [ БАЗА ДАННЫХ ] ================= */
let db = { points: {}, accepts: {} };
if (fs.existsSync("db.json")) {
  try { db = Object.assign({ points: {}, accepts: {} }, JSON.parse(fs.readFileSync("db.json", "utf8"))); }
  catch(e) { console.error("Ошибка чтения db.json:", e); }
}

let afkdb = { roles: {} };
if (fs.existsSync("afkdb.json")) {
  try { afkdb = JSON.parse(fs.readFileSync("afkdb.json", "utf8")); }
  catch(e) { console.error("Ошибка чтения afkdb.json:", e); }
}

const save    = () => { try { fs.writeFileSync("db.json",   JSON.stringify(db,    null, 2)); } catch(e) {} };
const saveAfk = () => { try { fs.writeFileSync("afkdb.json",JSON.stringify(afkdb, null, 2)); } catch(e) {} };
const addPoints = (id, amt) => { db.points[id] = (db.points[id] || 0) + amt; save(); };
const getPoints = (id) => db.points[id] || 0;

setInterval(() => { save(); saveAfk(); }, 5 * 60 * 1000);

let membersCacheTime = 0;
const MEMBERS_CACHE_TTL = 5 * 60 * 1000;
async function fetchMembersCached(guild) {
  const now = Date.now();
  if (now - membersCacheTime > MEMBERS_CACHE_TTL || guild.members.cache.size < 2) {
    await guild.members.fetch().catch(() => {});
    membersCacheTime = now;
  }
  return guild.members.cache;
}

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
  new SlashCommandBuilder().setName('give').setDescription('Выдать Мета Коины игроку').addUserOption(opt => opt.setName('user').setDescription('Кому').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Количество').setRequired(true)),
  new SlashCommandBuilder().setName('menu').setDescription('Открыть систему баллов Meta'),
  new SlashCommandBuilder().setName('заявка').setDescription('Открыть панель заявки в Meta'),
  new SlashCommandBuilder().setName('afk').setDescription('Управление статусом AFK / Отпуск'),
  new SlashCommandBuilder().setName('startcapt').setDescription('Начать сбор на капт Meta'),
  new SlashCommandBuilder().setName('капт').setDescription('Оповещение о капте Meta').addStringOption(opt => opt.setName('time').setDescription('Время').setRequired(false)),
  new SlashCommandBuilder().setName('clear').setDescription('Очистить сообщения в чате').addIntegerOption(opt => opt.setName('amount').setDescription('От 1 до 100').setRequired(true)),
  new SlashCommandBuilder().setName('отчеты').setDescription('Панель еженедельного отчёта'),
  new SlashCommandBuilder().setName('повышение').setDescription('Панель повышения ранга'),
  new SlashCommandBuilder().setName('оповещение').setDescription('Отправить важное сообщение с галочкой о прочтении').addStringOption(opt => opt.setName('текст').setDescription('Текст').setRequired(true)),
];

/* ================= [ ЗАПУСК ] ================= */
client.once("ready", async () => {
  console.log(`🤖 Бот ${client.user.tag} запущен и готов к работе!`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands.map(cmd => cmd.toJSON()) });
      console.log(`✅ Команды зарегистрированы для сервера ${guild.name}`);
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(cmd => cmd.toJSON()) });
      console.log('✅ Команды зарегистрированы глобально.');
    }
  } catch (error) {
    console.error('Ошибка регистрации команд:', error);
  }
  await checkConfig();
});

async function checkConfig() {
  const guild = client.guilds.cache.first();
  if (!guild) { console.warn('⚠️ Бот не состоит ни на одном сервере!'); return; }
  console.log(`\n🔍 Проверка конфигурации: ${guild.name} (${guild.id})\n`);
  const channelFields = ["COMMAND_CHANNEL_ID","MAIN_LOG_CHANNEL","REPORT_LOG_CHANNEL","AFK_LOG_CHANNEL","AFK_COMMAND_CHANNEL","NEWS_CHANNEL_ID","WARN_SYSTEM_CHANNEL","WARN_WORKOFF_CHANNEL","TIER_CHANNEL_ID","POINTS_CHANNEL_ID","RANKUP_LOG_CHANNEL"];
  const roleFields    = ["ROLE_ACCEPTED_ID","RANK_2_ROLE_ID","RANK_3_ROLE_ID","VACATION_ROLE","FINE_ROLE_1","FINE_ROLE_2"];
  let problems = 0;
  for (const f of channelFields) {
    const ch = await guild.channels.fetch(CONFIG[f]).catch(() => null);
    if (!ch) { console.warn(`❌ CONFIG.${f} = "${CONFIG[f]}" — НЕ НАЙДЕН`); problems++; }
    else       console.log(`✅ CONFIG.${f} -> #${ch.name}`);
  }
  for (const f of roleFields) {
    const r = await guild.roles.fetch(CONFIG[f]).catch(() => null);
    if (!r) { console.warn(`❌ CONFIG.${f} = "${CONFIG[f]}" — НЕ НАЙДЕН`); problems++; }
    else      console.log(`✅ CONFIG.${f} -> @${r.name}`);
  }
  for (const id of CONFIG.ADMIN_ROLES) {
    const r = await guild.roles.fetch(id).catch(() => null);
    if (!r) { console.warn(`❌ ADMIN_ROLES "${id}" — НЕ НАЙДЕН`); problems++; }
    else      console.log(`✅ ADMIN_ROLES -> @${r.name}`);
  }
  for (const id of CONFIG.INTERVIEW_CHANNELS) {
    const ch = await guild.channels.fetch(id).catch(() => null);
    if (!ch) { console.warn(`❌ INTERVIEW_CHANNELS "${id}" — НЕ НАЙДЕН`); problems++; }
    else       console.log(`✅ INTERVIEW_CHANNELS -> #${ch.name}`);
  }
  for (const [t, id] of Object.entries(CAPT_CONFIG.TIERS)) {
    const r = await guild.roles.fetch(id).catch(() => null);
    if (!r) { console.warn(`❌ CAPT_CONFIG.TIERS["${t}"] "${id}" — НЕ НАЙДЕН`); problems++; }
    else      console.log(`✅ CAPT_CONFIG.TIERS["${t}"] -> @${r.name}`);
  }
  const captCh = await guild.channels.fetch(CAPT_CONFIG.CHANNEL_ID).catch(() => null);
  if (!captCh) { console.warn(`❌ CAPT_CONFIG.CHANNEL_ID — НЕ НАЙДЕН`); problems++; }
  else           console.log(`✅ CAPT_CONFIG.CHANNEL_ID -> #${captCh.name}`);
  if (problems === 0) console.log(`\n🎉 Все ID валидны!\n`);
  else                console.warn(`\n⚠️ Найдено проблем: ${problems}.\n`);
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
      { name: `Замены: (${currentCapt.subs.length})`,  value: fmt(currentCapt.subs),  inline: false }
    );
}

/* ================= [ ОБРАБОТКА ВЗАИМОДЕЙСТВИЙ ] ================= */
client.on("interactionCreate", async i => {
  try {

    /* ===== СЛЭШ КОМАНДЫ ===== */
    if (i.isChatInputCommand()) {
      const cmd = i.commandName;

      // /clear
      if (cmd === 'clear') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ У вас нет прав админа.", ephemeral: true });
        const n = i.options.getInteger('amount');
        if (n < 1 || n > 100) return i.reply({ content: "❌ Укажите число от 1 до 100.", ephemeral: true });
        await i.channel.bulkDelete(n, true).catch(() => {});
        return i.reply({ content: `✅ Удалено сообщений: ${n}.`, ephemeral: true });
      }

      // /новости — БЕЗ картинки в эмбеде
      if (cmd === 'новости') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder()
          .setTitle("📢 ВАЖНАЯ НОВОСТЬ META")
          .setDescription(text)
          .setColor("Red")
          .setTimestamp();
        const newsCh = await i.guild.channels.fetch(CONFIG.NEWS_CHANNEL_ID).catch(() => null);
        if (newsCh) await newsCh.send({ embeds: [embed] }).catch(() => {});
        const members = await fetchMembersCached(i.guild);
        const targets = members.filter(m => !m.user.bot);
        let sent = 0;
        for (const [, m] of targets) {
          try { await m.send({ embeds: [embed] }); sent++; } catch { notifyBlocked(i.guild, m); }
        }
        return i.editReply(`✅ Новость опубликована. Доставлено: **${sent}** участников.`);
      }
      
      // /оповещение
      if (cmd === 'оповещение') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        
        const text = i.options.getString('текст');
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("READ_BTN").setLabel("✅ Я прочитал").setStyle(ButtonStyle.Success)
        );
        
        await i.channel.send({ content: `📢 **ВНИМАНИЕ!**\n\n${text}\n\n*Ребята, кто прочитал — ставьте галку ниже!*`, components: [row] });
        return i.reply({ content: "✅ Оповещение отправлено.", ephemeral: true });
      }

      // /спам
      if (cmd === 'спам') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст') || "🚨 **СБОР НА КАПТ META!** Быстро заходи в игру!";
        const members = await fetchMembersCached(i.guild);
        const targets = members.filter(m => !m.user.bot);
        let sent = 0;
        for (const [, m] of targets) {
          try {
            for (let r = 0; r < 5; r++) { await m.send(text); await new Promise(res => setTimeout(res, 300)); }
            sent++;
          } catch { notifyBlocked(i.guild, m); }
        }
        return i.editReply(`✅ Спам-оповещение отправлено **${sent}** людям.`);
      }

      // /тир
      if (cmd === 'тир') {
        const embed = new EmbedBuilder()
          .setTitle("🎯 СИСТЕМА ТИРОВ META")
          .setDescription(
            "Выберите тир для ознакомления с требованиями.\n\n" +
            "🔴 **Tier 1** — Сильный\n" +
            "🟡 **Tier 2** — Средний\n" +
            "🟢 **Tier 3** — Слабый (для начинающих)\n\n" +
            "Нажмите на нужный тир, прочитайте требования и подайте заявку."
          )
          .setImage(CONFIG.TIER_IMAGE)
          .setColor("#8A2BE2");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("TIER_INFO.1").setLabel("🔴 Tier 1").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("TIER_INFO.2").setLabel("🟡 Tier 2").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("TIER_INFO.3").setLabel("🟢 Tier 3").setStyle(ButtonStyle.Success)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель тиров отправлена.", ephemeral: true });
      }

      // /give
      if (cmd === 'give') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const user = i.options.getUser('user');
        const amt  = i.options.getInteger('amount');
        addPoints(user.id, amt);
        return i.reply({ content: `✅ Выдано ${amt} 🪙 Мета Коинов игроку ${user}`, ephemeral: true });
      }

      // /menu
      if (cmd === 'menu') {
        const pts = 0;
        const embed = new EmbedBuilder()
          .setTitle("🪙 СИСТЕМА МЕТА КОИНОВ")
          .setDescription(
            "**Мета Коины** — валюта семьи META.\n\n" +
            "🟢 **Заработать** — отправьте отчет о выполненном контракте\n" +
            "💎 **Баланс** — проверьте свой текущий баланс\n" +
            "⬆️ **Повышение** — подать заявку на повышение ранга\n" +
            "🛒 **Магазин** — скоро будет доступен!"
          )
          .setImage(CONFIG.IMAGE)
          .setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("earn_btn").setLabel("🟢 Заработать").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("balance_btn").setLabel("💎 Баланс").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("rankup_menu_btn").setLabel("⬆️ Повышение").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("shop_btn").setLabel("🛒 Магазин").setStyle(ButtonStyle.Secondary)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Главное меню отправлено.", ephemeral: true });
      }

      // /заявка
      if (cmd === 'заявка') {
        const embed = new EmbedBuilder()
          .setTitle("📝 ЗАЯВКА В СЕМЬЮ META")
          .setDescription(
            "Хочешь попасть в нашу семью? Ознакомься с условиями ниже и нажми кнопку **«Подать заявку»**.\n\n" +
            "**📌 Требования для вступления:**\n" +
            "🔹 Уверенный откат на арене\n" +
            "🔹 Знание спешиал и карабина (спешик / карбы)\n" +
            "🔹 Адекватность и нормальное поведение в команде\n\n" +
            "Заполни анкету честно — это сильно влияет на решение о принятии."
          )
          .setImage(CONFIG.IMAGE)
          .setColor("#ff0000");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель заявок создана.", ephemeral: true });
      }

      // /afk
      if (cmd === 'afk') {
        const embed = new EmbedBuilder()
          .setTitle("💤 УПРАВЛЕНИЕ AFK / ОТПУСКАМИ")
          .setDescription("🏖 **Отпуск** — Подать заявку на отпуск.\n🌙 **Уйти в AFK** — Бот снимет роли до возвращения.\n✅ **Выйти из AFK** — Вернуть роли обратно.")
          .setImage(CONFIG.IMAGE)
          .setColor("#2f3136");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("afk_vacation").setLabel("🏖 В отпуск").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("afk_on").setLabel("🌙 Включить AFK").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("afk_off").setLabel("✅ Я вернулся").setStyle(ButtonStyle.Success)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ AFK-панель выведена.", ephemeral: true });
      }

      // /startcapt
      if (cmd === 'startcapt') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
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

      // /капт
      if (cmd === 'капт') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const time = i.options.getString('time') || "ближайшее время";
        const cachedMembers = await fetchMembersCached(i.guild);
        const members = cachedMembers.filter(m => !m.user.bot);
        const embed = new EmbedBuilder()
          .setTitle("⚔️ СБОР НА КАПТ META!")
          .setDescription(`Сбор объявлен! Будьте в игре через: **${time}**!`)
          .setImage(CAPT_CONFIG.IMAGE_URL)
          .setColor("Red");
        members.forEach(async m => { try { await m.send({ embeds: [embed] }); } catch {} });
        return i.editReply(`✅ Рассылка запущена для ${members.size} участников.`);
      }

      // /отчеты
      if (cmd === 'отчеты') {
        const embed = new EmbedBuilder()
          .setTitle("📋 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ СЕМЬИ META")
          .setDescription("Нажмите кнопку ниже для отправки вашего отчета старшему составу.")
          .setImage(CONFIG.IMAGE)
          .setColor("#5865F2");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("WREPORTBTN").setLabel("📋 Отправить отчёт").setStyle(ButtonStyle.Primary)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель отчётов готова.", ephemeral: true });
      }

      // /повышение
      if (cmd === 'повышение') {
        const embed = new EmbedBuilder()
          .setTitle("⬆️ ПОВЫШЕНИЕ РАНГА META")
          .setDescription(
            "Здесь вы можете подать заявку на повышение ранга.\n\n" +
            "**1 → 2 ранг:**\n" +
            "🔹 Сменить фамилию\n" +
            "🔹 2 скрина арены (КД 0.8+, 500 урона, 5 кил)\n" +
            "🔹 3 скрина с МП семьи\n\n" +
            "**2 → 3 ранг:**\n" +
            "🔹 2 отката спешик + сайга\n" +
            "🔹 2 отката 5 минут (1000 ур. / 20 кил), КД 1.0+\n" +
            "🔹 4 скрина с МП семьи\n\n" +
            "Нажмите на нужную кнопку для ознакомления и подачи заявки."
          )
          .setImage(CONFIG.IMAGE)
          .setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("RANKUP_INFO.1_to_2").setLabel("⬆️ 1 → 2 ранг").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("RANKUP_INFO.2_to_3").setLabel("⬆️ 2 → 3 ранг").setStyle(ButtonStyle.Success)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель повышения создана.", ephemeral: true });
      }
    }

    /* ===== ПРОВЕРКА ПРАВ НА КНОПКИ УПРАВЛЕНИЯ ===== */
    if (i.isButton()) {
      const isAdminBtn =
        i.customId.startsWith("ADMWATCH.") || i.customId.startsWith("ADMFAM.") ||
        i.customId.startsWith("ADMCALL.")  || i.customId.startsWith("ADMNO.")  ||
        i.customId.startsWith("ADMCALLOFF.") || i.customId.startsWith("ADMTIER.") ||
        i.customId.startsWith("WRWATCH.") || i.customId.startsWith("WROK.")    ||
        i.customId.startsWith("WRFINE1.") || i.customId.startsWith("ADMPTS.")  ||
        i.customId.startsWith("RU_ACCEPT.") || i.customId.startsWith("RU_REJECT.") ||
        i.customId.startsWith("RU_WATCH.");
      if (isAdminBtn && !CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) {
        return i.reply({ content: "❌ Ты не можешь сделать это действие.", ephemeral: true });
      }
    }
    
    /* ===================================================================
       ===== ГАЛОЧКА О ПРОЧТЕНИИ =====
    =================================================================== */
    if (i.isButton() && i.customId === "READ_BTN") {
      const msg = i.message;
      let content = msg.content;
      const readMarker = "\n\n**Прочитали:**";
      
      if (!content.includes(readMarker)) {
        content += readMarker;
      }
      
      if (!content.includes(`<@${i.user.id}>`)) {
         content += `\n- <@${i.user.id}>`;
         await msg.edit({ content });
         return i.reply({ content: "✅ Отмечено как прочитанное!", ephemeral: true });
      } else {
         return i.reply({ content: "❌ Ты уже поставил галочку!", ephemeral: true });
      }
    }

    /* ===================================================================
       ===== СИСТЕМА ТИРОВ — ОЗНАКОМЛЕНИЕ + ПОДАЧА ЗАЯВКИ =====
    =================================================================== */
    if (i.isButton() && i.customId.startsWith("TIER_INFO.")) {
      const n = i.customId.split(".")[1];
      const info = TIER_INFO[n];
      if (!info) return i.reply({ content: "❌ Тир не найден.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`${info.emoji} ОЗНАКОМЛЕНИЕ — ${info.label}`)
        .setDescription(info.description)
        .setColor(info.color)
        .addFields({ name: "📋 Требования", value: info.requirements.join("\n") })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`TIER_APPLY.${n}`).setLabel(`✅ Подать заявку на Tier ${n}`).setStyle(ButtonStyle.Primary)
      );
      return i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("TIER_APPLY.")) {
      const n = i.customId.split(".")[1];
      const info = TIER_INFO[n];
      if (!info) return i.reply({ content: "❌ Тир не найден.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`TIERM${n}`)
        .setTitle(`Заявка на Tier ${n} — META`);

      if (n === "3") {
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tnick").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tkd").setLabel("Ваш КД (минимум 0.9)").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tskills").setLabel("Скрин отката спешик+сайга (ссылка)").setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tarena").setLabel("Скрин арены от 6 человек (ссылка)").setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
      } else if (n === "2") {
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tnick").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tkd").setLabel("Ваш КД (минимум 1.1)").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tskills").setLabel("6 откатов арены (6+ чел.), ссылки").setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tarena").setLabel("Скрин отката спешик+сайга").setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
      } else if (n === "1") {
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tnick").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tkd").setLabel("Ваш КД (минимум 1.5)").setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tskills").setLabel("9 откатов арены (6+ чел.), ссылки").setStyle(TextInputStyle.Paragraph).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tarena").setLabel("12 скринов МП семьи (ссылки)").setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
      }
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && /^TIERM[123]$/.test(i.customId)) {
      const n = i.customId.replace("TIERM", "");
      const logCh = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      if (!logCh) return i.reply({ content: "❌ Канал логов не настроен. Обратитесь к создателю.", ephemeral: true });

      const info = TIER_INFO[n];
      const emb = new EmbedBuilder()
        .setTitle(`🎯 ЗАЯВКА НА TIER ${n} [META]`)
        .setColor(info.color)
        .addFields(
          { name: "👤 Отправитель",        value: `${i.user}` },
          { name: "📝 Ник/Статик",          value: i.fields.getTextInputValue("tnick") },
          { name: "📊 КД",                  value: i.fields.getTextInputValue("tkd") },
          { name: "🎬 Доказательства",      value: i.fields.getTextInputValue("tskills") },
          { name: n === "1" ? "🏠 МП Семьи" : "🏟 Арена", value: i.fields.getTextInputValue("tarena") },
          { name: "📊 Статус",              value: "⏳ На рассмотрении" }
        )
        .setTimestamp();

      const uid = i.user.id;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Взял на проверку").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMTIER.${uid}.${n}`).setLabel(`✅ Одобрить Tier ${n}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      await logCh.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка на тир отправлена руководству!", ephemeral: true });
    }

    /* ===================================================================
       ===== СИСТЕМА ПОВЫШЕНИЯ РАНГА =====
    =================================================================== */
    if (i.isButton() && i.customId === "rankup_menu_btn") {
      let currentRank = 0;
      if (i.member.roles.cache.has(CONFIG.RANK_2_ROLE_ID)) currentRank = 2;
      else if (i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID)) currentRank = 1;

      if (currentRank === 0)
        return i.reply({ content: "❌ Вы не состоите в семье.", ephemeral: true });
      if (currentRank >= 3)
        return i.reply({ content: "✅ У вас уже максимальный ранг!", ephemeral: true });

      const nextKey = `${currentRank}_to_${currentRank + 1}`;
      const info = RANKUP_INFO[nextKey];

      const embed = new EmbedBuilder()
        .setTitle(`⬆️ ${info.title}`)
        .setDescription(info.description)
        .setColor("#00d4ff")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`RANKUP_APPLY.${nextKey}`).setLabel("📋 Подать заявку").setStyle(ButtonStyle.Primary)
      );
      return i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("RANKUP_INFO.")) {
      const key = i.customId.split(".")[1];
      const info = RANKUP_INFO[key];
      if (!info) return i.reply({ content: "❌ Не найдено.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`⬆️ Ознакомление: ${info.title}`)
        .setDescription(info.description)
        .setColor("#00d4ff")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`RANKUP_APPLY.${key}`).setLabel("📋 Подать заявку").setStyle(ButtonStyle.Primary)
      );
      return i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("RANKUP_APPLY.")) {
      const key = i.customId.split(".")[1];
      const info = RANKUP_INFO[key];
      if (!info) return i.reply({ content: "❌ Не найдено.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`RANKUPM.${key}`)
        .setTitle(info.title);

      for (const field of info.fields) {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(field.id)
              .setLabel(field.label)
              .setStyle(field.style)
              .setRequired(true)
          )
        );
      }
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("RANKUPM.")) {
      const key = i.customId.replace("RANKUPM.", "");
      const info = RANKUP_INFO[key];
      if (!info) return i.reply({ content: "❌ Ошибка обработки.", ephemeral: true });

      const logCh = await i.guild.channels.fetch(CONFIG.RANKUP_LOG_CHANNEL).catch(() => null);
      if (!logCh) return i.reply({ content: "❌ Канал проверки повышений не настроен.", ephemeral: true });

      const [fromRank, , toRank] = key.split("_");
      const emb = new EmbedBuilder()
        .setTitle(`⬆️ ЗАЯВКА НА ПОВЫШЕНИЕ ${fromRank} → ${toRank} РАНГ [META]`)
        .setColor("#00d4ff")
        .addFields({ name: "👤 Игрок", value: `${i.user}` })
        .setTimestamp();

      for (const field of info.fields) {
        try {
          const val = i.fields.getTextInputValue(field.id);
          emb.addFields({ name: field.label, value: val || "—" });
        } catch {}
      }
      emb.addFields({ name: "📊 Статус", value: "⏳ На рассмотрении" });

      const uid = i.user.id;
      const targetRoleId = toRank === "2" ? CONFIG.RANK_2_ROLE_ID : CONFIG.RANK_3_ROLE_ID;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`RU_WATCH.${uid}`).setLabel("👀 Проверяю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`RU_ACCEPT.${uid}.${targetRoleId}.${fromRank}.${toRank}`).setLabel(`✅ Повысить до ${toRank} ранга`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`RU_REJECT.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );

      await logCh.send({ content: `📋 Заявка на повышение от <@${uid}>`, embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка на повышение отправлена на проверку!", ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("RU_WATCH.")) {
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `👀 Проверяет: ${i.user.username}` } : f));
      return i.update({ embeds: [emb] });
    }

    if (i.isButton() && i.customId.startsWith("RU_ACCEPT.")) {
      const parts = i.customId.split(".");
      const uid         = parts[1];
      const roleId      = parts[2];
      const fromRank    = parts[3];
      const toRank      = parts[4];

      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        const oldRoleId = fromRank === "1" ? CONFIG.ROLE_ACCEPTED_ID : CONFIG.RANK_2_ROLE_ID;
        await target.roles.remove(oldRoleId).catch(() => {});
        await target.roles.add(roleId).catch(() => {});
        target.send(`🎉 Поздравляем! Ваша заявка на повышение одобрена — вы получили **${toRank} ранг** в семье META!`).catch(() => {});
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрил: ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    if (i.isButton() && i.customId.startsWith("RU_REJECT.")) {
      const uid = i.customId.split(".")[1];
      const modal = new ModalBuilder()
        .setCustomId(`RU_REJECTM.${uid}.${i.message.id}`)
        .setTitle("Причина отклонения");
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("reason").setLabel("Почему отклонено?").setStyle(TextInputStyle.Short).setRequired(true)
      ));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("RU_REJECTM.")) {
      const [, uid, mid] = i.customId.split(".");
      const reason = i.fields.getTextInputValue("reason");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const msg    = await i.channel.messages.fetch(mid).catch(() => null);
      if (msg) {
        const emb = EmbedBuilder.from(msg.embeds[0]).setColor("Red");
        emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `❌ Отклонил ${i.user.username}. Причина: ${reason}` } : f));
        await msg.edit({ embeds: [emb], components: [] });
      }
      if (target) target.send(`❌ Ваша заявка на повышение отклонена. Причина: ${reason}`).catch(() => {});
      return i.reply({ content: "✅ Заявка отклонена.", ephemeral: true });
    }

    /* ===================================================================
       ===== МАГАЗИН =====
    =================================================================== */
    if (i.isButton() && i.customId === "shop_btn") {
      const embed = new EmbedBuilder()
        .setTitle("🛒 МАГАЗИН META")
        .setDescription("**Магазин временно недоступен.**\nСкоро здесь появятся товары!")
        .setColor("#95a5a6")
        .setTimestamp();
      return i.reply({ embeds: [embed], ephemeral: true });
    }

    /* ===================================================================
       ===== СИСТЕМА БАЛЛОВ (ЗАРАБОТОК) =====
    =================================================================== */
    if (i.isButton() && i.customId === "earn_btn") {
      const sel = new StringSelectMenuBuilder()
        .setCustomId("earnsel")
        .setPlaceholder("Выберите выполненный контракт:");
      EARN_OPTIONS.forEach(o => sel.addOptions(
        new StringSelectMenuOptionBuilder().setLabel(o.label).setValue(o.value)
      ));
      return i.reply({ content: "Что было сделано?", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }

    if (i.isStringSelectMenu() && i.customId === "earnsel") {
      const key = i.values[0];
      const modal = new ModalBuilder().setCustomId(`EARN.${key}`).setTitle("Отчет на Мета Коины");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e1").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e2").setLabel("Ссылка на скриншот (Imgur/Яппикс)").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("EARN.")) {
      const key  = i.customId.replace("EARN.", "");
      const task = EARN_OPTIONS.find(o => o.value === key);
      const pts  = parseInt(key.split("_")[1]);
      const log  = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      if (!log) return i.reply({ content: "❌ Канал логов не найден.", ephemeral: true });

      const emb = new EmbedBuilder()
        .setTitle("🪙 ОТЧЕТ НА МЕТА КОИНЫ — META")
        .setColor("Yellow")
        .addFields(
          { name: "👤 Игрок",      value: `${i.user}` },
          { name: "🛠 Работа",     value: task.label },
          { name: "📝 Инфо",       value: i.fields.getTextInputValue("e1") },
          { name: "🔗 Скрин",      value: i.fields.getTextInputValue("e2") },
          { name: "📊 Статус",     value: "⏳ Ожидание" }
        )
        .setTimestamp();

      const uid = i.user.id;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMPTS.${uid}.${pts}`).setLabel("✅ Выдать коины").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Отчет успешно отправлен!", ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("ADMPTS.")) {
      const [, uid, pts] = i.customId.split(".");
      addPoints(uid, parseInt(pts));
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send(`✅ Ваш отчет одобрен! Вам начислено **${pts}** 🪙 Мета Коинов.`).catch(() => {});
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрил ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    if (i.isButton() && i.customId === "balance_btn") {
      const pts = getPoints(i.user.id);
      return i.reply({ content: `🪙 Ваш текущий баланс: **${pts}** Мета Коинов.`, ephemeral: true });
    }

    /* ===================================================================
       ===== ЗАЯВКА В СЕМЬЮ =====
    =================================================================== */
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("applyM").setTitle("Анкета в Meta Family");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a1").setLabel("Имя в жизни и возраст").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a2").setLabel("Ваш ник в игре").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a3").setLabel("Почему выбрали именно нашу семью?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a4").setLabel("Почему ушли с предыдущей семьи?").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a5").setLabel("Баны за читы? Ссылки: спешик/тяга/сайга").setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "applyM") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      if (!log) return i.reply({ content: "❌ Канал заявок не найден.", ephemeral: true });
      const uid = i.user.id;
      const emb = new EmbedBuilder()
        .setTitle("📩 НОВАЯ ЗАЯВКА В META")
        .setColor("Red")
        .setThumbnail(i.user.displayAvatarURL())
        .setImage(CONFIG.IMAGE)
        .addFields(
          { name: "👤 Игрок",                                   value: `${i.user}` },
          { name: "📝 Имя и возраст",                           value: i.fields.getTextInputValue("a1") },
          { name: "🎮 Ник в игре",                              value: i.fields.getTextInputValue("a2") },
          { name: "❓ Почему выбрали нашу семью",               value: i.fields.getTextInputValue("a3") },
          { name: "↩️ Почему ушли с предыдущей семьи",         value: i.fields.getTextInputValue("a4") },
          { name: "⚠️ Баны/читы и откаты (спешик/тяга/сайга)", value: i.fields.getTextInputValue("a5") },
          { name: "📊 Статус",                                  value: "⏳ Ожидание" }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять сразу").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMCALL.${uid}`).setLabel("📞 Вызвать на обзвон").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      try {
        await log.send({ content: `Заявка от <@${uid}>`, embeds: [emb], components: [row] });
      } catch (sendErr) {
        return i.reply({ content: `❌ Не удалось отправить заявку: \`${sendErr.message}\``, ephemeral: true });
      }
      return i.reply({ content: "✅ Ваша анкета успешно отправлена!", ephemeral: true });
    }

    /* ===================================================================
       ===== УПРАВЛЕНИЕ ЗАЯВКАМИ (КНОПКИ АДМИНИСТРАТОРОВ) =====
    =================================================================== */
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
        await target.roles.add(CONFIG.ROLE_ACCEPTED_ID).catch(() => {});
        target.send("🎉 Поздравляем! Вы приняты в семью **Meta**! Вам выдан 1 ранг.").catch(() => {});
      }
      
      // Лог в отдельный канал без фото и эмбедов
      const plainLogChannel = await i.guild.channels.fetch("1520495201464881214").catch(() => null);
      if (plainLogChannel) {
        await plainLogChannel.send(`Администратор ${i.user} принял игрока <@${uid}>.`);
      }

      // Трекинг принятых людей
      if (!db.accepts) db.accepts = {};
      if (!db.accepts[i.user.id]) db.accepts[i.user.id] = [];
      db.accepts[i.user.id].push(Date.now());
      save();

      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Принял: ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    if (i.isButton() && i.customId.startsWith("ADMCALL.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      await openInterviewChannels(i.guild, uid);
      if (target) target.send(`📞 Вас вызвали на обзвон в семью **Meta**! Срочно зайдите в канал обзвона в течение 7 минут.`).catch(() => {});
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
      const modal = new ModalBuilder()
        .setCustomId(`REJM.${uid}.${i.message.id}`)
        .setTitle("Причина отказа");
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("reason").setLabel("Почему отказ?").setStyle(TextInputStyle.Short).setRequired(true)
      ));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("REJM.")) {
      const [, uid, mid] = i.customId.split(".");
      const reason = i.fields.getTextInputValue("reason");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const msg    = await i.channel.messages.fetch(mid).catch(() => null);
      if (msg) {
        const emb = EmbedBuilder.from(msg.embeds[0]).setColor("Red");
        emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `❌ Отказал ${i.user.username}. Причина: ${reason}` } : f));
        await msg.edit({ embeds: [emb], components: [] });
      }
      if (target) target.send(`❌ Ваша заявка в Meta отклонена. Причина: ${reason}`).catch(() => {});
      return i.reply({ content: "✅ Отказ оформлен.", ephemeral: true });
    }

    /* ===================================================================
       ===== КАПТ =====
    =================================================================== */
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
      currentCapt.subs  = currentCapt.subs.filter(u => u !== id);
    };

    if (i.isButton() && i.customId.startsWith("capt_")) {
      const uid = i.user.id;
      if (i.customId === "capt_plus")  { rmCapt(uid); const t = getTier(i.member); currentCapt[t].push(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_sub")   { rmCapt(uid); currentCapt.subs.push(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_minus") { rmCapt(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_force") {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("captforceM").setTitle("Вписать игрока");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tid").setLabel("Discord ID игрока").setStyle(TextInputStyle.Short)));
        return i.showModal(modal);
      }
      if (i.customId === "capt_remove") {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("captremoveM").setTitle("Удалить с капта");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tid").setLabel("Discord ID").setStyle(TextInputStyle.Short)));
        return i.showModal(modal);
      }
    }

    if (i.isModalSubmit() && i.customId === "captforceM") {
      const tid = i.fields.getTextInputValue("tid");
      const tm  = await i.guild.members.fetch(tid).catch(() => null);
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

    /* ===================================================================
       ===== ОТЧЕТЫ =====
    =================================================================== */
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
      if (!repCh) return i.reply({ content: "❌ Канал для отчётов не найден.", ephemeral: true });
      const emb = new EmbedBuilder()
        .setTitle("📋 НОВЫЙ ЕЖЕНЕДЕЛЬНЫЙ ОТЧЕТ META")
        .setColor("#5865F2")
        .addFields(
          { name: "👤 Автор",      value: `${i.user}` },
          { name: "🔗 Скриншоты", value: i.fields.getTextInputValue("wrphoto") },
          { name: "👥 Работа",     value: i.fields.getTextInputValue("wraccepted") },
          { name: "📊 Итог",       value: i.fields.getTextInputValue("wrdone") },
          { name: "📊 Статус",     value: "⏳ Ожидает проверки" }
        )
        .setTimestamp();
      const uid = i.user.id;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`WRWATCH.${uid}`).setLabel("👀 Проверяю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`WROK.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`WRFINE1.${uid}`).setLabel("⚠️ Штраф 1").setStyle(ButtonStyle.Danger)
      );
      await repCh.send({ embeds: [emb], components: [row] });

      // Проверка нормы за последние 3 дня
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
      const userAccepts = (db.accepts && db.accepts[uid] ? db.accepts[uid] : []).filter(time => time >= threeDaysAgo).length;

      let replyText = "✅ Отчет отправлен руководству!";
      if (userAccepts === 0) {
        replyText += "\n\n🤖 **Ответ от бота:** оо братан вот это ты постарался на рекруте респект и уважуха за то что принял 0 человек спасибо.";
      } else if (userAccepts >= 8) {
        replyText += "\n\n🤖 **Ответ от бота:** красава норма выполнена тебе ожидают нормальные чаевые!";
      } else {
        replyText += `\n\n🤖 **Ответ от бота:** Брат, ты принял всего ${userAccepts} чел. за последние 3 дня. Норма — 8 человек. Ты не выполнил норму, твоя зарплата будет меньше!`;
      }

      return i.reply({ content: replyText, ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("WRWATCH.")) {
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `👀 Проверяет: ${i.user.username}` } : f));
      return i.update({ embeds: [emb] });
    }

    if (i.isButton() && i.customId.startsWith("WROK.")) {
      const uid    = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send("✅ Ваш еженедельный отчет принят руководством META!").catch(() => {});
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Принял: ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    /* ===================================================================
       ===== AFK =====
    =================================================================== */
    if (i.isButton() && i.customId === "afk_on") {
      const roles = i.member.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
      afkdb.roles[i.user.id] = roles; saveAfk();
      for (const r of roles) await i.member.roles.remove(r).catch(() => {});
      await i.member.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
      return i.reply({ content: "🌙 Вы ушли в AFK. Ваши роли временно сняты.", ephemeral: true });
    }

    if (i.isButton() && i.customId === "afk_off") {
      const saved = afkdb.roles[i.user.id];
      if (!saved) return i.reply({ content: "❌ Вы не находились в AFK статусе.", ephemeral: true });
      for (const r of saved) await i.member.roles.add(r).catch(() => {});
      await i.member.roles.remove(CONFIG.VACATION_ROLE).catch(() => {});
      delete afkdb.roles[i.user.id]; saveAfk();
      return i.reply({ content: "✅ С возвращением! Все ваши роли возвращены.", ephemeral: true });
    }

    if (i.isButton() && i.customId === "afk_vacation") {
      return i.reply({ content: "🏖 Для оформления отпуска обратитесь к руководству семьи.", ephemeral: true });
    }

  } catch (e) {
    console.error("❌ Критическая ошибка в обработке interaction:");
    console.error(`   Тип: ${i.isChatInputCommand() ? `/${i.commandName}` : i.customId || "неизвестно"}`);
    console.error(e);

    let detail = e.message || String(e);
    if (e.rawError) {
      if (e.rawError.errors)   detail += " | " + JSON.stringify(e.rawError.errors);
      else if (e.rawError.message) detail = e.rawError.message;
    }

    const errText = `❌ Что-то пошло не так: \`${detail}\``.slice(0, 1900);
    if (!i.replied && !i.deferred)
      await i.reply({ content: errText, ephemeral: true }).catch(() => {});
    else if (i.deferred && !i.replied)
      await i.editReply({ content: errText }).catch(() => {});
  }
});


/* ==========================================================================
   ================= ВЕБ-СЕРВЕР И АДМИН-ПАНЕЛЬ УПРАВЛЕНИЯ ==================
   ========================================================================== */

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  const input = (name, val, label) => `
    <div style="margin-bottom:15px; text-align:left;">
      <label style="display:block; color:#00d4ff; font-weight:bold; margin-bottom:5px;">${label}</label>
      <input type="text" name="${name}" value="${val}" style="width:100%; padding:10px; background:#1e1e24; color:#fff; border:1px solid #444; border-radius:5px;" required>
    </div>`;

  res.send(`
    <html>
      <head>
        <meta charset="utf-8">
        <title>Панель Управления Meta Famq</title>
        <style>
          body { background:#2b2d31; color:#fff; font-family:sans-serif; padding:20px; text-align:center; }
          .container { max-width: 800px; margin: 0 auto; background: #313338; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
          h1 { color: #5865F2; }
          h2 { border-bottom: 2px solid #5865F2; padding-bottom: 10px; margin-top: 30px; color: #fff; text-align: left; }
          .btn { background: #5865F2; color: #fff; padding: 15px; border: none; width: 100%; font-size: 18px; font-weight: bold; cursor: pointer; border-radius: 5px; margin-top: 20px; transition: background 0.3s; }
          .btn:hover { background: #4752c4; }
          .success { background: #2ecc71; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚙️ Панель Управления Ботом</h1>
          ${req.query.s ? '<div class="success">✅ Настройки успешно сохранены и применены в боте!</div>' : ''}
          
          <form method="POST" action="/save">
            
            <h2>🌍 Базовые настройки</h2>
            ${input("META_IMAGE", CONFIG.IMAGE, "Ссылка на картинку бота (Эмбеды)")}
            ${input("ADMIN_ROLES", CONFIG.ADMIN_ROLES.join(", "), "Роли Администраторов бота (ID через запятую)")}

            <h2>📂 Настройки ID Каналов</h2>
            ${input("COMMAND_CHANNEL_ID", CONFIG.COMMAND_CHANNEL_ID, "Канал Заявок")}
            ${input("MAIN_LOG_CHANNEL", CONFIG.MAIN_LOG_CHANNEL, "Главный канал Логов")}
            ${input("REPORT_LOG_CHANNEL", CONFIG.REPORT_LOG_CHANNEL, "Канал Логов Отчетов")}
            ${input("AFK_LOG_CHANNEL", CONFIG.AFK_LOG_CHANNEL, "Канал Логов AFK")}
            ${input("AFK_COMMAND_CHANNEL", CONFIG.AFK_COMMAND_CHANNEL, "Канал для команды /afk")}
            ${input("NEWS_CHANNEL_ID", CONFIG.NEWS_CHANNEL_ID, "Канал Новостей")}
            ${input("TIER_CHANNEL_ID", CONFIG.TIER_CHANNEL_ID, "Канал Получения Тира")}
            ${input("POINTS_CHANNEL_ID", CONFIG.POINTS_CHANNEL_ID, "Канал Баллов")}
            ${input("RANKUP_LOG_CHANNEL", CONFIG.RANKUP_LOG_CHANNEL, "Канал Логов Повышений")}
            ${input("INTERVIEW_CHANNELS", CONFIG.INTERVIEW_CHANNELS.join(", "), "Каналы Обзвона (через запятую)")}

            <h2>⚔️ Настройки Каптов</h2>
            ${input("CAPT_CHANNEL_ID", CAPT_CONFIG.CHANNEL_ID, "Канал сбора на капт")}
            ${input("TIER_1_ROLE", CAPT_CONFIG.TIERS["1"], "Роль Tier 1")}
            ${input("TIER_2_ROLE", CAPT_CONFIG.TIERS["2"], "Роль Tier 2")}
            ${input("TIER_3_ROLE", CAPT_CONFIG.TIERS["3"], "Роль Tier 3")}

            <h2>🎭 Настройки ID Ролей</h2>
            ${input("ROLE_ACCEPTED_ID", CONFIG.ROLE_ACCEPTED_ID, "Роль 'Принят в семью' (1 ранг)")}
            ${input("RANK_2_ROLE_ID", CONFIG.RANK_2_ROLE_ID, "Роль 2 ранга")}
            ${input("RANK_3_ROLE_ID", CONFIG.RANK_3_ROLE_ID, "Роль 3 ранга")}
            ${input("VACATION_ROLE", CONFIG.VACATION_ROLE, "Роль Отпуска/AFK")}
            ${input("FINE_ROLE_1", CONFIG.FINE_ROLE_1, "Роль Штраф 1")}
            ${input("FINE_ROLE_2", CONFIG.FINE_ROLE_2, "Роль Штраф 2")}

            <button class="btn" type="submit">💾 СОХРАНИТЬ И ПРИМЕНИТЬ</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post("/save", (req, res) => {
  const b = req.body;

  // Обновление общих каналов и ролей
  CONFIG.IMAGE = b.META_IMAGE;
  CONFIG.TIER_IMAGE = b.META_IMAGE;
  CAPT_CONFIG.IMAGE_URL = b.META_IMAGE;

  CONFIG.COMMAND_CHANNEL_ID = b.COMMAND_CHANNEL_ID;
  CONFIG.MAIN_LOG_CHANNEL = b.MAIN_LOG_CHANNEL;
  CONFIG.REPORT_LOG_CHANNEL = b.REPORT_LOG_CHANNEL;
  CONFIG.AFK_LOG_CHANNEL = b.AFK_LOG_CHANNEL;
  CONFIG.AFK_COMMAND_CHANNEL = b.AFK_COMMAND_CHANNEL;
  CONFIG.NEWS_CHANNEL_ID = b.NEWS_CHANNEL_ID;
  CONFIG.TIER_CHANNEL_ID = b.TIER_CHANNEL_ID;
  CONFIG.POINTS_CHANNEL_ID = b.POINTS_CHANNEL_ID;
  CONFIG.RANKUP_LOG_CHANNEL = b.RANKUP_LOG_CHANNEL;

  CONFIG.ROLE_ACCEPTED_ID = b.ROLE_ACCEPTED_ID;
  CONFIG.RANK_2_ROLE_ID = b.RANK_2_ROLE_ID;
  CONFIG.RANK_3_ROLE_ID = b.RANK_3_ROLE_ID;
  CONFIG.VACATION_ROLE = b.VACATION_ROLE;
  CONFIG.FINE_ROLE_1 = b.FINE_ROLE_1;
  CONFIG.FINE_ROLE_2 = b.FINE_ROLE_2;

  CAPT_CONFIG.CHANNEL_ID = b.CAPT_CHANNEL_ID;
  CAPT_CONFIG.TIERS["1"] = b.TIER_1_ROLE;
  CAPT_CONFIG.TIERS["2"] = b.TIER_2_ROLE;
  CAPT_CONFIG.TIERS["3"] = b.TIER_3_ROLE;

  // Обновление массивов
  CONFIG.ADMIN_ROLES = b.ADMIN_ROLES.split(",").map(s => s.trim()).filter(s => s.length > 0);
  CONFIG.INTERVIEW_CHANNELS = b.INTERVIEW_CHANNELS.split(",").map(s => s.trim()).filter(s => s.length > 0);

  // Сохраняем все в файл JSON
  saveWebConfig();

  console.log("⚙️ Настройки успешно обновлены через веб-панель!");
  res.redirect("/?s=1");
});

app.listen(3000, () => console.log("🌐 Сайт админ-панели успешно запущен на http://localhost:3000"));

client.login(process.env.TOKEN);