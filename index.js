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
  SlashCommandBuilder,
  ChannelType
} = require("discord.js");
const fs = require("fs");

/* ================= [ НАСТРОЙКИ СЕМЬИ META ] ================= */
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
  ROLE_MANDATORY_ID: "1520503870420287578", 
  RANK_2_ROLE_ID:   "1520394576458682396", 
  RANK_3_ROLE_ID:   "1520394576458682397", 

  VACATION_ROLE: "1479988454484869271",
  FINE_ROLE_1:   "1479987457591218410",
  FINE_ROLE_2:   "1479987547395325984",

  IMAGE:      META_IMAGE,
  TIER_IMAGE: META_IMAGE,

  INTERVIEW_CHANNELS: [
    "1520394576999747681",
    "1520394576999747680",
    "1520766809232506981",
    "1520766839687217263"
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

/* ================= [ ЗАГРУЗКА БАЗЫ ] ================= */
const SERVER_CONFIG_FILE = "server_settings.json";
if (fs.existsSync(SERVER_CONFIG_FILE)) {
  try {
    const savedSettings = JSON.parse(fs.readFileSync(SERVER_CONFIG_FILE, "utf8"));
    CONFIG = Object.assign(CONFIG, savedSettings.CONFIG);
    CAPT_CONFIG = Object.assign(CAPT_CONFIG, savedSettings.CAPT_CONFIG);
  } catch(e) {}
}

const TIER_INFO = {
  "3": {
    label: "Tier 3 (Слабый)",
    emoji: "🟢",
    color: "#2ecc71",
    requirements: ["✅ Откат спешик + сайга", "✅ КД минимум 0.9", "✅ Минимум 6 человек на арене", "✅ Выйти хотя бы в 0.9 КД"],
    description: "**Требования для Tier 3:**\n🔹 Откат спешик + сайга (КД минимум **0.9**)\n🔹 Арена от **6 человек**\n🔹 Выйти хотя бы в **0.9** КД\n\nНажмите **«Подать заявку на Tier 3»** чтобы продолжить."
  },
  "2": {
    label: "Tier 2 (Средний)",
    emoji: "🟡",
    color: "#f1c40f",
    requirements: ["✅ 6 откатов арены (от 6 человек каждый)", "✅ КД минимум 1.1", "✅ Откат спешик + сайга"],
    description: "**Требования для Tier 2:**\n🔹 **6 откатов** арены (от **6 человек** каждый)\n🔹 КД минимум **1.1**\n🔹 Откат спешик + сайга\n\nНажмите **«Подать заявку на Tier 2»** чтобы продолжить."
  },
  "1": {
    label: "Tier 1 (Сильный)",
    emoji: "🔴",
    color: "#e74c3c",
    requirements: ["✅ 9 откатов арены (от 6 человек каждый)", "✅ КД минимум 1.5", "✅ 12 скринов с МП семьи"],
    description: "**Требования для Tier 1:**\n🔹 **9 откатов** арены (от **6 человек** каждый)\n🔹 КД минимум **1.5**\n🔹 **12 скринов** участия в МП семьи\n\nНажмите **«Подать заявку на Tier 1»** чтобы продолжить."
  }
};

const RANKUP_INFO = {
  "1_to_2": {
    title: "Повышение 1 → 2 ранг",
    description: "**Требования для повышения с 1 на 2 ранг:**\n🔹 Сменить фамилию\n🔹 **2 скрина** с арены (КД 0.8+, 500 урона, 5 кил)\n🔹 **3 скрина** с МП семьи",
    fields: [
      { id: "ru_nick", label: "Ваш ник + новая фамилия", style: TextInputStyle.Short },
      { id: "ru_arena", label: "2 скрина арены", style: TextInputStyle.Paragraph },
      { id: "ru_mp", label: "3 скрина с МП", style: TextInputStyle.Paragraph }
    ]
  },
  "2_to_3": {
    title: "Повышение 2 → 3 ранг",
    description: "**Требования для повышения со 2 на 3 ранг:**\n🔹 **2 отката** спешик+сайга\n🔹 **2 отката** 5мин (1000 ур./20 кил)\n🔹 КД 1.0+\n🔹 **4 скрина** МП",
    fields: [
      { id: "ru_nick", label: "Ваш ник", style: TextInputStyle.Short },
      { id: "ru_recoil", label: "2 отката спешик+сайга/тяга", style: TextInputStyle.Paragraph },
      { id: "ru_5min", label: "2 отката 5мин", style: TextInputStyle.Paragraph },
      { id: "ru_mp", label: "4 скрина с МП", style: TextInputStyle.Paragraph }
    ]
  }
};

let currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };

