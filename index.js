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
  MEIN_ROLE_ID: "1480229891789160479",       
  MEIN_PLUS_ROLE_ID: "1479574658935423087",  
  AFK_LOG_CHANNEL: "1480228317222277171",    
  VACATION_ROLE: "1479988454484869271",      
  IMAGE: NEW_IMAGE,
  TIER_CHANNEL_ID: "1490912215341989978", 
  TIER_IMAGE: NEW_IMAGE,
  
  // СПИСОК АДМИНСКИХ РОЛЕЙ (могут юзать /новость, /give, /startcapt и т.д.)
  ADMIN_ROLES: [
    "1479566887519129781",
    "1056945517835341936",
    "1338140038298341396",
    "1479566383003205663",
    "1479592954795655312"
  ]
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
  new SlashCommandBuilder().setName('новость').setDescription('Разослать новость семье').addStringOption(option => option.setName('текст').setDescription('Текст новости').setRequired(true)),
  new SlashCommandBuilder().setName('тир').setDescription('Панель получения тира'),
  new SlashCommandBuilder().setName('give').setDescription('Выдать баллы игроку').addUserOption(option => option.setName('user').setDescription('Кому выдать баллы').setRequired(true)).addIntegerOption(option => option.setName('amount').setDescription('Кол-во баллов').setRequired(true)),
  new SlashCommandBuilder().setName('menu').setDescription('Открыть систему баллов и повышения'),
  new SlashCommandBuilder().setName('заявка').setDescription('Открыть панель заявки в семью'),
  new SlashCommandBuilder().setName('afk').setDescription('Управление статусом AFK и Отпуска'),
  new SlashCommandBuilder().setName('startcapt').setDescription('Начать сбор на капт'),
  new SlashCommandBuilder().setName('капт').setDescription('Оповещение участников о капте').addStringOption(option => option.setName('time').setDescription('Время (через сколько сбор)').setRequired(false))
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
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers ],
});

const notifyBlocked = async (guild, member) => {
  try {
      const ch = await guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL);
      if (ch) ch.send(`⚠️ **ВНИМАНИЕ!** Игрок <@${member.id}> (${member.user.tag}) заблокировал бота или закрыл ЛС. Сообщение не доставлено!`);
  } catch(e) {}
};

// Функция проверки прав (возвращает true, если у юзера есть админская роль)
const hasAdminPerms = (member) => {
  if (!member || !member.roles) return false;
  return CONFIG.ADMIN_ROLES.some(roleId => member.roles.cache.has(roleId));
};

