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
  COMMAND_CHANNEL_ID: "1480220429988659251", 
  MAIN_LOG_CHANNEL: "1480227101905785113",    
  ROLE_ACCEPTED_ID: "1479557914086740104",   
  ROLE_LEADER_ID: "1056945517835341936",     
  MEIN_ROLE_ID: "1480229891789160479",       
  MEIN_PLUS_ROLE_ID: "1479574658935423087",  
  AFK_LOG_CHANNEL: "1480228317222277171",    
  VACATION_ROLE: "1479988454484869271",      
  IMAGE: NEW_IMAGE,
  TIER_CHANNEL_ID: "1490912215341989978", 
  TIER_IMAGE: NEW_IMAGE 
};

// === НАСТРОЙКИ ДЛЯ КАПТОВ ===
const CAPT_CONFIG = {
  CHANNEL_ID: "1480474720683032660", 
  IMAGE_URL: NEW_IMAGE,
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

/* ================= [ СЛЭШ КОМАНДЫ (РЕГИСТРАЦИЯ) ] ================= */
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
    .addStringOption(option => option.setName('time').setDescription('Время (через сколько сбор)').setRequired(false))
];

/* ================= [ БАЗЫ ДАННЫХ ] ================= */
let db = { points: {} }; 
if (fs.existsSync("db.json")) db = Object.assign({ points: {} }, JSON.parse(fs.readFileSync("db.json")));
let afkdb = { roles: {} };
if (fs.existsSync("afkdb.json")) afkdb = JSON.parse(fs.readFileSync("afkdb.json"));

const save = () => fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
const saveAfk = () => fs.writeFileSync("afkdb.json", JSON.stringify(afkdb, null, 2));
const addPoints = (id, amt) => { db.points[id] = (db.points[id] || 0) + amt; save(); };
const getPoints = (id) => db.points[id] || 0;

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
      if (ch) ch.send(`⚠️ **ВНИМАНИЕ!** Игрок <@${member.id}> (${member.user.tag}) заблокировал бота или закрыл ЛС. Сообщение не доставлено!`);
  } catch(e) {}
};