let db = { points: {}, accepts: {}, tierCooldowns: {} };
if (fs.existsSync("db.json")) {
  try { db = Object.assign({ points: {}, accepts: {}, tierCooldowns: {} }, JSON.parse(fs.readFileSync("db.json", "utf8"))); } catch(e) {}
}

let afkdb = { roles: {} };
if (fs.existsSync("afkdb.json")) {
  try { afkdb = JSON.parse(fs.readFileSync("afkdb.json", "utf8")); } catch(e) {}
}

const save = () => { try { fs.writeFileSync("db.json", JSON.stringify(db, null, 2)); } catch(e) {} };
const saveAfk = () => { try { fs.writeFileSync("afkdb.json", JSON.stringify(afkdb, null, 2)); } catch(e) {} };
const addPoints = (id, amt) => { db.points[id] = (db.points[id] || 0) + amt; save(); };
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

const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers ],
});

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

const commands = [
  new SlashCommandBuilder().setName('новости').setDescription('Разослать новость семье Meta').addStringOption(opt => opt.setName('текст').setDescription('Текст новости').setRequired(true)),
  new SlashCommandBuilder().setName('спам').setDescription('Разослать спам в ЛС всем').addStringOption(opt => opt.setName('текст').setDescription('Текст').setRequired(false)),
  new SlashCommandBuilder().setName('тир').setDescription('Панель получения тира'),
  new SlashCommandBuilder().setName('give').setDescription('Выдать Мета Коины').addUserOption(opt => opt.setName('user').setDescription('Кому').setRequired(true)).addIntegerOption(opt => opt.setName('amount').setDescription('Количество').setRequired(true)),
  new SlashCommandBuilder().setName('menu').setDescription('Открыть систему баллов Meta'),
  new SlashCommandBuilder().setName('заявка').setDescription('Открыть панель заявки в Meta'),
  new SlashCommandBuilder().setName('afk').setDescription('Управление статусом AFK / Отпуск'),
  new SlashCommandBuilder().setName('startcapt').setDescription('Начать сбор на капт Meta'),
  new SlashCommandBuilder().setName('капт').setDescription('Оповещение о капте Meta').addStringOption(opt => opt.setName('time').setDescription('Время').setRequired(false)),
  new SlashCommandBuilder().setName('clear').setDescription('Очистить сообщения в чате').addIntegerOption(opt => opt.setName('amount').setDescription('От 1 до 100').setRequired(true)),
  new SlashCommandBuilder().setName('отчеты').setDescription('Панель еженедельного отчёта'),
  new SlashCommandBuilder().setName('повышение').setDescription('Панель повышения ранга'),
  new SlashCommandBuilder().setName('прочитал').setDescription('Отправить важное сообщение с галочкой о прочтении').addStringOption(opt => opt.setName('текст').setDescription('Текст').setRequired(true)),
  new SlashCommandBuilder().setName('ветка').setDescription('Создать приватную ветку для отчетов игрока').addUserOption(opt => opt.setName('пользователь').setDescription('Выбери игрока').setRequired(true)),
];

client.once("ready", async () => {
  console.log(`🤖 Бот ${client.user.tag} запущен и готов к работе!`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    const guild = client.guilds.cache.first();
    if (guild) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands.map(cmd => cmd.toJSON()) });
      console.log(`✅ Команды зарегистрированы для сервера ${guild.name}`);
    }
  } catch (error) { console.error('Ошибка регистрации команд:', error); }
});

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

