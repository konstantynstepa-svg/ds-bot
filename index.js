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
  ThreadAutoArchiveDuration,
  SlashCommandBuilder
} = require("discord.js");
const fs = require("fs");

/* ================= [ НАСТРОЙКИ ] ================= */
// Твоя новая картинка
const NEW_IMAGE_URL = "https://cdn.discordapp.com/attachments/1472664809400172648/1495428505628835910/2025-12-08_111532.png?ex=69ee1ed3&is=69eccd53&hm=b6fa875964d7610a821c10edc191bd30f081bddc73cbcfdb9af227251ff9bde6&";

const CONFIG = {
  COMMAND_CHANNEL_ID: "1480220429988659251", 
  MAIN_LOG_CHANNEL: "1480227101905785113",    
  ROLE_ACCEPTED_ID: "1479557914086740104",   
  ROLE_LEADER_ID: "1056945517835341936",     
  MEIN_ROLE_ID: "1480229891789160479",       
  MEIN_PLUS_ROLE_ID: "1479574658935423087",  
  AFK_LOG_CHANNEL: "1480228317222277171",    
  VACATION_ROLE: "1479988454484869271",      
  IMAGE: NEW_IMAGE_URL,
  TIER_CHANNEL_ID: "1490912215341989978", 
  TIER_IMAGE: NEW_IMAGE_URL 
};

// === НАСТРОЙКИ ДЛЯ КАПТОВ ===
const CAPT_CONFIG = {
  CHANNEL_ID: "1480474720683032660", 
  IMAGE_URL: NEW_IMAGE_URL,
  TIERS: {
    "1": "1479566016924221510",
    "2": "1479565407319883806",
    "3": "1479564709354016929"
  },
  MANAGEMENT_ROLES: [
    "1056945517835341936",
    "1479566887519129781",
    "1479566383003205663",
    "1479592954795655312",
    "1480694256736669806"
  ],
  REMOVE_ROLES: [
    "1056945517835341936",
    "1479566887519129781",
    "1479592954795655312"
  ],
  OWNER_ID: "530064311310352415" // ID Kenzo
};

// === НАСТРОЙКИ ДЛЯ ВАРНОВ И ОБЖАЛОВАНИЙ ===
const WARN_CONFIG = {
  WARN_CMD_CHANNEL: "1480226568449036390",  
  WORK_CHANNEL: "1480226737718558805",      
  IMAGE_URL: NEW_IMAGE_URL,
  WARN_GIFS: [
    "https://media1.tenor.com/m/8YvUv1oHupcAAAAC/warning-error.gif",
    "https://media1.tenor.com/m/lXkEtyd1i7QAAAAC/alert-siren.gif",
    "https://media1.tenor.com/m/p13Qp7mKkFEAAAAd/warning-flashing.gif",
    "https://media1.tenor.com/m/xR3q2m_iT3QAAAAC/police-siren.gif"
  ],
  MANAGEMENT_ROLES: [
    "1056945517835341936",
    "1479566887519129781",
    "1480694180538744912",
    "1479566383003205663",
    "1480694256736669806"
  ],
  WARN_ROLE_1: "1479987457591218410", 
  WARN_ROLE_2: "1479987547395325984", 
  REMOVE_COST: 50,           
  BRIBE_COST: 10,            
  COOLDOWN_MS: 48 * 60 * 60 * 1000 
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

/* ================= [ БАЗЫ ДАННЫХ ] ================= */
let db = { points: {}, warnCooldowns: {}, activeWarns: {} }; 
if (fs.existsSync("db.json")) db = Object.assign({ points: {}, warnCooldowns: {}, activeWarns: {} }, JSON.parse(fs.readFileSync("db.json")));
let afkdb = { roles: {} };
if (fs.existsSync("afkdb.json")) afkdb = JSON.parse(fs.readFileSync("afkdb.json"));

const save = () => fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
const saveAfk = () => fs.writeFileSync("afkdb.json", JSON.stringify(afkdb, null, 2));
const addPoints = (id, amt) => { db.points[id] = (db.points[id] || 0) + amt; save(); };
const getPoints = (id) => db.points[id] || 0;
const setWarnCooldown = (id) => { db.warnCooldowns[id] = Date.now() + WARN_CONFIG.COOLDOWN_MS; save(); };
const getWarnCooldown = (id) => db.warnCooldowns[id] || 0;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.GuildMembers
  ],
});

// АНТИ-БЛОК
const notifyBlocked = async (guild, member) => {
  try {
      const ch = await guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL);
      if (ch) ch.send(`⚠️ **ВНИМАНИЕ!** Игрок <@${member.id}> (${member.user.tag}) заблокировал бота или закрыл ЛС. Сообщение не доставлено!`);
  } catch(e) {}
};

// Функция удаления сообщения отработки варна
const removeWarnMessage = async (guild, uid) => {
  const warnData = db.activeWarns[uid];
  if (warnData && warnData.warnMsgId) {
    try {
      const workCh = await guild.channels.fetch(WARN_CONFIG.WORK_CHANNEL);
      if (workCh) {
        const wMsg = await workCh.messages.fetch(warnData.warnMsgId);
        if (wMsg) await wMsg.delete();
      }
    } catch(e) { console.error("Не удалось удалить сообщение варна", e); }
  }
};