/* ================= [ ГОТОВНОСТЬ ] ================= */
client.once("ready", async () => {
  console.log(`🚀 Бот ${client.user.tag} готов! Логи -> ${CONFIG.MAIN_LOG_CHANNEL}`);

  // Регистрация слэш-команд
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('🔄 Начато обновление (/) команд...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(cmd => cmd.toJSON()) }, // ИСПРАВЛЕНО: добавлено .toJSON()
    );
    console.log('✅ Успешно загружены (/) команды.');
  } catch (error) {
    console.error('Ошибка при загрузке команд:', error);
  }
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

/* ================= [ ВЗАИМОДЕЙСТВИЯ ] ================= */
client.on("interactionCreate", async i => {
  try {
    // === ОБРАБОТКА СЛЭШ-КОМАНД ===
    if (i.isChatInputCommand()) {
      const { commandName } = i;

      // /новость
      if (commandName === 'новость') {
        if (!i.member.roles.cache.has(CONFIG.ROLE_LEADER_ID) && !CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r))) {
          return i.reply({ content: "❌ Нет прав для рассылки новостей.", ephemeral: true });
        }
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder().setTitle("📢 ВАЖНАЯ НОВОСТЬ СЕМЬИ").setDescription(text).setColor("Red").setImage(CONFIG.IMAGE).setTimestamp();
        await i.guild.members.fetch();
        const membersToAlert = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        
        membersToAlert.forEach(async (member) => { 
          try { await member.send({ embeds: [embed] }); } 
          catch (err) { notifyBlocked(i.guild, member); } 
        });
        return i.editReply(`✅ Рассылка начата. Оповещено пользователей: ~${membersToAlert.size}`);
      }

      // /тир
      if (commandName === 'тир') {
        if (i.channelId !== CONFIG.TIER_CHANNEL_ID) return i.reply({ content: "❌ Эту команду можно использовать только в канале для тира.", ephemeral: true });
        const embed = new EmbedBuilder()
            .setTitle("🎯 ПОЛУЧЕНИЕ ТИРА")
            .setDescription("Нажмите кнопку ниже, чтобы подать заявку на получение тира.")
            .setImage(CONFIG.TIER_IMAGE)
            .setColor("#8A2BE2");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("tier_start_btn").setLabel("Получить тир").setStyle(ButtonStyle.Primary));
        return i.reply({ embeds: [embed], components: [row] });
      }

      // /give
      if (commandName === 'give') {
        if (!i.member.roles.cache.has(CONFIG.ROLE_LEADER_ID)) return i.reply({ content: "❌ Нет прав", ephemeral: true });
        const user = i.options.getUser('user');
        const amount = i.options.getInteger('amount');
        addPoints(user.id, amount);
        return i.reply({ content: `✅ Выдано ${amount} 💎 игроку ${user}`, ephemeral: true });
      }

      // /menu
      if (commandName === 'menu') {
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
      if (commandName === 'заявка') {
        if (i.channelId !== CONFIG.COMMAND_CHANNEL_ID) return i.reply({ content: "❌ Эту команду можно использовать только в канале для заявок.", ephemeral: true });
        const embed = new EmbedBuilder()
            .setTitle("📝 ЗАЯВКА В СЕМЬЮ")
            .setDescription("Нажми на кнопку ниже, чтобы заполнить анкету.")
            .setImage(CONFIG.IMAGE)
            .setColor("#ff0000");
        const btn = new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger);
        return i.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
      }

      // /afk
      if (commandName === 'afk') {
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
      if (commandName === 'startcapt') {
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
      if (commandName === 'капт') {
        const hasMgmtRole = CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r));
        if (!hasMgmtRole) return i.reply({ content: "❌ Нет прав.", ephemeral: true }); 
        await i.deferReply({ ephemeral: true });
        const time = i.options.getString('time') || "скоро";
        await i.guild.members.fetch();
        const membersToAlert = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        const alertEmbed = new EmbedBuilder().setTitle("🚨 ВНИМАНИЕ: КАПТ!").setDescription(`Сбор в войсе через: **${time}**\nЗаходи в игру!`).setImage(CAPT_CONFIG.IMAGE_URL).setColor("Red");
        membersToAlert.forEach(async (member) => { try { await member.send({ embeds: [alertEmbed] }); } catch (err) { notifyBlocked(i.guild, member); } });
        return i.editReply(`✅ Оповещено пользователей: ~${membersToAlert.size}`);
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

    // === АДМИН-КНОПКИ ===
    if (i.isButton() && i.customId.startsWith("adm_")) {
      const [ , action, type, uid, val1, val2] = i.customId.split("_");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const embed = EmbedBuilder.from(i.message.embeds[0]);

      if (action === "watch") {
        const fields = embed.data.fields.map(f => f.name === "📊 Статус" ? {name:"📊 Статус", value:`👀 Проверяет ${i.user.username}`} : f);
        embed.setColor("Blue").setFields(fields);
        if (target) target.send("👀 Твоя заявка взято на рассмотрение!").catch(() => notifyBlocked(i.guild, target));
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
      if (target) target.send(`❌ Твоя заявка отклонена. Причина: ${reason}`).catch(() => notifyBlocked(i.guild, target));
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
        return i.reply({ content: "❌ У вас нет прав.", ephemeral: true });
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
        { name: "🎬 Откат и Навыки", value: i.fields.getTextInputValue("a_otkat_skills") }, 
        { name: "🌍 Откуда узнал", value: i.fields.getTextInputValue("a_source") }, 
        { name: "🕒 Онлайн", value: i.fields.getTextInputValue("a_online") }, 
        { name: "📊 Статус", value: "⏳ Ожидание" }
      ).setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_fam_${i.user.id}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка отправлена!", ephemeral: true });
    }

    if (i.isButton() && i.customId === "rankup_btn") {
      const modal = new ModalBuilder().setCustomId("modal_rankup").setTitle("Повышение");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r1").setLabel("Ник/статик").setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r2").setLabel("Видео").setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r3").setLabel("Ранг (3/4)").setStyle(TextInputStyle.Short)));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_rankup") {
      const r = i.fields.getTextInputValue("r3"); const c = RANK_COSTS[r];
      if (!c || getPoints(i.user.id) < c) return i.reply({ content: `❌ Надо: ${c}`, ephemeral: true });
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("📈 ПОВЫШЕНИЕ").setColor("Green").addFields({ name: "👤", value: `${i.user}` }, { name: "🎖", value: r }, { name: "🎬", value: i.fields.getTextInputValue("r2") }, { name: "📊", value: "⏳ Ожидание" }).setTimestamp();
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_rank_${i.user.id}_${r}_${c}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Отправлено!", ephemeral: true });
    }

    if (i.isButton() && i.customId === "balance_btn") return i.reply({ content: `💎 Баланс: **${getPoints(i.user.id)}**`, ephemeral: true });
    
    if (i.isButton() && i.customId === "afk_vacation") {
      const modal = new ModalBuilder().setCustomId("modal_vacation").setTitle("Отпуск");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("v1").setLabel("Даты").setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("v2").setLabel("Причина").setStyle(TextInputStyle.Paragraph)));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_vacation") {
      const log = await i.guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL).catch(() => null);
      if (log) {
        const emb = new EmbedBuilder().setTitle("🏖 ОТПУСК").setColor("Orange").addFields({ name: "👤", value: `${i.user}` }, { name: "📅", value: i.fields.getTextInputValue("v1") }, { name: "📝", value: i.fields.getTextInputValue("v2") }, { name: "📊", value: "⏳ Ожидание" }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_vac_${i.user.id}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
        await log.send({ embeds: [emb], components: [row] });
      }
      return i.reply({ content: "🏖 Отправлено!", ephemeral: true });
    }

    if (i.isButton() && i.customId === "afk_on") {
        const rs = i.member.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id); afkdb.roles[i.user.id] = rs; saveAfk();
        for (const r of rs) await i.member.roles.remove(r).catch(() => {}); await i.member.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
        return i.reply({ content: "🌙 AFK включен.", ephemeral: true });
    }

    if (i.isButton() && i.customId === "afk_off") {
        const s = afkdb.roles[i.user.id]; if (!s) return i.reply({ content: "❌ Вы не в AFK.", ephemeral: true });
        for (const r of s) await i.member.roles.add(r).catch(() => {}); await i.member.roles.remove(CONFIG.VACATION_ROLE).catch(() => {});
        delete afkdb.roles[i.user.id]; saveAfk();
        return i.reply({ content: "✅ С возвращением!", ephemeral: true });
    }

  } catch (e) { 
    console.error("Ошибка взаимодействия:", e); 
    if(!i.replied && !i.deferred) await i.reply({ content: "❌ Произошла ошибка. Попробуй еще раз.", ephemeral: true }).catch(()=>{});
  }
});

client.login(process.env.TOKEN);