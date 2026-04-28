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
 
/* ================= [ НАСТРОЙКИ ] ================= */
const NEW_IMAGE = "https://cdn.discordapp.com/attachments/1472664809400172648/1495428505628835910/2025-12-08_111532.png?ex=69ee1ed3&is=69eccd53&hm=b6fa875964d7610a821c10edc191bd30f081bddc73cbcfdb9af227251ff9bde6&";
 
const CONFIG = {
  COMMAND_CHANNEL_ID: "1497719409639297184",
  MAIN_LOG_CHANNEL: "1480227101905785113",
  ROLE_ACCEPTED_ID: "1479557914086740104",
  MEIN_ROLE_ID: "1480229891789160479",
  MEIN_PLUS_ROLE_ID: "1479574658935423087",
  AFK_LOG_CHANNEL: "1480228317222277171",
  VACATION_ROLE: "1479988454484869271",
  IMAGE: NEW_IMAGE,
  TIER_CHANNEL_ID: "1490912215341989978",
  TIER_IMAGE: NEW_IMAGE,
  REPORT_LOG_CHANNEL: "1498782688163790978",
 
  // Роли штрафов
  FINE_ROLE_1: "1479987457591218410",  // Штраф 1
  FINE_ROLE_2: "1479987547395325984",  // Штраф 2 / роль проверяющего
 
  ADMIN_ROLES: [
    "1479566887519129781",
    "1056945517835341936",
    "1338140038298341396",
    "1479566383003205663",
    "1479592954795655312"
  ]
};
 
const CAPT_CONFIG = {
  CHANNEL_ID: "1480474720683032660",
  IMAGE_URL: NEW_IMAGE,
  TIERS: {
    "1": "1479566016924221510",
    "2": "1479565407319883806",
    "3": "1479564709354016929"
  },
  OWNER_ID: "530064311310352415"
};
 
let currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };
const RANK_COSTS = { "3": 89, "4": 179 };
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
 
/* ================= [ СЛЭШ КОМАНДЫ ] ================= */
const commands = [
  new SlashCommandBuilder()
    .setName('новость')
    .setDescription('Разослать новость семье')
    .addStringOption(option => option.setName('текст').setDescription('Текст новости').setRequired(true)),
  new SlashCommandBuilder()
    .setName('тир')
    .setDescription('Панель получения тира'),
  new SlashCommandBuilder()
    .setName('give')
    .setDescription('Выдать баллы игроку')
    .addUserOption(option => option.setName('user').setDescription('Кому выдать баллы').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Количество баллов').setRequired(true)),
  new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Открыть систему баллов и повышения'),
  new SlashCommandBuilder()
    .setName('заявка')
    .setDescription('Открыть панель заявки в семью'),
  new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Управление статусом AFK и Отпуска'),
  new SlashCommandBuilder()
    .setName('startcapt')
    .setDescription('Начать сбор на капт'),
  new SlashCommandBuilder()
    .setName('капт')
    .setDescription('Оповещение участников о капте')
    .addStringOption(option => option.setName('time').setDescription('Время (через сколько сбор)').setRequired(false)),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Очистить сообщения в чате')
    .addIntegerOption(option => option.setName('amount').setDescription('Количество сообщений (от 1 до 100)').setRequired(true)),
  new SlashCommandBuilder()
    .setName('отчеты')
    .setDescription('Открыть панель еженедельного отчёта'),
];
 
/* ================= [ БАЗА ДАННЫХ ] ================= */
// Данные сохраняются в db.json и afkdb.json — НЕ теряются при обновлении кода!
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
 
const save = () => {
  try { fs.writeFileSync("db.json", JSON.stringify(db, null, 2)); }
  catch(e) { console.error("Ошибка сохранения db.json:", e); }
};
const saveAfk = () => {
  try { fs.writeFileSync("afkdb.json", JSON.stringify(afkdb, null, 2)); }
  catch(e) { console.error("Ошибка сохранения afkdb.json:", e); }
};
const addPoints = (id, amt) => { db.points[id] = (db.points[id] || 0) + amt; save(); };
const getPoints = (id) => db.points[id] || 0;
 
// Автосохранение каждые 5 минут
setInterval(() => { save(); saveAfk(); }, 5 * 60 * 1000);
// Сохранение при завершении
process.on('SIGINT', () => { save(); saveAfk(); process.exit(0); });
process.on('SIGTERM', () => { save(); saveAfk(); process.exit(0); });
 
/* ================= [ КЛИЕНТ ] ================= */
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
    const ch = await guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL);
    if (ch) ch.send(`⚠️ **ВНИМАНИЕ!** Игрок <@${member.id}> (${member.user.tag}) заблокировал бота или закрыл ЛС.`);
  } catch(e) {}
};
 