/* ================= [ СТАРТ И СЛЭШ-КОМАНДЫ ] ================= */
client.once("ready", async () => {
  console.log(`🚀 Бот ${client.user.tag} готов! Логи -> ${CONFIG.MAIN_LOG_CHANNEL}`);

  // Регистрация слэш-команд
  const slashCommands = [
    new SlashCommandBuilder()
        .setName('новость')
        .setDescription('Разослать важную новость всем участникам семьи')
        .addStringOption(option => option.setName('текст').setDescription('Текст новости').setRequired(true)),
    new SlashCommandBuilder().setName('тир').setDescription('Вызов панели получения тира'),
    new SlashCommandBuilder()
        .setName('give')
        .setDescription('Выдать баллы игроку')
        .addUserOption(option => option.setName('пользователь').setDescription('Кому выдать').setRequired(true))
        .addIntegerOption(option => option.setName('сумма').setDescription('Количество баллов').setRequired(true)),
    new SlashCommandBuilder().setName('меню').setDescription('Вызов меню системы баллов и повышения'),
    new SlashCommandBuilder().setName('заявка').setDescription('Панель подачи заявки в семью'),
    new SlashCommandBuilder().setName('afk').setDescription('Управление статусом AFK и отпуском'),
    new SlashCommandBuilder().setName('startcapt').setDescription('Создать панель сбора на капт'),
    new SlashCommandBuilder()
        .setName('капт')
        .setDescription('Разослать уведомление о капте в ЛС')
        .addStringOption(option => option.setName('время').setDescription('Через сколько капт? (например: 15 минут)').setRequired(false)),
    new SlashCommandBuilder().setName('варн').setDescription('Панель управления варнами'),
    new SlashCommandBuilder().setName('обж').setDescription('Панель обжалования варна')
  ].map(command => command.toJSON());

  const guild = client.guilds.cache.first();
  if (guild) {
      await guild.commands.set(slashCommands);
      console.log(`✅ Слэш-команды успешно зарегистрированы на сервере: ${guild.name}`);
  }

  // Таймеры для варнов
  setInterval(async () => {
    const now = Date.now();
    for (const [uid, warnData] of Object.entries(db.activeWarns)) {
      if (warnData.level === 'pending_kick') continue;

      const guild = client.guilds.cache.first();
      if (!guild) continue;
      const member = await guild.members.fetch(uid).catch(() => null);
      if (!member) continue; 

      if (member.roles.cache.has(CONFIG.VACATION_ROLE)) continue;

      const elapsed = now - warnData.timestamp;

      if (warnData.level === 1) {
        if (elapsed >= 46 * 60 * 60 * 1000 && !warnData.notified) {
          warnData.notified = true; save();
          member.send("⏳ **Внимание!** У тебя осталось всего 2 часа, чтобы снять первый варн!").catch(() => notifyBlocked(guild, member));
        }
        if (elapsed >= 48 * 60 * 60 * 1000) {
          warnData.level = 2;
          warnData.timestamp = now;
          warnData.notified = false;
          save();
          await member.roles.add(WARN_CONFIG.WARN_ROLE_2).catch(()=>{});
          member.send("🚨 **Ты проигнорировал снятие варна!** Тебе выдан 2-й Варн. У тебя есть еще 48 часов, иначе ты будешь исключен.").catch(() => notifyBlocked(guild, member));
        }
      } else if (warnData.level === 2) {
        if (elapsed >= 48 * 60 * 60 * 1000) {
          warnData.level = 'pending_kick'; save();
          const logCh = await guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL).catch(()=>null);
          if (logCh) {
            const emb = new EmbedBuilder()
              .setTitle("⚠️ ТРЕБУЕТСЯ КИК ИГРОКА")
              .setDescription(`Игрок <@${uid}> проигнорировал 2 варна подряд и время вышло. Решайте его судьбу.`)
              .setColor("Red");
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`kick_ok_${uid}`).setLabel("✅ Принять (Кикнуть)").setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId(`kick_no_${uid}`).setLabel("❌ Отключить (Снять варны)").setStyle(ButtonStyle.Secondary)
            );
            logCh.send({ embeds: [emb], components: [row] });
          }
        }
      }
    }
  }, 5 * 60 * 1000);
});

function buildCaptEmbed() {
  const formatList = (arr) => arr.length > 0 ? arr.map(id => `<@${id}>`).join('\n') : "Пусто";
  return new EmbedBuilder()
    .setTitle("⚔️ Война Семей (Капт)")
    .setDescription("Нажмите кнопку ниже, чтобы записаться на капт.")
    .setColor("#2b2d31")
    .setImage(CAPT_CONFIG.IMAGE_URL) 
    .addFields(
      { name: `Tier 1: (${currentCapt.tier1.length})`, value: formatList(currentCapt.tier1), inline: true },
      { name: `Tier 2: (${currentCapt.tier2.length})`, value: formatList(currentCapt.tier2), inline: true },
      { name: `Tier 3: (${currentCapt.tier3.length})`, value: formatList(currentCapt.tier3), inline: true },
      { name: `Замены: (${currentCapt.subs.length})`, value: formatList(currentCapt.subs), inline: false }
    );
}