/* ================= [ ГОТОВНОСТЬ ] ================= */
client.once("ready", async () => {
  console.log(`🚀 Бот ${client.user.tag} готов! Логи -> ${CONFIG.MAIN_LOG_CHANNEL}`);
  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('🔄 Начато обновление (/) команд...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands.map(cmd => cmd.toJSON()) });
    console.log('✅ Успешно загружены (/) команды.');
  } catch (error) { console.error('Ошибка при загрузке команд:', error); }
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

      // 🔐 АДМИНСКИЕ КОМАНДЫ
      if (commandName === 'новость') {
        if (!hasAdminPerms(i.member)) return i.reply({ content: "❌ У вас нет прав для рассылки новостей.", ephemeral: true });
        await i.deferReply({ ephemeral: true });
        const text = i.options.getString('текст');
        const embed = new EmbedBuilder().setTitle("📢 ВАЖНАЯ НОВОСТЬ СЕМЬИ").setDescription(text).setColor("Red").setImage(CONFIG.IMAGE).setTimestamp();
        await i.guild.members.fetch();
        const membersToAlert = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        membersToAlert.forEach(async (member) => { try { await member.send({ embeds: [embed] }); } catch (err) { notifyBlocked(i.guild, member); } });
        return i.editReply(`✅ Рассылка начата. Оповещено: ~${membersToAlert.size}`);
      }

      if (commandName === 'give') {
        if (!hasAdminPerms(i.member)) return i.reply({ content: "❌ Нет прав для выдачи баллов.", ephemeral: true });
        const user = i.options.getUser('user'); const amount = i.options.getInteger('amount');
        addPoints(user.id, amount);
        return i.reply({ content: `✅ Выдано ${amount} 💎 игроку ${user}`, ephemeral: true });
      }

      if (commandName === 'startcapt') {
        if (!hasAdminPerms(i.member)) return i.reply({ content: "❌ У вас нет прав для создания сбора на капт.", ephemeral: true });
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

      if (commandName === 'капт') {
        if (!hasAdminPerms(i.member)) return i.reply({ content: "❌ Нет прав.", ephemeral: true }); 
        await i.deferReply({ ephemeral: true });
        const time = i.options.getString('time') || "скоро";
        await i.guild.members.fetch();
        const membersToAlert = i.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
        const alertEmbed = new EmbedBuilder().setTitle("🚨 ВНИМАНИЕ: КАПТ!").setDescription(`Сбор в войсе через: **${time}**\nЗаходи в игру!`).setImage(CAPT_CONFIG.IMAGE_URL).setColor("Red");
        membersToAlert.forEach(async (member) => { try { await member.send({ embeds: [alertEmbed] }); } catch (err) { notifyBlocked(i.guild, member); } });
        return i.editReply(`✅ Оповещено: ~${membersToAlert.size}`);
      }

      // 🌍 ОБЩЕДОСТУПНЫЕ КОМАНДЫ
      if (commandName === 'тир') {
        if (i.channelId !== CONFIG.TIER_CHANNEL_ID) return i.reply({ content: "❌ Эту команду можно использовать только в канале для тира.", ephemeral: true });
        const embed = new EmbedBuilder().setTitle("🎯 ПОЛУЧЕНИЕ ТИРА").setDescription("Нажмите кнопку ниже.").setImage(CONFIG.TIER_IMAGE).setColor("#8A2BE2");
        return i.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("tier_start_btn").setLabel("Получить тир").setStyle(ButtonStyle.Primary))] });
      }

      if (commandName === 'menu') {
        const embed = new EmbedBuilder().setTitle("💎 СИСТЕМА БАЛЛОВ И ПОВЫШЕНИЯ").setDescription(`📜 **Цены:**\n🔹 2 ➔ 3: **${RANK_COSTS["3"]} 💎**\n🔹 3 ➔ 4: **${RANK_COSTS["4"]} 💎**`).setImage(CONFIG.IMAGE).setColor("#00d4ff");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("earn_btn").setLabel("Заработать").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("balance_btn").setLabel("Баланс").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("rankup_btn").setLabel("Повыситься").setStyle(ButtonStyle.Success));
        return i.reply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'заявка') {
        if (i.channelId !== CONFIG.COMMAND_CHANNEL_ID) return i.reply({ content: "❌ Эту команду можно использовать только в канале для заявок.", ephemeral: true });
        const embed = new EmbedBuilder().setTitle("📝 ЗАЯВКА В СЕМЬЮ").setDescription("Нажми на кнопку ниже.").setImage(CONFIG.IMAGE).setColor("#ff0000");
        return i.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger))] });
      }

      if (commandName === 'afk') {
        const embed = new EmbedBuilder().setTitle("💤 Управление AFK / Отпуск").setDescription("Выберите действие:\n🏖 Отпуск\n🌙 AFK\n✅ Выйти").setImage(CONFIG.IMAGE).setColor("#2f3136");
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("afk_vacation").setLabel("🏖 Отпуск").setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId("afk_on").setLabel("🌙 AFK").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId("afk_off").setLabel("✅ Выйти").setStyle(ButtonStyle.Success));
        return i.reply({ embeds: [embed], components: [row] });
      }
    }

    // === КНОПКИ ЗАЯВОК / ТИРА / АФК / БАЛЛОВ (ОБЩЕДОСТУПНЫЕ) ===
    if (i.isButton() && i.customId === "tier_start_btn") {
      const sel = new StringSelectMenuBuilder().setCustomId("tier_select_lvl").setPlaceholder("Выбери тир").addOptions(new StringSelectMenuOptionBuilder().setLabel("Tier 1").setValue("1"), new StringSelectMenuOptionBuilder().setLabel("Tier 2").setValue("2"), new StringSelectMenuOptionBuilder().setLabel("Tier 3").setValue("3"));
      return i.reply({ content: "Выбери тир:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }

    if (i.isStringSelectMenu() && i.customId === "tier_select_lvl") {
      const modal = new ModalBuilder().setCustomId(`modal_tier_${i.values[0]}`).setTitle(`Заявка на Tier ${i.values[0]}`);
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t_nick").setLabel("Ник/Статик").setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t_skills").setLabel("Откат/Навыки").setStyle(TextInputStyle.Paragraph).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("t_sayga").setLabel("Сайга").setStyle(TextInputStyle.Short).setRequired(true)));
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("modal_tier_")) {
      const logChannel = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle(`🎯 ЗАЯВКА НА TIER ${i.customId.split("_")[2]}`).setColor("#8A2BE2").addFields({ name: "👤", value: `${i.user}` }, { name: "📝", value: i.fields.getTextInputValue("t_nick") }, { name: "📊", value: "⏳ Ожидание" });
      const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_tier_${i.user.id}_${i.customId.split("_")[2]}`).setLabel(`✅ Одобрить`).setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
      await logChannel.send({ embeds: [emb], components: [row1] });
      return i.reply({ content: "✅ Отправлено!", ephemeral: true });
    }

    // === АДМИН-КНОПКИ В ЛОГАХ ===
    if (i.isButton() && i.customId.startsWith("adm_")) {
      if (!hasAdminPerms(i.member)) return i.reply({ content: "❌ У тебя нет прав нажимать эти кнопки.", ephemeral: true });
      
      const [ , action, type, uid, val1, val2] = i.customId.split("_");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const embed = EmbedBuilder.from(i.message.embeds[0]);

      if (action === "watch") {
        const fields = embed.data.fields.map(f => f.name === "📊" ? {name:"📊", value:`👀 Проверяет ${i.user.username}`} : f);
        embed.setColor("Blue").setFields(fields);
        if (target) target.send("👀 Заявка на рассмотрении!").catch(()=>{});
        return i.update({ embeds: [embed] });
      }

      if (action === "ok") {
        if (type === "pts") { addPoints(uid, parseInt(val1)); if(target) target.send(`✅ +**${val1}** 💎`).catch(()=>{}); } 
        else if (type === "rank") { addPoints(uid, -parseInt(val2)); if(target) target.send(`🎉 Повышен до **${val1}**!`).catch(()=>{}); }
        else if (type === "fam") { await target?.roles.add(CONFIG.ROLE_ACCEPTED_ID).catch(()=>{}); if(target) target.send("🎉 Принят!").catch(()=>{}); }
        else if (type === "tier") { await target?.roles.remove(Object.values(CAPT_CONFIG.TIERS)).catch(()=>{}); await target?.roles.add(CAPT_CONFIG.TIERS[val1]).catch(()=>{}); if(target) target.send(`🎯 Выдан **Tier ${val1}**!`).catch(()=>{}); }
        const fields = embed.data.fields.map(f => f.name === "📊" ? {name:"📊", value:`✅ Одобрено (${i.user.username})`} : f);
        embed.setColor("Green").setFields(fields);
        return i.update({ embeds: [embed], components: [] });
      }

      if (action === "no") {
        const modal = new ModalBuilder().setCustomId(`rej_modal_${uid}_${i.message.id}`).setTitle("Причина отказа");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Причина").setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return i.showModal(modal);
      }
    }

    if (i.isModalSubmit() && i.customId.startsWith("rej_modal_")) {
      const [,, uid, mid] = i.customId.split("_");
      const msg = await i.channel.messages.fetch(mid).catch(() => null);
      if (msg) {
        const emb = EmbedBuilder.from(msg.embeds[0]).setColor("Red");
        const fields = msg.embeds[0].fields.map(f => f.name === "📊" ? {name:"📊", value:`❌ Отказ: ${i.fields.getTextInputValue("reason")} (${i.user.username})`} : f);
        emb.setFields(fields);
        await msg.edit({ embeds: [emb], components: [] });
      }
      return i.reply({ content: "Статус: Отказано.", ephemeral: true });
    }

    // === КАПТЫ ===
    const removeFromCapt = (id) => { ["tier1", "tier2", "tier3", "subs"].forEach(t => currentCapt[t] = currentCapt[t].filter(u => u !== id)); };
    const getTier = (member) => member?.roles.cache.has(CAPT_CONFIG.TIERS["1"]) ? "tier1" : member?.roles.cache.has(CAPT_CONFIG.TIERS["2"]) ? "tier2" : "tier3";

    if (i.isButton() && i.customId.startsWith("capt_")) {
      if (i.customId === "capt_remove" || i.customId === "capt_force") {
         if (!hasAdminPerms(i.member)) return i.reply({ content: "❌ У вас нет прав.", ephemeral: true });
         const modal = new ModalBuilder().setCustomId(`modal_${i.customId}`).setTitle("ID игрока");
         modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_id").setLabel("ID").setStyle(TextInputStyle.Short).setRequired(true)));
         return i.showModal(modal);
      }
      if (!i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID)) return i.reply({ content: "❌ Вы не в семье!", ephemeral: true });
      
      removeFromCapt(i.user.id);
      if (i.customId === "capt_plus") currentCapt[getTier(i.member)].push(i.user.id);
      if (i.customId === "capt_sub") currentCapt.subs.push(i.user.id);
      return i.update({ embeds: [buildCaptEmbed()] });
    }

    if (i.isModalSubmit() && i.customId.startsWith("modal_capt_")) {
      const targetId = i.fields.getTextInputValue("target_id");
      removeFromCapt(targetId);
      if (i.customId === "modal_capt_force") {
        const tm = await i.guild.members.fetch(targetId).catch(()=>null);
        if(tm) currentCapt[getTier(tm)].push(targetId);
      }
      await i.message.edit({ embeds: [buildCaptEmbed()] });
      return i.reply({ content: "✅ Выполнено", ephemeral: true });
    }

    // === ОСТАЛЬНЫЕ МЕНЮ (Заработок, Анкета, Отпуск) ===
    // ... остальной код для заработка, анкеты и отпуска такой же, как в предыдущей версии
    if (i.isButton() && i.customId === "earn_btn") {
      const sel = new StringSelectMenuBuilder().setCustomId("earn_select").setPlaceholder("Что сделал?").addOptions(EARN_OPTIONS.map(o => new StringSelectMenuOptionBuilder().setLabel(o.label).setValue(o.value)));
      return i.reply({ content: "Выбери:", components: [new ActionRowBuilder().addComponents(sel)], ephemeral: true });
    }
    if (i.isStringSelectMenu() && i.customId === "earn_select") {
      const modal = new ModalBuilder().setCustomId(`me_${i.values[0]}`).setTitle("Отчет");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e1").setLabel("Ник/статик").setStyle(TextInputStyle.Short)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e2").setLabel("Док-ва").setStyle(TextInputStyle.Short)));
      return i.showModal(modal);
    }
    if (i.isModalSubmit() && i.customId.startsWith("me_")) {
      const task = EARN_OPTIONS.find(o => o.value === i.customId.replace("me_", ""));
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("💰 ОТЧЕТ").setColor("Yellow").addFields({ name: "👤", value: `${i.user}` }, { name: "🛠", value: task.label }, { name: "📊", value: "⏳ Ожидание" });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_pts_${i.user.id}_${i.customId.split("_")[2]}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Отправлено!", ephemeral: true });
    }
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("modal_apply").setTitle("Анкета");
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a1").setLabel("Ник, Возраст, Статик").setStyle(TextInputStyle.Short).setRequired(true)));
      return i.showModal(modal);
    }
    if (i.isModalSubmit() && i.customId === "modal_apply") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("📩 НОВАЯ ЗАЯВКА").setColor("#ff0000").addFields({ name: "👤", value: `${i.user}` }, { name: "📝", value: i.fields.getTextInputValue("a1") }, { name: "📊", value: "⏳ Ожидание" });
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`adm_ok_fam_${i.user.id}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger));
      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "✅ Заявка отправлена!", ephemeral: true });
    }
    if (i.isButton() && i.customId === "balance_btn") return i.reply({ content: `💎 Баланс: **${getPoints(i.user.id)}**`, ephemeral: true });
  } catch (e) { console.error(e); }
});

client.login(process.env.TOKEN);