/* ================= [ ГОТОВНОСТЬ ] ================= */
client.once("ready", async () => {
  console.log(`Бот ${client.user.tag} готов!`);
  console.log(`Загружено баллов: ${Object.keys(db.points).length} игроков`);
  console.log(`Загружено AFK: ${Object.keys(afkdb.roles || {}).length} игроков`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(cmd => cmd.toJSON()) });
    console.log('Команды загружены.');
  } catch (error) {
    console.error('Ошибка при загрузке команд:', error);
  }
});
 
function buildCaptEmbed() {
  const fmt = (arr) => arr.length > 0 ? arr.map(id => `<@${id}>`).join('\n') : "Пусто";
  return new EmbedBuilder()
    .setTitle("⚔️ Война Семей (Капт)")
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
 
/* ================= [ ВЗАИМОДЕЙСТВИЯ ] ================= */
client.on("interactionCreate", async i => {
  try {
 
    /* ===== SLASH КОМАНДЫ ===== */
    if (i.isChatInputCommand()) {
      const cmd = i.commandName;
 
      if (cmd === 'clear') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const n = i.options.getInteger('amount');
        if (n < 1 || n > 100) return i.reply({ content: "❌ От 1 до 100.", ephemeral: true });
        await i.channel.bulkDelete(n, true).catch(e => console.error(e));
        return i.reply({ content: `✅ Удалено ${n} сообщений.`, ephemeral: true });
      }
 
      if (cmd === 'новость') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder().setTitle("📢 ВАЖНАЯ НОВОСТЬ СЕМЬИ").setDescription(text).setColor("Red").setImage(CONFIG.IMAGE).setTimestamp();
        await i.guild.members.fetch();
        const members = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        members.forEach(async m => { try { await m.send({ embeds: [embed] }); } catch { notifyBlocked(i.guild, m); } });
        return i.editReply(`✅ Рассылка начата. ~${members.size} пользователей`);
      }
 
      if (cmd === 'тир') {
        if (i.channelId !== CONFIG.TIER_CHANNEL_ID)
          return i.reply({ content: "❌ Только в канале для тира.", ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle("🎯 ПОЛУЧЕНИЕ ТИРА")
          .setDescription("Нажмите кнопку ниже, чтобы подать заявку.")
          .setImage(CONFIG.TIER_IMAGE)
          .setColor("#8A2BE2");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("TIERBTN").setLabel("Получить тир").setStyle(ButtonStyle.Primary)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Панель тира отправлена!", ephemeral: true });
      }
 
      if (cmd === 'give') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const user = i.options.getUser('user');
        const amt = i.options.getInteger('amount');
        addPoints(user.id, amt);
        return i.reply({ content: `✅ Выдано ${amt} 💎 игроку ${user}`, ephemeral: true });
      }
 
      if (cmd === 'menu') {
        const embed = new EmbedBuilder()
          .setTitle("💎 СИСТЕМА БАЛЛОВ И ПОВЫШЕНИЯ")
          .setDescription(`📜 **Цены:**\n🔹 2➔3 ранг: **${RANK_COSTS["3"]} 💎**\n🔹 3➔4 ранг: **${RANK_COSTS["4"]} 💎**`)
          .setImage(CONFIG.IMAGE).setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("earn_btn").setLabel("Заработать").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("balance_btn").setLabel("Баланс").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("rankup_btn").setLabel("Повыситься").setStyle(ButtonStyle.Success),
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ Меню отправлено!", ephemeral: true });
      }
 
      if (cmd === 'заявка') {
        if (i.channelId !== CONFIG.COMMAND_CHANNEL_ID)
          return i.reply({ content: "❌ Только в канале для заявок.", ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle("📝 ЗАЯВКА В СЕМЬЮ")
          .setDescription("Нажми на кнопку ниже, чтобы заполнить анкету.")
          .setImage(CONFIG.IMAGE).setColor("#ff0000");
        await i.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger)
        )] });
        return i.reply({ content: "✅ Панель заявки отправлена!", ephemeral: true });
      }
 
      if (cmd === 'afk') {
        const embed = new EmbedBuilder()
          .setTitle("💤 Управление AFK / Отпуск")
          .setDescription("🏖 **Отпуск** — подать заявку.\n🌙 **AFK** — временный уход.\n✅ **Выйти** — вернуть роли.")
          .setImage(CONFIG.IMAGE).setColor("#2f3136");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("afk_vacation").setLabel("🏖 Отпуск").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("afk_on").setLabel("🌙 AFK").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("afk_off").setLabel("✅ Выйти").setStyle(ButtonStyle.Success)
        );
        await i.channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: "✅ AFK панель отправлена!", ephemeral: true });
      }
 
      if (cmd === 'startcapt') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("capt_plus").setLabel("Плюс на капт").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_sub").setLabel("Плюс в замену").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_minus").setLabel("Отмена плюса").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("capt_force").setLabel("Вписать").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("capt_remove").setLabel("Удалить с капта").setStyle(ButtonStyle.Danger)
        );
        await i.channel.send({ embeds: [buildCaptEmbed()], components: [row] });
        return i.reply({ content: "✅ Сбор на капт запущен!", ephemeral: true });
      }
 
      if (cmd === 'капт') {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const time = i.options.getString('time') || "скоро";
        await i.guild.members.fetch();
        const members = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        const embed = new EmbedBuilder()
          .setTitle("🚨 ВНИМАНИЕ: КАПТ!")
          .setDescription(`Сбор через: **${time}**\nЗаходи в игру!`)
          .setImage(CAPT_CONFIG.IMAGE_URL).setColor("Red");
        members.forEach(async m => { try { await m.send({ embeds: [embed] }); } catch { notifyBlocked(i.guild, m); } });
        return i.editReply(`✅ Оповещено: ~${members.size}`);
      }
 
      if (cmd === 'отчеты') {
        const embed = new EmbedBuilder()
          .setTitle("📋 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ")
          .setDescription(
            "Нажмите кнопку ниже для отправки отчёта.\n\n" +
            "**Нужно заполнить:**\n" +
            "🔗 Ссылка на фото принятых\n" +
            "👤 Кого приняли в планшет\n" +
            "📅 Что сделали за 1 неделю"
          )
          .setImage(CONFIG.IMAGE).setColor("#5865F2").setTimestamp();
        await i.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("WREPORTBTN").setLabel("📋 Отправить отчёт").setStyle(ButtonStyle.Primary)
        )] });
        return i.reply({ content: "✅ Панель отчётов отправлена!", ephemeral: true });
      }
    }
 
    /* ===== ТИР — КНОПКА ===== */
    // customId = "TIERBTN" — без подчёркиваний, не конфликтует ни с чем
    if (i.isButton() && i.customId === "TIERBTN") {
      const sel = new StringSelectMenuBuilder()
        .setCustomId("TIERSEL")
        .setPlaceholder("На каком тире ты стреляешься?")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("Tier 1").setValue("T1").setDescription("Самый сильный"),
          new StringSelectMenuOptionBuilder().setLabel("Tier 2").setValue("T2").setDescription("Средний"),
          new StringSelectMenuOptionBuilder().setLabel("Tier 3").setValue("T3").setDescription("Начальный")
        );
      return i.reply({ content: "Выбери тир:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }
 
    // ТИР — выбор из select menu
    if (i.isStringSelectMenu() && i.customId === "TIERSEL") {
      const v = i.values[0]; // T1 / T2 / T3
      const n = v.replace("T", ""); // 1 / 2 / 3
      const modal = new ModalBuilder()
        .setCustomId(`TIERM${n}`) // TIERM1, TIERM2, TIERM3
        .setTitle(`Заявка на Tier ${n}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tnick").setLabel("Ник и Статик").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tskills").setLabel("Откат, Спешик / Тяга").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tsayga").setLabel("Сайга").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }
 
    // ТИР — обработка модалки, customId = TIERM1 / TIERM2 / TIERM3
    if (i.isModalSubmit() && /^TIERM[123]$/.test(i.customId)) {
      const n = i.customId.replace("TIERM", ""); // "1" "2" "3"
      const logCh = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder()
        .setTitle(`🎯 НОВАЯ ЗАЯВКА НА TIER ${n}`)
        .setColor("#8A2BE2")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "📝 Ник/Статик", value: i.fields.getTextInputValue("tnick") },
          { name: "🎬 Откат и Навыки", value: i.fields.getTextInputValue("tskills") },
          { name: "🔫 Сайга", value: i.fields.getTextInputValue("tsayga") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();
      const uid = i.user.id;
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMTIER.${uid}.${n}`).setLabel(`✅ Выдать Tier ${n}`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMTIER.${uid}.1`).setLabel("Tier 1").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ADMTIER.${uid}.2`).setLabel("Tier 2").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`ADMTIER.${uid}.3`).setLabel("Tier 3").setStyle(ButtonStyle.Primary)
      );
      await logCh.send({ embeds: [emb], components: [row1, row2] });
      return i.reply({ content: "✅ Заявка на тир отправлена руководству!", ephemeral: true });
    }
 
    /* ===== ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ — КНОПКА ===== */
    if (i.isButton() && i.customId === "WREPORTBTN") {
      const modal = new ModalBuilder().setCustomId("WREPORTM").setTitle("📋 Еженедельный отчёт");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("wrphoto").setLabel("🔗 Ссылка на фото принятых").setPlaceholder("Вставьте ссылку...").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("wraccepted").setLabel("👤 Кого приняли в планшет").setPlaceholder("Перечислите ники...").setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("wrdone").setLabel("📅 Что сделали за 1 неделю").setPlaceholder("Опишите деятельность...").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );
      return i.showModal(modal);
    }
 
    // ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ — обработка модалки
    if (i.isModalSubmit() && i.customId === "WREPORTM") {
      const photo = i.fields.getTextInputValue("wrphoto");
      const accepted = i.fields.getTextInputValue("wraccepted");
      const done = i.fields.getTextInputValue("wrdone");
      const repCh = await i.guild.channels.fetch(CONFIG.REPORT_LOG_CHANNEL).catch(() => null);
      if (!repCh) return i.reply({ content: "❌ Канал для отчётов не найден.", ephemeral: true });
      const date = new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
      const uid = i.user.id;
      const emb = new EmbedBuilder()
        .setTitle("📋 ЕЖЕНЕДЕЛЬНЫЙ ОТЧЁТ")
        .setColor("#5865F2")
        .addFields(
          { name: "👤 Автор", value: `${i.user} (${i.user.tag})` },
          { name: "📅 Дата", value: date },
          { name: "🔗 Фото принятых", value: photo },
          { name: "👥 Кого приняли в планшет", value: accepted },
          { name: "✅ Что сделали за неделю", value: done },
          { name: "📊 Статус", value: "⏳ Ожидание проверки" }
        ).setTimestamp().setFooter({ text: `ID: ${uid}` });
 
      // 5 кнопок управления отчётом
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`WRWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`WROK.${uid}`).setLabel("✅ Отчёт принят").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`WRMISS.${uid}`).setLabel("❌ Не сделал отчёт").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`WRFINE1.${uid}`).setLabel("⚠️ Штраф 1").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`WRFINE2.${uid}`).setLabel("🚨 Штраф 2").setStyle(ButtonStyle.Danger)
      );
      await repCh.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Ваш отчёт отправлен!", ephemeral: true });
    }
 
    /* ===== КНОПКИ УПРАВЛЕНИЯ ОТЧЁТОМ ===== */
    if (i.isButton() && i.customId.startsWith("WRWATCH.")) {
      const uid = i.customId.split(".")[1];
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Blue").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `👀 Проверяет ${i.user.username}` } : f));
      // Выдать роль проверяющего тому кто нажал
      try { await i.member.roles.add(CONFIG.FINE_ROLE_2).catch(() => {}); } catch(e) {}
      return i.update({ embeds: [emb] });
    }
 
    if (i.isButton() && i.customId.startsWith("WROK.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send("✅ Ваш еженедельный отчёт принят!").catch(() => {});
      try { await i.member.roles.remove(CONFIG.FINE_ROLE_2).catch(() => {}); } catch(e) {}
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Green").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Принят (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    if (i.isButton() && i.customId.startsWith("WRMISS.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send("❌ Вы не сдали еженедельный отчёт!").catch(() => {});
      try { await i.member.roles.remove(CONFIG.FINE_ROLE_2).catch(() => {}); } catch(e) {}
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Red").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `❌ Отчёт не сдан (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    if (i.isButton() && i.customId.startsWith("WRFINE1.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        await target.roles.add(CONFIG.FINE_ROLE_1).catch(() => {});
        target.send("⚠️ Вам выдан **Штраф 1**.").catch(() => {});
      }
      try { await i.member.roles.remove(CONFIG.FINE_ROLE_2).catch(() => {}); } catch(e) {}
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Orange").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `⚠️ Штраф 1 выдан (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    if (i.isButton() && i.customId.startsWith("WRFINE2.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        await target.roles.add(CONFIG.FINE_ROLE_2).catch(() => {});
        target.send("🚨 Вам выдан **Штраф 2**.").catch(() => {});
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("DarkRed").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `🚨 Штраф 2 выдан (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    /* ===== АДМИН-КНОПКИ (через точку как разделитель) ===== */
    // ADMWATCH.uid
    if (i.isButton() && i.customId.startsWith("ADMWATCH.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send("👀 Твоя заявка взята на рассмотрение!").catch(() => notifyBlocked(i.guild, target));
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Blue").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `👀 Проверяет ${i.user.username}` } : f));
      return i.update({ embeds: [emb] });
    }
 
    // ADMTIER.uid.tierNum
    if (i.isButton() && i.customId.startsWith("ADMTIER.")) {
      const parts = i.customId.split(".");
      const uid = parts[1];
      const tierNum = parts[2];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        await target.roles.remove(Object.values(CAPT_CONFIG.TIERS)).catch(() => {});
        const roleId = CAPT_CONFIG.TIERS[tierNum];
        if (roleId) await target.roles.add(roleId).catch(() => {});
        target.send(`🎯 Тебе выдан **Tier ${tierNum}**!`).catch(() => notifyBlocked(i.guild, target));
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Green").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Tier ${tierNum} выдан (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    // ADMPTS.uid.pts
    if (i.isButton() && i.customId.startsWith("ADMPTS.")) {
      const parts = i.customId.split(".");
      const uid = parts[1];
      const pts = parseInt(parts[2]);
      addPoints(uid, pts);
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) target.send(`✅ Отчет принят! +**${pts}** 💎`).catch(() => notifyBlocked(i.guild, target));
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Green").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрено (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    // ADMRANK.uid.rank.cost
    if (i.isButton() && i.customId.startsWith("ADMRANK.")) {
      const parts = i.customId.split(".");
      const uid = parts[1]; const rank = parts[2]; const cost = parseInt(parts[3]);
      addPoints(uid, -cost);
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        if (rank === "3") await target.roles.add(CONFIG.MEIN_ROLE_ID).catch(() => {});
        if (rank === "4") await target.roles.add(CONFIG.MEIN_PLUS_ROLE_ID).catch(() => {});
        target.send(`🎉 Поздравляем с повышением до **${rank}** ранга!`).catch(() => notifyBlocked(i.guild, target));
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Green").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрено (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    // ADMFAM.uid
    if (i.isButton() && i.customId.startsWith("ADMFAM.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        await target.roles.add(CONFIG.ROLE_ACCEPTED_ID).catch(() => {});
        target.send("🎉 Ты принят в семью!").catch(() => notifyBlocked(i.guild, target));
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Green").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Принят (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    // ADMVAC.uid
    if (i.isButton() && i.customId.startsWith("ADMVAC.")) {
      const uid = i.customId.split(".")[1];
      const target = await i.guild.members.fetch(uid).catch(() => null);
      if (target) {
        const rs = target.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
        afkdb.roles[uid] = rs; saveAfk();
        for (const r of rs) await target.roles.remove(r).catch(() => {});
        await target.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
        target.send("🏖 Твой отпуск одобрен!").catch(() => notifyBlocked(i.guild, target));
      }
      const emb = EmbedBuilder.from(i.message.embeds[0]);
      emb.setColor("Green").setFields(emb.data.fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `✅ Одобрено (${i.user.username})` } : f));
      return i.update({ embeds: [emb], components: [] });
    }
 
    // ADMNO.uid — показ модалки с причиной отказа
    if (i.isButton() && i.customId.startsWith("ADMNO.")) {
      const uid = i.customId.split(".")[1];
      const modal = new ModalBuilder().setCustomId(`REJM.${uid}.${i.message.id}`).setTitle("Причина отказа");
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("reason").setLabel("Укажите причину").setStyle(TextInputStyle.Paragraph).setRequired(true)
      ));
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId.startsWith("REJM.")) {
      const parts = i.customId.split(".");
      const uid = parts[1]; const mid = parts[2];
      const reason = i.fields.getTextInputValue("reason");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const msg = await i.channel.messages.fetch(mid).catch(() => null);
      if (msg) {
        const emb = EmbedBuilder.from(msg.embeds[0]).setColor("Red");
        emb.setFields(msg.embeds[0].fields.map(f => f.name === "📊 Статус" ? { name: "📊 Статус", value: `❌ Отказано: ${reason} (${i.user.username})` } : f));
        await msg.edit({ embeds: [emb], components: [] });
      }
      if (target) target.send(`❌ Заявка отклонена. Причина: ${reason}`).catch(() => notifyBlocked(i.guild, target));
      return i.reply({ content: "Статус обновлён: Отказано.", ephemeral: true });
    }
 
    /* ===== КАПТЫ ===== */
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
 
    if (i.isButton() && i.customId === "capt_remove") {
      if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
        return i.reply({ content: "❌ Нет прав.", ephemeral: true });
      const modal = new ModalBuilder().setCustomId("captremoveM").setTitle("Удалить с капта");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tid").setLabel("Discord ID").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("treason").setLabel("Причина").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }
 
    if (i.isButton() && i.customId.startsWith("capt_")) {
      if (i.customId !== "capt_force" && !i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID))
        return i.reply({ content: "❌ Вы не в семье!", ephemeral: true });
      const uid = i.user.id;
      if (i.customId === "capt_plus") { rmCapt(uid); const t = getTier(i.member); if (!currentCapt[t].includes(uid)) currentCapt[t].push(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_sub") { rmCapt(uid); if (!currentCapt.subs.includes(uid)) currentCapt.subs.push(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_minus") { rmCapt(uid); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_force") {
        if (!CONFIG.ADMIN_ROLES.some(r => i.member.roles.cache.has(r)))
          return i.reply({ content: "❌ Нет прав.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("captforceM").setTitle("Вписать участника");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("tid").setLabel("Discord ID").setStyle(TextInputStyle.Short).setRequired(true)));
        return i.showModal(modal);
      }
    }
 
    if (i.isModalSubmit() && i.customId === "captforceM") {
      const tid = i.fields.getTextInputValue("tid");
      try {
        const tm = await i.guild.members.fetch(tid);
        rmCapt(tid);
        const t = getTier(tm);
        if (!currentCapt[t].includes(tid)) currentCapt[t].push(tid);
        await i.message.edit({ embeds: [buildCaptEmbed()] });
        return i.reply({ content: "✅ Вписан!", ephemeral: true });
      } catch { return i.reply({ content: "❌ ID не найден.", ephemeral: true }); }
    }
 
    if (i.isModalSubmit() && i.customId === "captremoveM") {
      const tid = i.fields.getTextInputValue("tid");
      const reason = i.fields.getTextInputValue("treason");
      rmCapt(tid);
      await i.message.edit({ embeds: [buildCaptEmbed()] });
      return i.reply({ content: `🧹 <@${tid}> удалён. Причина: ${reason}`, ephemeral: true });
    }
 
    /* ===== БАЛЛЫ ===== */
    if (i.isButton() && i.customId === "earn_btn") {
      const sel = new StringSelectMenuBuilder().setCustomId("earnsel").setPlaceholder("Что ты сделал?");
      EARN_OPTIONS.forEach(o => sel.addOptions(new StringSelectMenuOptionBuilder().setLabel(o.label).setValue(o.value)));
      return i.reply({ content: "Выбери:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }
 
    if (i.isStringSelectMenu() && i.customId === "earnsel") {
      const modal = new ModalBuilder().setCustomId(`EARN.${i.values[0]}`).setTitle("Отчет");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e1").setLabel("Ник/статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e2").setLabel("Доказательства").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId.startsWith("EARN.")) {
      const key = i.customId.replace("EARN.", "");
      const task = EARN_OPTIONS.find(o => o.value === key);
      const pts = key.split("_")[1];
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const uid = i.user.id;
      const emb = new EmbedBuilder().setTitle("💰 ОТЧЕТ НА БАЛЛЫ").setColor("Yellow")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "🛠 Работа", value: task.label },
          { name: "📝 Инфо", value: i.fields.getTextInputValue("e1") },
          { name: "🔗 Доказательства", value: i.fields.getTextInputValue("e2") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMPTS.${uid}.${pts}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Отчет отправлен!", ephemeral: true });
    }
 
    /* ===== АНКЕТА ===== */
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("applyM").setTitle("Анкета в семью");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a1").setLabel("1. Ник, Возраст, Статик").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a2").setLabel("2. Откат, Спешик / Тяга").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a3").setLabel("3. Откуда узнал о семье?").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a4").setLabel("4. Средний онлайн").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId === "applyM") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const uid = i.user.id;
      const emb = new EmbedBuilder().setTitle("📩 НОВАЯ ЗАЯВКА").setColor("#ff0000")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "📝 Ник / Возраст / Статик", value: i.fields.getTextInputValue("a1") },
          { name: "🎬 Откат и Навыки", value: i.fields.getTextInputValue("a2") },
          { name: "🌍 Откуда узнал", value: i.fields.getTextInputValue("a3") },
          { name: "🕒 Онлайн", value: i.fields.getTextInputValue("a4") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMFAM.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка отправлена!", ephemeral: true });
    }
 
    /* ===== ПОВЫШЕНИЕ ===== */
    if (i.isButton() && i.customId === "rankup_btn") {
      const modal = new ModalBuilder().setCustomId("rankupM").setTitle("Повышение");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r1").setLabel("Ник/статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r2").setLabel("Видео").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r3").setLabel("Ранг (3/4)").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId === "rankupM") {
      const r = i.fields.getTextInputValue("r3");
      const c = RANK_COSTS[r];
      if (!c || getPoints(i.user.id) < c) return i.reply({ content: `❌ Недостаточно баллов. Нужно: ${c || "?"} 💎`, ephemeral: true });
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const uid = i.user.id;
      const emb = new EmbedBuilder().setTitle("📈 ПОВЫШЕНИЕ").setColor("Green")
        .addFields(
          { name: "👤", value: `${i.user}` },
          { name: "🎖 Ранг", value: r },
          { name: "🎬 Видео", value: i.fields.getTextInputValue("r2") },
          { name: "📊 Статус", value: "⏳ Ожидание" }
        ).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ADMRANK.${uid}.${r}.${c}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Отправлено!", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "balance_btn")
      return i.reply({ content: `💎 Баланс: **${getPoints(i.user.id)}**`, ephemeral: true });
 
    /* ===== AFK / ОТПУСК ===== */
    if (i.isButton() && i.customId === "afk_vacation") {
      const modal = new ModalBuilder().setCustomId("vacM").setTitle("Отпуск");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("v1").setLabel("Даты").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("v2").setLabel("Причина").setStyle(TextInputStyle.Paragraph))
      );
      return i.showModal(modal);
    }
 
    if (i.isModalSubmit() && i.customId === "vacM") {
      const log = await i.guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL).catch(() => null);
      if (log) {
        const uid = i.user.id;
        const emb = new EmbedBuilder().setTitle("🏖 ОТПУСК").setColor("Orange")
          .addFields(
            { name: "👤", value: `${i.user}` },
            { name: "📅 Даты", value: i.fields.getTextInputValue("v1") },
            { name: "📝 Причина", value: i.fields.getTextInputValue("v2") },
            { name: "📊 Статус", value: "⏳ Ожидание" }
          ).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`ADMWATCH.${uid}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`ADMVAC.${uid}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`ADMNO.${uid}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
        );
        await log.send({ embeds: [emb], components: [row] });
      }
      return i.reply({ content: "🏖 Отправлено!", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "afk_on") {
      const rs = i.member.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
      afkdb.roles[i.user.id] = rs; saveAfk();
      for (const r of rs) await i.member.roles.remove(r).catch(() => {});
      await i.member.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
      return i.reply({ content: "🌙 AFK включён.", ephemeral: true });
    }
 
    if (i.isButton() && i.customId === "afk_off") {
      const s = afkdb.roles[i.user.id];
      if (!s) return i.reply({ content: "❌ Вы не в AFK.", ephemeral: true });
      for (const r of s) await i.member.roles.add(r).catch(() => {});
      await i.member.roles.remove(CONFIG.VACATION_ROLE).catch(() => {});
      delete afkdb.roles[i.user.id]; saveAfk();
      return i.reply({ content: "✅ С возвращением!", ephemeral: true });
    }
 
  } catch (e) {
    console.error("Ошибка взаимодействия:", e);
    if (!i.replied && !i.deferred)
      await i.reply({ content: "❌ Произошла ошибка. Попробуй ещё раз.", ephemeral: true }).catch(() => {});
  }
});
 
client.login(process.env.TOKEN);