/* ================= [ ВЗАИМОДЕЙСТВИЯ (Команды + Кнопки + Модалки) ] ================= */
client.on("interactionCreate", async i => {
  try {
    // === ОБРАБОТКА СЛЭШ КОМАНД ===
    if (i.isChatInputCommand()) {
      const cmd = i.commandName;

      // /новость
      if (cmd === "новость") {
        if (!i.member.roles.cache.has(CONFIG.ROLE_LEADER_ID) && !CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r))) {
          return i.reply({ content: "❌ Нет прав для рассылки новостей.", ephemeral: true });
        }
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder().setTitle("📢 ВАЖНАЯ НОВОСТЬ СЕМЬИ").setDescription(text).setColor("Red").setImage(CONFIG.IMAGE).setTimestamp();
        await i.guild.members.fetch();
        const membersToAlert = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        
        await i.reply({ content: `🚀 Начинаю рассылку новости ${membersToAlert.size} участникам...`, ephemeral: true });
        membersToAlert.forEach(async (member) => { 
          try { await member.send({ embeds: [embed] }); } 
          catch (err) { notifyBlocked(i.guild, member); } 
        });
        return;
      }

      // /тир
      if (cmd === "тир") {
        if (i.channel.id !== CONFIG.TIER_CHANNEL_ID) return i.reply({ content: "❌ Эту команду нужно использовать в канале для получения тира.", ephemeral: true });
        const embed = new EmbedBuilder()
            .setTitle("🎯 ПОЛУЧЕНИЕ ТИРА")
            .setDescription("Нажмите кнопку ниже, чтобы подать заявку на получение тира.")
            .setImage(CONFIG.TIER_IMAGE)
            .setColor("#8A2BE2");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("tier_start_btn").setLabel("Получить тир").setStyle(ButtonStyle.Primary));
        return i.reply({ embeds: [embed], components: [row] });
      }

      // /give
      if (cmd === "give") {
        if (!i.member.roles.cache.has(CONFIG.ROLE_LEADER_ID)) return i.reply({ content: "❌ Нет прав", ephemeral: true });
        const user = i.options.getUser('пользователь');
        const amount = i.options.getInteger('сумма');
        addPoints(user.id, amount);
        return i.reply({ content: `✅ Выдано ${amount} 💎 игроку ${user}`, ephemeral: true });
      }

      // /меню
      if (cmd === "меню") {
        const embed = new EmbedBuilder()
          .setTitle("💎 СИСТЕМА БАЛЛОВ И ПОВЫШЕНИЯ")
          .setDescription(`📜 **Цены на повышение:**\n🔹 2 ➔ 3 ранг: **${RANK_COSTS["3"]} 💎**\n🔹 3 ➔ 4 ранг: **${RANK_COSTS["4"]} 💎**`)
          .setImage(CONFIG.IMAGE)
          .setColor("#00d4ff");
          
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("earn_btn").setLabel("Заработать").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("balance_btn").setLabel("Баланс").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("rankup_btn").setLabel("Повыситься").setStyle(ButtonStyle.Success),
        );
        return i.reply({ embeds: [embed], components: [row] });
      }

      // /заявка
      if (cmd === "заявка") {
        if (i.channel.id !== CONFIG.COMMAND_CHANNEL_ID) return i.reply({ content: "❌ Используй в специальном канале.", ephemeral: true });
        const embed = new EmbedBuilder()
            .setTitle("📝 ЗАЯВКА В СЕМЬЮ")
            .setDescription("Нажми на кнопку ниже, чтобы заполнить анкету.")
            .setImage(CONFIG.IMAGE)
            .setColor("#ff0000");
        const btn = new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger);
        return i.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
      }

      // /afk
      if (cmd === "afk") {
        const afkEmbed = new EmbedBuilder()
          .setTitle("💤 Управление статусом AFK / Отпуск")
          .setDescription("Выберите нужное действие:\n\n" +
                          "🏖 **Отпуск** — подать заявку.\n" +
                          "🌙 **AFK** — временный уход.\n" +
                          "✅ **Выйти** — вернуть свои роли.")
          .setImage(CONFIG.IMAGE)
          .setColor("#2f3136");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("afk_vacation").setLabel("🏖 Отпуск").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("afk_on").setLabel("🌙 AFK").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("afk_off").setLabel("✅ Выйти").setStyle(ButtonStyle.Success)
        );
        return i.reply({ embeds: [afkEmbed], components: [row] });
      }

      // /startcapt
      if (cmd === "startcapt") {
        const hasMgmtRole = CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r));
        if (!hasMgmtRole) return i.reply({ content: "❌ У вас нет прав для создания сбора на капт.", ephemeral: true });
        currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("capt_plus").setLabel("Плюс на капт").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_sub").setLabel("Плюс в замену").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("capt_minus").setLabel("Отмена плюса").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("capt_force").setLabel("Вписать").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("capt_remove").setLabel("Удалить с капта").setStyle(ButtonStyle.Danger)
        );
        return i.reply({ embeds: [buildCaptEmbed()], components: [row] });
      }

      // /капт
      if (cmd === "капт") {
        const hasMgmtRole = CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r));
        if (!hasMgmtRole) return i.reply({ content: "❌ Нет прав.", ephemeral: true }); 
        
        const time = i.options.getString('время') || "скоро";
        await i.guild.members.fetch();
        const membersToAlert = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        const alertEmbed = new EmbedBuilder().setTitle("🚨 ВНИМАНИЕ: КАПТ!").setDescription(`Сбор в войсе через: **${time}**\nЗаходи в игру!`).setImage(CAPT_CONFIG.IMAGE_URL).setColor("Red");
        
        await i.reply({ content: `✅ Начинаю рассылку. Оповещено пользователей: ~${membersToAlert.size}`, ephemeral: true });
        
        membersToAlert.forEach(async (member) => { 
            try { await member.send({ embeds: [alertEmbed] }); } 
            catch (err) { notifyBlocked(i.guild, member); } 
        });
        return;
      }

      // /варн
      if (cmd === "варн") {
        const hasMgmtRole = WARN_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r));
        if (!hasMgmtRole) return i.reply({ content: "❌ У вас нет прав для управления варнами.", ephemeral: true });
        const embed = new EmbedBuilder().setTitle("⚠️ Панель управления Варнами").setDescription("Нажмите кнопку ниже, чтобы выписать игроку варн.").setImage(WARN_CONFIG.IMAGE_URL).setColor("DarkRed");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("warn_issue_btn").setLabel("Выдать варн").setStyle(ButtonStyle.Danger));
        return i.reply({ embeds: [embed], components: [row] });
      }

      // /обж
      if (cmd === "обж") {
        const embed = new EmbedBuilder()
          .setTitle("⚖️ ОБЖАЛОВАНИЕ ВАРНА")
          .setDescription("Если вы считаете, что вам выдали варн не по правилам или по ошибке, нажмите на кнопку ниже и заполните форму.")
          .setImage(WARN_CONFIG.IMAGE_URL)
          .setColor("Orange");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("appeal_start_btn").setLabel("Подать обжалование").setStyle(ButtonStyle.Primary));
        return i.reply({ embeds: [embed], components: [row] });
      }
    }


    // === ЗАЯВКА НА ТИР ===
    if (i.isButton() && i.customId === "tier_start_btn") {
      const sel = new StringSelectMenuBuilder().setCustomId("tier_select_lvl").setPlaceholder("На каком тире ты стреляешься?");
      sel.addOptions(
        new StringSelectMenuOptionBuilder().setLabel("Tier 1").setValue("1").setDescription("Самый сильный"),
        new StringSelectMenuOptionBuilder().setLabel("Tier 2").setValue("2").setDescription("Средний"),
        new StringSelectMenuOptionBuilder().setLabel("Tier 3").setValue("3").setDescription("Начальный")
      );
      return i.reply({ content: "Выбери тир:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }

    if (i.isStringSelectMenu() && i.customId === "tier_select_lvl") {
      const chosenTier = i.values[0];
      const modal = new ModalBuilder().setCustomId(`modal_tier_${chosenTier}`).setTitle(`Заявка на Tier ${chosenTier}`);
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t_nick").setLabel("Ник и Статик").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t_skills").setLabel("Откат, Спешик / Тяга").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t_sayga").setLabel("Сайга").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("modal_tier_")) {
      const chosenTier = i.customId.split("_")[2];
      const logChannel = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      
      const emb = new EmbedBuilder()
        .setTitle(`🎯 НОВАЯ ЗАЯВКА НА TIER ${chosenTier}`)
        .setColor("#8A2BE2")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "📝 Ник/Статик", value: i.fields.getTextInputValue("t_nick") },
          { name: "🎬 Откат и Навыки", value: i.fields.getTextInputValue("t_skills") },
          { name: "🔫 Сайга", value: i.fields.getTextInputValue("t_sayga") },
          { name: "📊 Статус", value: "⏳ Ожидание проверки" }
        ).setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_tier_${i.user.id}_${chosenTier}`).setLabel(`✅ Одобрить (Тир ${chosenTier})`).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_ok_tier_${i.user.id}_1`).setLabel("Выдать Tier 1").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`adm_ok_tier_${i.user.id}_2`).setLabel("Выдать Tier 2").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`adm_ok_tier_${i.user.id}_3`).setLabel("Выдать Tier 3").setStyle(ButtonStyle.Primary)
      );

      await logChannel.send({ embeds: [emb], components: [row1, row2] });
      return i.reply({ content: "✅ Ваша заявка на тир отправлена руководству!", ephemeral: true });
    }

    // === ОБРАБОТКА КИКА ИЗ-ЗА ВАРНОВ ===
    if (i.isButton() && i.customId.startsWith("kick_")) {
      const [ , action, uid ] = i.customId.split("_");
      const target = await i.guild.members.fetch(uid).catch(()=>null);
      
      if (action === "ok") {
        if (target) {
          await target.send("Молодец сам этого добился в 2 семьи такое не будет удачи").catch(() => notifyBlocked(i.guild, target));
          await target.kick("Проигнорировал 2 варна. Кикнут системой.").catch(()=>{});
        }
        await removeWarnMessage(i.guild, uid);
        delete db.activeWarns[uid]; save();
        return i.update({ embeds: [new EmbedBuilder().setColor("Green").setDescription(`✅ Игрок <@${uid}> успешно кикнут.`)], components: [] });
      }
      if (action === "no") {
         if (target) await target.roles.remove([WARN_CONFIG.WARN_ROLE_1, WARN_CONFIG.WARN_ROLE_2]).catch(()=>{});
         await removeWarnMessage(i.guild, uid);
         delete db.activeWarns[uid]; save();
         return i.update({ embeds: [new EmbedBuilder().setColor("Yellow").setDescription(`✅ Процесс кика отключен. Варны сняты с игрока <@${uid}>.`)], components: [] });
      }
    }

    // === ОБЖАЛОВАНИЕ ВАРНА ===
    if (i.isButton() && i.customId === "appeal_start_btn") {
      const modal = new ModalBuilder().setCustomId("modal_appeal_global").setTitle("Форма обжалования");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("ap_who").setLabel("1. Кто вы? (Ник и статик)").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("ap_reason").setLabel("2. За что был выдан варн?").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("ap_why").setLabel("3. Почему варн выдан неверно?").setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_appeal_global") {
      const appealChannel = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder()
        .setTitle("⚖️ НОВОЕ ОБЖАЛОВАНИЕ ВАРНА")
        .setColor("Orange")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: "📝 Ник/Статик", value: i.fields.getTextInputValue("ap_who") },
          { name: "🛑 За что выдали", value: i.fields.getTextInputValue("ap_reason") },
          { name: "❓ Почему не согласен", value: i.fields.getTextInputValue("ap_why") },
          { name: "📊 Статус", value: "⏳ Ожидание руководства" }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_appeal_${i.user.id}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );

      await appealChannel.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Ваше обжалование отправлено в главные логи!", ephemeral: true });
    }

    // === ВЫДАЧА ВАРНА ===
    if (i.isButton() && i.customId === "warn_issue_btn") {
      const hasMgmtRole = WARN_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r));
      if (!hasMgmtRole) return i.reply({ content: "❌ Куда жмешь? У тебя нет прав выписывать варны!", ephemeral: true });

      const modal = new ModalBuilder().setCustomId("modal_warn_issue").setTitle("Выдача варна");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("w_target").setLabel("ID пользователя").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("w_reason").setLabel("Причина").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("w_task").setLabel("Что нужно сделать для отработки?").setStyle(TextInputStyle.Paragraph).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_warn_issue") {
      const targetId = i.fields.getTextInputValue("w_target");
      const reason = i.fields.getTextInputValue("w_reason");
      const task = i.fields.getTextInputValue("w_task");

      const targetMember = await i.guild.members.fetch(targetId).catch(()=>null);
      if (targetMember) {
        await targetMember.roles.add(WARN_CONFIG.WARN_ROLE_1).catch(()=>{});
        targetMember.send(`⚠️ Вы получили варн!\n**Причина:** ${reason}\n\nУ тебя есть 2 дня, чтобы снять этот варн, иначе последствия будут хуже.`).catch(() => notifyBlocked(i.guild, targetMember));
      }

      const randomGif = WARN_CONFIG.WARN_GIFS[Math.floor(Math.random() * WARN_CONFIG.WARN_GIFS.length)];
      const otrabotkaChannel = await i.guild.channels.fetch(WARN_CONFIG.WORK_CHANNEL);
      
      const embed = new EmbedBuilder()
        .setTitle("🛑 ПОЛУЧЕН ВАРН")
        .setColor("Red")
        .setImage(randomGif) 
        .addFields(
          { name: "👮 Выдал", value: `${i.user}`, inline: true },
          { name: "👤 Нарушитель", value: `<@${targetId}>`, inline: true },
          { name: "📝 Причина", value: reason, inline: false },
          { name: "🛠 Как отработать", value: task, inline: false }
        ).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`w_rem_task_${targetId}`).setLabel("Снять заданием").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`w_rem_pts_${targetId}`).setLabel(`Снять за ${WARN_CONFIG.REMOVE_COST} баллов`).setStyle(ButtonStyle.Primary)
      );

      const warnMsg = await otrabotkaChannel.send({ content: `<@${targetId}>, у тебя проблемы!`, embeds: [embed], components: [row] });
      
      try {
        const threadName = targetMember ? `Отработка: ${targetMember.user.username}` : `Отработка: ${targetId}`;
        await warnMsg.startThread({ name: threadName, autoArchiveDuration: ThreadAutoArchiveDuration.OneDay });
      } catch(e) { console.error("Не удалось создать ветку", e); }

      db.activeWarns[targetId] = { level: 1, timestamp: Date.now(), notified: false, warnMsgId: warnMsg.id };
      save();

      return i.reply({ content: `✅ Варн успешно выдан игроку <@${targetId}>. Ветка создана.`, ephemeral: true });
    }

    if (i.isButton() && i.customId.startsWith("w_")) {
      const action = i.customId.split("_").slice(0, 3).join("_"); 
      const targetId = i.customId.split("_").pop();

      if (i.user.id !== targetId && action !== "bribe_bot_pay" && action !== "bribe_bot_no") {
         return i.reply({ content: "❌ Это не твой варн!", ephemeral: true });
      }
      if (!i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && action !== "bribe_bot_pay" && action !== "bribe_bot_no") {
         return i.reply({ content: "❌ Тебе нужна роль 'Принятого', чтобы отрабатывать варны.", ephemeral: true });
      }

      if (action === "w_rem_task") {
        const modal = new ModalBuilder().setCustomId(`modal_w_task_${targetId}`).setTitle("Отчет о снятии варна");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("proof").setLabel("Ссылка на доказательства (скрин/видео)").setStyle(TextInputStyle.Short).setRequired(true)));
        return i.showModal(modal);
      }

      if (action === "w_rem_pts") {
        const cooldown = getWarnCooldown(i.user.id);
        const now = Date.now();

        if (now < cooldown) {
          const hoursLeft = Math.ceil((cooldown - now) / (1000 * 60 * 60));
          const embed = new EmbedBuilder()
            .setTitle("🚨 АХ ТЫ ЗАХОТЕЛ ОБМАНУТЬ KENZO!")
            .setDescription(`Ты уже снимал варн за баллы недавно! До следующего легального снятия осталось: **${hoursLeft} часов**.\n\nПоскольку ты гавнюк и пытаешься обойти систему:\n💵 **Плати мне (боту) ${WARN_CONFIG.BRIBE_COST} баллов**, и я забуду.\n❌ Либо жми **"Денег нет"**, и я иду сливать всё Kenzo!`)
            .setColor("DarkRed");
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bribe_bot_pay_${targetId}`).setLabel(`Заплатить ${WARN_CONFIG.BRIBE_COST} баллов`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`bribe_bot_no_${targetId}`).setLabel("Денег нет...").setStyle(ButtonStyle.Danger)
          );
          return i.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
          const balance = getPoints(i.user.id);
          if (balance < WARN_CONFIG.REMOVE_COST) return i.reply({ content: `❌ У тебя не хватает баллов! Нужно: ${WARN_CONFIG.REMOVE_COST}.`, ephemeral: true });
          
          addPoints(i.user.id, -WARN_CONFIG.REMOVE_COST);
          setWarnCooldown(i.user.id); 
          await i.member.roles.remove([WARN_CONFIG.WARN_ROLE_1, WARN_CONFIG.WARN_ROLE_2]).catch(()=>{});
          
          await removeWarnMessage(i.guild, i.user.id); 
          delete db.activeWarns[i.user.id]; save();

          return i.reply({ content: `✅ Варн успешно снят! Списано ${WARN_CONFIG.REMOVE_COST} баллов. Сообщение отработки удалено.`, ephemeral: true });
        }
      }
    }

    if (i.isButton() && i.customId.startsWith("bribe_bot_")) {
      const isPay = i.customId.includes("_pay_");
      const balance = getPoints(i.user.id);

      if (isPay) {
        if (balance >= WARN_CONFIG.BRIBE_COST) {
          addPoints(i.user.id, -WARN_CONFIG.BRIBE_COST);
          return i.update({ embeds: [new EmbedBuilder().setColor("Green").setDescription("😎 Отлично. Баллы списаны. Я нем как рыба. Гуляй.")], components: [] });
        } else {
          client.users.fetch(CAPT_CONFIG.OWNER_ID).then(owner => { owner.send(`⚠️ **Kenzo, тут крыса!** Игрок ${i.user} пытался дать мне взятку, но оказался нищим! Разберись!`).catch(()=>{}); }).catch(()=>{});
          return i.update({ embeds: [new EmbedBuilder().setColor("Red").setDescription("🤬 ТЫ ХОТЕЛ МЕНЯ ОБМАНУТЬ СУКИН СЫН! Денег у тебя нет! Я уже написал Kenzo.")], components: [] });
        }
      } else {
        client.users.fetch(CAPT_CONFIG.OWNER_ID).then(owner => { owner.send(`⚠️ **Kenzo!** Игрок ${i.user} пытался обойти кулдаун. Денег на взятку нет.`).catch(()=>{}); }).catch(()=>{});
        return i.update({ embeds: [new EmbedBuilder().setColor("DarkRed").setDescription("🤡 Ну всё, пиши пропало. Я сдал тебя Kenzo со всеми потрохами.")], components: [] });
      }
    }

    if (i.isModalSubmit() && i.customId.startsWith("modal_w_task_")) {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("🛠 ЗАПРОС НА СНЯТИЕ ВАРНА (ЗАДАНИЕ)").setColor("Blue").addFields({ name: "👤 Игрок", value: `${i.user}` }, { name: "🔗 Док-ва", value: i.fields.getTextInputValue("proof") }, { name: "📊 Статус", value: "⏳ Ожидание проверки руководством" }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_warnrem_${i.user.id}`).setLabel("✅ Одобрить снятие").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [emb], components: [row] });
      await i.message.edit({ components: [] }).catch(()=>{});
      return i.reply({ content: "✅ Ваш отчет отправлен руководству на рассмотрение!", ephemeral: true });
    }

    // === АДМИН-КНОПКИ ===
    if (i.isButton() && i.customId.startsWith("adm_")) {
      const [ , action, type, uid, val1, val2] = i.customId.split("_");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const embed = EmbedBuilder.from(i.message.embeds[0]);

      if (action === "watch") {
        const fields = embed.data.fields.map(f => f.name === "📊 Статус" ? {name:"📊 Статус", value:`👀 Проверяет ${i.user.username}`} : f);
        embed.setColor("Blue").setFields(fields);
        if (target) target.send("👀 Твоя заявка/обжалование взято на рассмотрение!").catch(() => notifyBlocked(i.guild, target));
        return i.update({ embeds: [embed] });
      }

      if (action === "ok") {
        if (type === "pts") {
          addPoints(uid, parseInt(val1));
          if (target) target.send(`✅ Отчет принят! +**${val1}** 💎`).catch(() => notifyBlocked(i.guild, target));
        } 
        else if (type === "rank") {
          addPoints(uid, -parseInt(val2));
          if (val1 === "3") await target?.roles.add(CONFIG.MEIN_ROLE_ID).catch(()=>{});
          if (val1 === "4") await target?.roles.add(CONFIG.MEIN_PLUS_ROLE_ID).catch(()=>{});
          if (target) target.send(`🎉 Поздравляем с повышением до **${val1}** ранга!`).catch(() => notifyBlocked(i.guild, target));
        }
        else if (type === "fam") {
          await target?.roles.add(CONFIG.ROLE_ACCEPTED_ID).catch(()=>{});
          if (target) target.send("🎉 Ты принят в семью!").catch(() => notifyBlocked(i.guild, target));
        }
        else if (type === "tier") {
          await target?.roles.remove(Object.values(CAPT_CONFIG.TIERS)).catch(()=>{});
          const roleId = CAPT_CONFIG.TIERS[val1];
          if (roleId) await target?.roles.add(roleId).catch(()=>{});
          if (target) target.send(`🎯 Тебе выдан **Tier ${val1}**!`).catch(() => notifyBlocked(i.guild, target));
        }
        else if (type === "vac") {
          if (target) {
            const rs = target.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
            afkdb.roles[uid] = rs; saveAfk();
            for (const r of rs) await target.roles.remove(r).catch(() => {});
            await target.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
            target.send("🏖 Твой отпуск одобрен! Хорошего отдыха.").catch(() => notifyBlocked(i.guild, target));
          }
        }
        else if (type === "warnrem" || type === "appeal") {
           if (target) {
             await target.roles.remove([WARN_CONFIG.WARN_ROLE_1, WARN_CONFIG.WARN_ROLE_2]).catch(()=>{});
             target.send("✅ Твой варн успешно снят (заявка/обжалование одобрены)!").catch(() => notifyBlocked(i.guild, target));
           }
           await removeWarnMessage(i.guild, uid); 
           delete db.activeWarns[uid]; save();
        }

        const fields = embed.data.fields.map(f => f.name === "📊 Статус" ? {name:"📊 Статус", value:`✅ Одобрено (${i.user.username})`} : f);
        embed.setColor("Green").setFields(fields);
        return i.update({ embeds: [embed], components: [] });
      }

      if (action === "no") {
        const modal = new ModalBuilder().setCustomId(`rej_modal_${uid}_${i.message.id}`).setTitle("Причина отказа");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Укажите причину").setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return i.showModal(modal);
      }
    }

    if (i.isModalSubmit() && i.customId.startsWith("rej_modal_")) {
      const [,, uid, mid] = i.customId.split("_");
      const reason = i.fields.getTextInputValue("reason");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const msg = await i.channel.messages.fetch(mid).catch(() => null);
      if (msg) {
        const emb = EmbedBuilder.from(msg.embeds[0]).setColor("Red");
        const fields = msg.embeds[0].fields.map(f => f.name === "📊 Статус" ? {name:"📊 Статус", value:`❌ Отказано: ${reason} (${i.user.username})`} : f);
        emb.setFields(fields);
        await msg.edit({ embeds: [emb], components: [] });
      }
      if (target) target.send(`❌ Твоя заявка/обжалование отклонена. Причина: ${reason}`).catch(() => notifyBlocked(i.guild, target));
      return i.reply({ content: "Статус обновлен на: Отказано.", ephemeral: true });
    }

    // === ЛОГИКА КАПТОВ ===
    const getTier = (member) => {
      if (!member || !member.roles) return "tier3";
      if (member.roles.cache.has(CAPT_CONFIG.TIERS["1"])) return "tier1";
      if (member.roles.cache.has(CAPT_CONFIG.TIERS["2"])) return "tier2";
      return "tier3";
    };

    const removeFromCapt = (id) => {
      currentCapt.tier1 = currentCapt.tier1.filter(u => u !== id);
      currentCapt.tier2 = currentCapt.tier2.filter(u => u !== id);
      currentCapt.tier3 = currentCapt.tier3.filter(u => u !== id);
      currentCapt.subs = currentCapt.subs.filter(u => u !== id);
    };

    if (i.isButton() && i.customId === "capt_remove") {
      const hasPerm = CAPT_CONFIG.REMOVE_ROLES.some(r => i.member.roles.cache.has(r));
      if (!hasPerm) {
        client.users.fetch(CAPT_CONFIG.OWNER_ID).then(owner => { owner.send(`⚠️ Игрок ${i.user} попытался нажать кнопку "Удалить с капта" без прав!`).catch(()=>{}); }).catch(()=>{});
        return i.reply({ content: "АХ ТЫ ПИСЮН МАРИНОВАНЫЙ РЕШИЛ Удалить кавото я все Kenzo раскажу", ephemeral: true });
      }
      const modal = new ModalBuilder().setCustomId("modal_capt_remove").setTitle("Удалить с капта");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_id").setLabel("Discord ID").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Причина").setStyle(TextInputStyle.Short).setRequired(true)));
      return i.showModal(modal);
    }

    if (i.isButton() && i.customId.startsWith("capt_")) {
      if (i.customId !== "capt_force" && !i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID)) return i.reply({ content: "❌ Вы не состоите в семье!", ephemeral: true });
      const userId = i.user.id;
      
      if (i.customId === "capt_plus") { 
        removeFromCapt(userId); 
        const tier = getTier(i.member);
        if(!currentCapt[tier].includes(userId)) currentCapt[tier].push(userId); 
        await i.update({ embeds: [buildCaptEmbed()] }); 
      }
      if (i.customId === "capt_sub") { 
        removeFromCapt(userId); 
        if(!currentCapt.subs.includes(userId)) currentCapt.subs.push(userId); 
        await i.update({ embeds: [buildCaptEmbed()] }); 
      }
      if (i.customId === "capt_minus") { 
        removeFromCapt(userId); 
        await i.update({ embeds: [buildCaptEmbed()] }); 
      }
      if (i.customId === "capt_force") {
        if (!CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r))) return i.reply({ content: "❌ У вас нет прав.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("modal_capt_force").setTitle("Вписать участника");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_id").setLabel("Discord ID").setStyle(TextInputStyle.Short).setRequired(true)));
        return i.showModal(modal);
      }
    }

    if (i.isModalSubmit() && i.customId === "modal_capt_force") {
      const targetId = i.fields.getTextInputValue("target_id");
      try {
        const tm = await i.guild.members.fetch(targetId);
        removeFromCapt(targetId); 
        const tier = getTier(tm);
        if(!currentCapt[tier].includes(targetId)) currentCapt[tier].push(targetId);
        await i.message.edit({ embeds: [buildCaptEmbed()] });
        return i.reply({ content: `✅ Пользователь вписан!`, ephemeral: true });
      } catch (err) { return i.reply({ content: "❌ Не найден ID на сервере.", ephemeral: true }); }
    }

    if (i.isModalSubmit() && i.customId === "modal_capt_remove") {
      const targetId = i.fields.getTextInputValue("target_id"); 
      const reason = i.fields.getTextInputValue("reason");
      removeFromCapt(targetId);
      await i.message.edit({ embeds: [buildCaptEmbed()] });
      return i.reply({ content: `🧹 Игрок <@${targetId}> удален. Причина: ${reason}`, ephemeral: true });
    }

    if (i.isButton() && i.customId === "earn_btn") {
      const sel = new StringSelectMenuBuilder().setCustomId("earn_select").setPlaceholder("Что ты сделал?");
      EARN_OPTIONS.forEach(o => sel.addOptions(new StringSelectMenuOptionBuilder().setLabel(o.label).setValue(o.value)));
      return i.reply({ content: "Выбери:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }

    if (i.isStringSelectMenu() && i.customId === "earn_select") {
      const modal = new ModalBuilder().setCustomId(`me_${i.values[0]}`).setTitle("Отчет");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e1").setLabel("Ник/статик").setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e2").setLabel("Док-ва").setStyle(TextInputStyle.Short)));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("me_")) {
      const taskKey = i.customId.replace("me_", ""); const task = EARN_OPTIONS.find(o => o.value === taskKey); const pts = taskKey.split("_")[1];
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("💰 ОТЧЕТ НА БАЛЛЫ").setColor("Yellow").addFields({ name: "👤 Игрок", value: `${i.user}` }, { name: "🛠 Работа", value: task.label }, { name: "📝 Инфо", value: i.fields.getTextInputValue("e1") }, { name: "🔗 Док-ва", value: i.fields.getTextInputValue("e2") }, { name: "📊 Статус", value: "⏳ Ожидание" }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_pts_${i.user.id}_${pts}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Отчет отправлен!", ephemeral: true });
    }

    // === АНКЕТА ===
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("modal_apply").setTitle("Анкета в семью");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a_nick_age_stat").setLabel("1. Ник, Возраст, Статик").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a_otkat_skills").setLabel("2. Откат, Спешик / Тяга").setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a_source").setLabel("3. Откуда узнал о семье?").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a_online").setLabel("4. Средний онлайн").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_apply") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("📩 НОВАЯ ЗАЯВКА").setColor("#ff0000").addFields(
        { name: "👤 Игрок", value: `${i.user}` }, 
        { name: "📝 Ник / Возраст / Статик", value: i.fields.getTextInputValue("a_nick_age_stat") }, 
        { name: "🎬 Откат и Навыки", value: i.fields.getTextInputValue