/* ================= [ ВЗАИМОДЕЙСТВИЯ ] ================= */
client.on("interactionCreate", async i => {
  try {
    if (i.isChatInputCommand()) {
      const cmd = i.commandName;
      const isAdmin = CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r));

      if (cmd === 'прочитал') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const text = i.options.getString('текст');
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("READ_BTN").setLabel("✅ Я прочитал").setStyle(ButtonStyle.Success));
        await i.channel.send({ content: `📢 **ВНИМАНИЕ!**\n\n${text}\n\n*Ребята, кто прочитал — ставьте галку ниже!*`, components: [row] });
        return i.reply({ content: "✅ Оповещение отправлено.", ephemeral: true });
      }

      if (cmd === 'ветка') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const targetUser = i.options.getUser('пользователь');
        const thread = await i.channel.threads.create({ name: `Отчеты - ${targetUser.username}`, type: ChannelType.PrivateThread, reason: 'Личная ветка' }).catch(() => null);
        if (!thread) return i.reply({ content: "❌ Ошибка создания ветки.", ephemeral: true });
        await thread.members.add(targetUser.id).catch(()=>{});
        await thread.members.add(i.user.id).catch(()=>{});
        const adminPing = CONFIG.ADMIN_ROLES.map(r => `<@&${r}>`).join(' ');
        await thread.send({ content: `👋 Привет, <@${targetUser.id}>! Это твоя личная ветка для предоставления отчетов.\nДоступ сюда есть только у тебя и старшего состава: ${adminPing}\n\n**Тебе необходимо предоставить:**\n🔹 Скрин ГГ\n🔹 Скрин МЦЛ\n🔹 ВЗМ / Капт\n🔹 РП семьи\n🔹 Откаты с каптов` });
        return i.reply({ content: `✅ Приватная ветка успешно создана: <#${thread.id}>`, ephemeral: true });
      }

      if (cmd === 'clear') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const n = i.options.getInteger('amount');
        await i.channel.bulkDelete(n, true).catch(() => {});
        return i.reply({ content: `✅ Удалено сообщений: ${n}.`, ephemeral: true });
      }

      if (cmd === 'новости') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder().setTitle("📢 ВАЖНАЯ НОВОСТЬ META").setDescription(text).setColor("Red").setTimestamp();
        const newsCh = await i.guild.channels.fetch(CONFIG.NEWS_CHANNEL_ID).catch(() => null);
        if (newsCh) await newsCh.send({ embeds: [embed] }).catch(() => {});
        return i.editReply(`✅ Новость опубликована.`);
      }

      if (cmd === 'спам') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст') || "🚨 **СБОР НА КАПТ META!** Быстро заходи в игру!";
        const members = await fetchMembersCached(i.guild);
        const targets = members.filter(m => !m.user.bot);
        let sent = 0;
        for (const [, m] of targets) { try { await m.send(text); sent++; } catch {} }
        return i.editReply(`✅ Спам отправлен **${sent}** людям.`);
      }

      if (cmd === 'тир') {
        const embed = new EmbedBuilder().setTitle("🎯 СИСТЕМА ТИРОВ META").setDescription("Выберите тир для ознакомления.\n\n🔴 **Tier 1** — Сильный\n🟡 **Tier 2** — Средний\n🟢 **Tier 3** — Слабый").setImage(CONFIG.TIER_IMAGE).setColor("#8A2BE2");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("TIER_INFO.1").setLabel("🔴 Tier 1").setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId("TIER_INFO.2").setLabel("🟡 Tier 2").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("TIER_INFO.3").setLabel("🟢 Tier 3").setStyle(ButtonStyle.Success)
        );
        return i.reply({ embeds: [embed], components: [row] });
      }

      if (cmd === 'give') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const user = i.options.getUser('user');
        const amt  = i.options.getInteger('amount');
        addPoints(user.id, amt);
        return i.reply({ content: `✅ Выдано ${amt} 🪙 Мета Коинов игроку ${user}`, ephemeral: true });
      }

      if (cmd === 'menu') {
        const embed = new EmbedBuilder().setTitle("🪙 СИСТЕМА МЕТА КОИНОВ").setDescription("**Мета Коины** — валюта семьи META.\n\n🟢 **Заработать**\n💎 **Баланс**\n⬆️ **Повышение**\n🛒 **Магазин**").setImage(CONFIG.IMAGE).setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("earn_btn").setLabel("🟢 Заработать").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("balance_btn").setLabel("💎 Баланс").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("rankup_menu_btn").setLabel("⬆️ Повышение").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("shop_btn").setLabel("🛒 Магазин").setStyle(ButtonStyle.Secondary)
        );
        return i.reply({ embeds: [embed], components: [row] });
      }

      if (cmd === 'заявка') {
        const embed = new EmbedBuilder().setTitle("📝 ЗАЯВКА В СЕМЬЮ META").setDescription("Хочешь попасть в нашу семью? Жми кнопку ниже.").setImage(CONFIG.IMAGE).setColor("#ff0000");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger));
        return i.reply({ embeds: [embed], components: [row] });
      }

      if (cmd === 'afk') {
        const embed = new EmbedBuilder().setTitle("💤 УПРАВЛЕНИЕ AFK").setDescription("🏖 **Отпуск**\n🌙 **Уйти в AFK**\n✅ **Выйти из AFK**").setImage(CONFIG.IMAGE).setColor("#2f3136");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("afk_vacation").setLabel("🏖 В отпуск").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("afk_on").setLabel("🌙 Включить AFK").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("afk_off").setLabel("✅ Я вернулся").setStyle(ButtonStyle.Success)
        );
        return i.reply({ embeds: [embed], components: [row] });
      }

      if (cmd === 'startcapt') {
        if (!isAdmin) return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("capt_plus").setLabel("➕ На Капт").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_sub").setLabel("🔄 В Замену").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_minus").setLabel("❌ Выйти").setStyle(ButtonStyle.Secondary)
        );
        return i.reply({ embeds: [buildCaptEmbed()], components: [row] });
      }

      if (cmd === 'повышение') {
        const embed = new EmbedBuilder().setTitle("⬆️ ПОВЫШЕНИЕ РАНГА META").setDescription("Выберите нужный ранг для повышения.").setImage(CONFIG.IMAGE).setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("RANKUP_INFO.1_to_2").setLabel("⬆️ 1 → 2 ранг").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("RANKUP_INFO.2_to_3").setLabel("⬆️ 2 → 3 ранг").setStyle(ButtonStyle.Success)
        );
        return i.reply({ embeds: [embed], components: [row] });
      }
    }

    if (i.isButton()) {
      const isAdminBtn = i.customId.startsWith("ADMWATCH.") || i.customId.startsWith("ADMFAM.") || i.customId.startsWith("ADMCALL.") || i.customId.startsWith("ADMNO.") || i.customId.startsWith("ADMTIER.") || i.customId.startsWith("RU_ACCEPT.") || i.customId.startsWith("RU_REJECT.") || i.customId.startsWith("RU_WATCH.");
      if (isAdminBtn && !CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r))) {
        return i.reply({ content: "❌ У вас нет прав.", ephemeral: true });
      }
    }

    if (i.isButton() && i.customId === "READ_BTN") {
      let content = i.message.content;
      if (!content.includes("\n\n**Прочитали:**")) content += "\n\n**Прочитали:**";
      if (!content.includes(`<@${i.user.id}>`)) {
         content += `\n- <@${i.user.id}>`;
         await i.message.edit({ content });
         return i.reply({ content: "✅ Отмечено!", ephemeral: true });
      } else { return i.reply({ content: "❌ Вы уже отметились!", ephemeral: true }); }
    }

    /* ===== СИСТЕМА ПОВЫШЕНИЙ ===== */
    if (i.isButton() && i.customId.startsWith("RANKUP_INFO.")) {
      const rank = i.customId.split(".")[1];
      const info = RANKUP_INFO[rank];
      const modal = new ModalBuilder().setCustomId(`RANKUP_MODAL.${rank}`).setTitle(info.title);
      for (const field of info.fields) {
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(field.id).setLabel(field.label).setStyle(field.style).setRequired(true)));
      }
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("RANKUP_MODAL.")) {
      const rank = i.customId.split(".")[1];
      const info = RANKUP_INFO[rank];
      const logCh = await i.guild.channels.fetch(CONFIG.RANKUP_LOG_CHANNEL).catch(() => null);
      if (!logCh) return i.reply({ content: "❌ Канал для логов повышения не найден.", ephemeral: true });

      const emb = new EmbedBuilder().setTitle(`⬆️ ЗАЯВКА НА ПОВЫШЕНИЕ (${info.title})`).setColor("Blue").addFields({ name: "👤 Игрок", value: `${i.user}` });
      for (const field of info.fields) { emb.addFields({ name: field.label, value: i.fields.getTextInputValue(field.id) }); }
      emb.addFields({ name: "📊 Статус", value: "⏳ На рассмотрении" }).setTimestamp();

      const uid = i.user.id;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`RU_WATCH.${uid}`).setLabel("👀 На проверку").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`RU_ACCEPT.${uid}.${rank}`).setLabel("✅ Одобрить").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`RU_REJECT.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );

      await logCh.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка на повышение успешно отправлена!", ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("RU_WATCH.")) {
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `👀 Проверяет: ${i.user.username}` } : f));
      return i.update({ embeds: [emb] });
    }

    if (i.isButton() && i.customId.startsWith("RU_ACCEPT.")) {
      const [, uid, rank] = i.customId.split(".");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        if (rank === "1_to_2") await target.roles.add(CONFIG.RANK_2_ROLE_ID).catch(()=>{});
        if (rank === "2_to_3") await target.roles.add(CONFIG.RANK_3_ROLE_ID).catch(()=>{});
        target.send(`🎉 Ваша заявка на **${RANKUP_INFO[rank].title}** одобрена!`).catch(()=>{});
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрил: ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    /* ОБЩИЙ ОТКАЗ (Для заявок, тиров и повышений) */
    if (i.isButton() && (i.customId.startsWith("ADMNO.") || i.customId.startsWith("RU_REJECT."))) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send("❌ Ваша заявка (на вступление / тир / повышение) была отклонена.").catch(()=>{});
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Red");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `❌ Отказал: ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    /* ===== СИСТЕМА ТИРОВ ===== */
    if (i.isButton() && i.customId.startsWith("TIER_INFO.")) {
      const n = i.customId.split(".")[1];
      const info = TIER_INFO[n];
      const embed = new EmbedBuilder().setTitle(`${info.emoji} ОЗНАКОМЛЕНИЕ — ${info.label}`).setDescription(info.description).setColor(info.color).addFields({ name: "📋 Требования", value: info.requirements.join("\n") });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`TIER_APPLY.${n}`).setLabel(`✅ Подать заявку на Tier ${n}`).setStyle(ButtonStyle.Primary));
      return i.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("TIER_APPLY.")) {
      const n = i.customId.split(".")[1];
      const hasTier3 = i.member.roles.cache.has(CAPT_CONFIG.TIERS["3"]);
      const hasTier2 = i.member.roles.cache.has(CAPT_CONFIG.TIERS["2"]);
      const hasTier1 = i.member.roles.cache.has(CAPT_CONFIG.TIERS["1"]);
      if (n === "2" && !hasTier3) return i.reply({ content: "❌ Нет Tier 3!", ephemeral: true });
      if (n === "1" && !hasTier2) return i.reply({ content: "❌ Нет Tier 2!", ephemeral: true });

      const modal = new ModalBuilder().setCustomId(`TIERM${n}`).setTitle(`Заявка на Tier ${n}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tnick").setLabel("Ваш ник и статик").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tkd").setLabel("Ваш КД").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tskills").setLabel("Скрины/Откаты").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tarena").setLabel("Арена/МП").setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && /^TIERM[123]$/.test(i.customId)) {
      const n = i.customId.replace("TIERM", "");
      const logCh = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      const emb = new EmbedBuilder().setTitle(`🎯 ЗАЯВКА НА TIER ${n}`).setColor(TIER_INFO[n].color)
        .addFields(
          { name: "👤 Отправитель", value: `${i.user}` },
          { name: "📝 Ник/Статик", value: i.fields.getTextInputValue("tnick") },
          { name: "📊 КД", value: i.fields.getTextInputValue("tkd") },
          { name: "🎬 Доказательства", value: i.fields.getTextInputValue("tskills") },
          { name: "🏟 Арена/МП", value: i.fields.getTextInputValue("tarena") },
          { name: "📊 Статус", value: "⏳ На рассмотрении" }
        ).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${i.user.id}`).setLabel("👀 Проверка").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMTIER.${i.user.id}.${n}`).setLabel(`✅ Одобрить Tier ${n}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${i.user.id}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      await logCh.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка на тир отправлена!", ephemeral: true });
    }

    /* ===== ЗАЯВКА В СЕМЬЮ ===== */
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("applyM").setTitle("Анкета в Meta Family");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a1").setLabel("Имя и возраст").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a2").setLabel("Ваш ник в игре").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a3").setLabel("Почему к нам / Причина ухода?").setStyle(TextInputStyle.Paragraph)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a4").setLabel("Были ли у вас баны?").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a5").setLabel("Откат спешик тяга (ссылка)").setStyle(TextInputStyle.Paragraph))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "applyM") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(() => null);
      const uid = i.user.id;
      const emb = new EmbedBuilder().setTitle("📩 НОВАЯ ЗАЯВКА В META").setColor("Red")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "📝 Имя/Возраст", value: i.fields.getTextInputValue("a1") },
          { name: "🎮 Ник", value: i.fields.getTextInputValue("a2") },
          { name: "❓ Почему к нам / Уход", value: i.fields.getTextInputValue("a3") },
          { name: "⚠️ Были ли баны?", value: i.fields.getTextInputValue("a4") },
          { name: "🔫 Откат спешик тяга", value: i.fields.getTextInputValue("a5") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять сразу").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMCALL.${uid}`).setLabel("📞 Вызвать на обзвон").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
      );
      if (log) await log.send({ content: `Заявка от <@${uid}>`, embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Анкета успешно отправлена!", ephemeral: true });
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
        if (CAPT_CONFIG.TIERS[tierNum]) await target.roles.add(CAPT_CONFIG.TIERS[tierNum]).catch(() => {});
        db.tierCooldowns[uid] = Date.now(); save();
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
        await target.roles.add(CONFIG.ROLE_MANDATORY_ID).catch(() => {}); 
        target.send("🎉 Вы приняты в семью **Meta**!").catch(() => {});
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]).setColor("Green");
      emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Принял: ${i.user.username}` } : f));
      return i.update({ embeds: [emb], components: [] });
    }

    if (i.isButton() && i.customId.startsWith("ADMCALL.")) {
      const uid = i.customId.split(".")[1];
      const menu = new StringSelectMenuBuilder().setCustomId(`CALL_CHAN_SEL.${uid}.${i.message.id}`).setPlaceholder("Выберите канал для обзвона")
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel("Голосовой канал 1").setValue("1520394576999747681"),
          new StringSelectMenuOptionBuilder().setLabel("Голосовой канал 2").setValue("1520394576999747680"),
          new StringSelectMenuOptionBuilder().setLabel("Голосовой канал 3").setValue("1520766809232506981"),
          new StringSelectMenuOptionBuilder().setLabel("Голосовой канал 4").setValue("1520766839687217263")
        ]);
      return i.reply({ content: "👉 Выберите голосовой канал:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }

    if (i.isStringSelectMenu() && i.customId.startsWith("CALL_CHAN_SEL.")) {
      const [, uid, mid] = i.customId.split(".");
      const voiceChannelId = i.values[0];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const origMsg = await i.channel.messages.fetch(mid).catch(() => null);

      await openInterviewChannels(i.guild, uid);
      if (target) target.send(`📞 Вас ожидают в голосовом канале: <#${voiceChannelId}>.`).catch(() => {});

      if (origMsg) {
        const emb = EmbedBuilder.from(origMsg.embeds[0]).setColor("Purple");
        emb.setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `📞 На обзвоне у ${i.user.username} (<#${voiceChannelId}>)` } : f));
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отказать").setStyle(ButtonStyle.Danger)
        );
        await origMsg.edit({ embeds: [emb], components: [row] }).catch(() => {});
      }
      return i.update({ content: `✅ Канал назначен.`, components: [] });
    }

    /* ===== AFK УПРАВЛЕНИЕ ===== */
    if (i.isButton() && i.customId === "afk_on") {
      const botHighestRole = i.guild.members.me.roles.highest;
      const rolesToRemove = i.member.roles.cache.filter(r => r.id !== i.guild.id && !r.managed && r.position < botHighestRole.position).map(r => r.id);
      afkdb.roles[i.user.id] = rolesToRemove; saveAfk();
      if (rolesToRemove.length > 0) await i.member.roles.remove(rolesToRemove).catch(() => {});
      await i.member.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
      return i.reply({ content: "🌙 Вы ушли в AFK. Ваши роли временно сняты.", ephemeral: true });
    }

    if (i.isButton() && i.customId === "afk_off") {
      const saved = afkdb.roles[i.user.id];
      if (!saved || !Array.isArray(saved)) return i.reply({ content: "❌ Вы не в AFK статусе.", ephemeral: true });
      await i.member.roles.add(saved).catch(() => {});
      await i.member.roles.remove(CONFIG.VACATION_ROLE).catch(() => {});
      delete afkdb.roles[i.user.id]; saveAfk();
      return i.reply({ content: "✅ С возвращением! Роли возвращены.", ephemeral: true });
    }

  } catch (e) { console.error("❌ Ошибка:", e); }
});

client.login(process.env.TOKEN);