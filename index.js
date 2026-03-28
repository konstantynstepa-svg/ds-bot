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
  StringSelectMenuOptionBuilder
} = require("discord.js");
const fs = require("fs");

/* ================= [ НАСТРОЙКИ ] ================= */
const CONFIG = {
  COMMAND_CHANNEL_ID: "1480220429988659251", 
  MAIN_LOG_CHANNEL: "1480227101905785113",    
  ROLE_ACCEPTED_ID: "1479557914086740104",   
  ROLE_LEADER_ID: "1056945517835341936",     
  MEIN_ROLE_ID: "1480229891789160479",       
  MEIN_PLUS_ROLE_ID: "1479574658935423087",  
  AFK_LOG_CHANNEL: "1480228317222277171",    
  VACATION_ROLE: "1479988454484869271",      
  IMAGE: "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png",
};

// === НАСТРОЙКИ ДЛЯ КАПТОВ ===
const CAPT_CONFIG = {
  CHANNEL_ID: "1480474720683032660", 
  IMAGE_URL: "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png?ex=69c6c8d1&is=69c57751&hm=7791232c5c29f67819312e0a9fb4b390fc136f8dbb1d53c6f800f329f2eca109&",
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

// === НАСТРОЙКИ ДЛЯ ВАРНОВ ===
const WARN_CONFIG = {
  WARN_CMD_CHANNEL: "1480226568449036390",  // Канал для команды !варн
  WORK_CHANNEL: "1480226737718558805",      // Канал "Отработка"
  IMAGE_URL: "https://cdn.discordapp.com/attachments/737990746086441041/1469395625849257994/3330ded1-da51-47f9-a7d7-dee6d1bdc918.png?ex=69c81a51&is=69c6c8d1&hm=0bd530608fad4b8ad05de3506c749490ed9eed1a1c56ac5697acd4dd0faa7504&",
  MANAGEMENT_ROLES: [
    "1056945517835341936",
    "1479566887519129781",
    "1480694180538744912",
    "1479566383003205663",
    "1480694256736669806"
  ],
  REMOVE_COST: 50,           // Цена снятия варна
  BRIBE_COST: 10,            // Взятка боту
  COOLDOWN_MS: 48 * 60 * 60 * 1000 // 48 часов в миллисекундах
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
let db = { points: {}, warnCooldowns: {} }; // Добавили хранилище для кулдаунов варна
if (fs.existsSync("db.json")) db = Object.assign({ points: {}, warnCooldowns: {} }, JSON.parse(fs.readFileSync("db.json")));
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

client.once("ready", () => console.log(`🚀 Бот ${client.user.tag} готов! Логи -> ${CONFIG.MAIN_LOG_CHANNEL}`));

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

/* ================= [ КОМАНДЫ ] ================= */
client.on("messageCreate", async msg => {
  if (msg.author.bot) return;

  if (msg.content.startsWith("!give")) {
    if (!msg.member.roles.cache.has(CONFIG.ROLE_LEADER_ID)) return msg.reply("❌ Нет прав");
    const user = msg.mentions.users.first();
    const amount = parseInt(msg.content.split(" ")[2]);
    if (!user || isNaN(amount)) return msg.reply("Используй: !give @user 50");
    addPoints(user.id, amount);
    return msg.reply(`✅ Выдано ${amount} 💎 игроку ${user}`);
  }

  if (msg.content === "!menu") {
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
    msg.channel.send({ embeds: [embed], components: [row] });
  }

  if (msg.content === "!заявка" && msg.channel.id === CONFIG.COMMAND_CHANNEL_ID) {
    const embed = new EmbedBuilder()
        .setTitle("📝 ЗАЯВКА В СЕМЬЮ")
        .setDescription("Нажми на кнопку ниже, чтобы заполнить анкету.")
        .setImage(CONFIG.IMAGE)
        .setColor("#ff0000");
    const btn = new ButtonBuilder().setCustomId("apply_start").setLabel("Подать заявку").setStyle(ButtonStyle.Danger);
    msg.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
  }

  if (msg.content === "!afk") {
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

    msg.channel.send({ embeds: [afkEmbed], components: [row] });
  }

  // === КАПТЫ ===
  if (msg.content === "!startcapt") {
    const hasMgmtRole = CAPT_CONFIG.MANAGEMENT_ROLES.some(r => msg.member.roles.cache.has(r));
    if (!hasMgmtRole) return msg.reply("❌ У вас нет прав для создания сбора на капт.");
    currentCapt = { tier1: [], tier2: [], tier3: [], subs: [] };
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("capt_plus").setLabel("Плюс на капт").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("capt_sub").setLabel("Плюс в замену").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("capt_minus").setLabel("Отмена плюса").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("capt_force").setLabel("Вписать").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("capt_remove").setLabel("Удалить с капта").setStyle(ButtonStyle.Danger)
    );
    msg.channel.send({ embeds: [buildCaptEmbed()], components: [row] });
    msg.delete().catch(()=>{});
  }

  if (msg.content.startsWith("!капт")) {
    const hasMgmtRole = CAPT_CONFIG.MANAGEMENT_ROLES.some(r => msg.member.roles.cache.has(r));
    if (!hasMgmtRole) return; 
    msg.delete().catch(()=>{});
    const time = msg.content.split(" ").slice(1).join(" ") || "скоро";
    await msg.guild.members.fetch();
    const membersToAlert = msg.guild.members.cache.filter(m => m.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && !m.user.bot);
    const alertEmbed = new EmbedBuilder()
      .setTitle("🚨 ВНИМАНИЕ: КАПТ!")
      .setDescription(`Сбор в войсе через: **${time}**\nЗаходи в игру!`)
      .setImage(CAPT_CONFIG.IMAGE_URL)
      .setColor("Red");

    membersToAlert.forEach(async (member) => { try { await member.send({ embeds: [alertEmbed] }); } catch (err) {} });
    msg.author.send(`✅ Оповещено пользователей: ~${membersToAlert.size}`).catch(()=>{});
  }

  // === ВАРНЫ (ВЫЗОВ МЕНЮ) ===
  if (msg.content === "!варн") {
    const hasMgmtRole = WARN_CONFIG.MANAGEMENT_ROLES.some(r => msg.member.roles.cache.has(r));
    if (!hasMgmtRole) return msg.reply("❌ У вас нет прав для управления варнами.");
    
    const embed = new EmbedBuilder()
      .setTitle("⚠️ Панель управления Варнами")
      .setDescription("Нажмите кнопку ниже, чтобы выписать игроку варн.")
      .setImage(WARN_CONFIG.IMAGE_URL)
      .setColor("DarkRed");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("warn_issue_btn").setLabel("Выдать варн").setStyle(ButtonStyle.Danger)
    );
    msg.channel.send({ embeds: [embed], components: [row] });
    msg.delete().catch(()=>{});
  }
});

/* ================= [ ВЗАИМОДЕЙСТВИЯ ] ================= */
client.on("interactionCreate", async i => {
  try {
    // ==========================================
    // ВАРНЫ: ВЫДАЧА И ОТРАБОТКА
    // ==========================================
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

      const otrabotkaChannel = await i.guild.channels.fetch(WARN_CONFIG.WORK_CHANNEL);
      const embed = new EmbedBuilder()
        .setTitle("🛑 ПОЛУЧЕН ВАРН")
        .setColor("Red")
        .setImage(WARN_CONFIG.IMAGE_URL)
        .addFields(
          { name: "👮 Выдал", value: `${i.user}`, inline: true },
          { name: "👤 Нарушитель", value: `<@${targetId}>`, inline: true },
          { name: "📝 Причина", value: reason, inline: false },
          { name: "🛠 Как отработать", value: task, inline: false }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`w_rem_task_${targetId}`).setLabel("Снять заданием").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`w_appeal_${targetId}`).setLabel("Обжаловать").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`w_rem_pts_${targetId}`).setLabel(`Снять за ${WARN_CONFIG.REMOVE_COST} баллов`).setStyle(ButtonStyle.Primary)
      );

      await otrabotkaChannel.send({ content: `<@${targetId}>, у тебя проблемы!`, embeds: [embed], components: [row] });
      return i.reply({ content: `✅ Варн успешно выдан игроку <@${targetId}>.`, ephemeral: true });
    }

    // Снятие варна: общие проверки
    if (i.isButton() && i.customId.startsWith("w_")) {
      const action = i.customId.split("_").slice(0, 3).join("_"); // e.g. w_rem_pts
      const targetId = i.customId.split("_").pop();

      // Проверка на того ли нажимают и есть ли нужная роль
      if (i.user.id !== targetId && action !== "bribe_bot_pay" && action !== "bribe_bot_no") {
         return i.reply({ content: "❌ Это не твой варн!", ephemeral: true });
      }
      if (!i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID) && action !== "bribe_bot_pay" && action !== "bribe_bot_no") {
         return i.reply({ content: "❌ Тебе нужна роль 'Принятого', чтобы отрабатывать варны.", ephemeral: true });
      }

      // Кнопка: Снять заданием (отправка отчета)
      if (action === "w_rem_task") {
        const modal = new ModalBuilder().setCustomId(`modal_w_task_${targetId}`).setTitle("Отчет о снятии варна");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("proof").setLabel("Ссылка на доказательства (скрин/видео)").setStyle(TextInputStyle.Short).setRequired(true)));
        return i.showModal(modal);
      }

      // Кнопка: Обжаловать
      if (action === "w_appeal") {
        const modal = new ModalBuilder().setCustomId(`modal_w_app_${targetId}`).setTitle("Обжалование варна");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Почему варн выдан неверно?").setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return i.showModal(modal);
      }

      // Кнопка: Снять за баллы (СИСТЕМА ВЗЯТОК И КД)
      if (action === "w_rem_pts") {
        const cooldown = getWarnCooldown(i.user.id);
        const now = Date.now();

        if (now < cooldown) {
          // ИГРОК НА КД! ЗАПУСКАЕМ СХЕМУ С ВЗЯТКОЙ
          const hoursLeft = Math.ceil((cooldown - now) / (1000 * 60 * 60));
          
          const embed = new EmbedBuilder()
            .setTitle("🚨 АХ ТЫ ЗАХОТЕЛ ОБМАНУТЬ KENZO!")
            .setDescription(`Ты уже снимал варн за баллы недавно! До следующего легального снятия осталось: **${hoursLeft} часов**.\n\nПоскольку ты гавнюк и пытаешься обойти систему, у тебя два пути:\n💵 **Плати мне (боту) ${WARN_CONFIG.BRIBE_COST} баллов**, и я забуду, что ты тут нажимал.\n❌ Либо жми **"Денег нет"**, и я прямо сейчас иду сливать всё Kenzo в ЛС!`)
            .setColor("DarkRed");

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`bribe_bot_pay_${targetId}`).setLabel(`Заплатить ${WARN_CONFIG.BRIBE_COST} баллов`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`bribe_bot_no_${targetId}`).setLabel("Денег нет...").setStyle(ButtonStyle.Danger)
          );

          return i.reply({ embeds: [embed], components: [row], ephemeral: true });
        } else {
          // ЛЕГАЛЬНОЕ СНЯТИЕ
          const balance = getPoints(i.user.id);
          if (balance < WARN_CONFIG.REMOVE_COST) {
             return i.reply({ content: `❌ У тебя не хватает баллов! Нужно: ${WARN_CONFIG.REMOVE_COST}, а у тебя: ${balance}.`, ephemeral: true });
          }
          addPoints(i.user.id, -WARN_CONFIG.REMOVE_COST);
          setWarnCooldown(i.user.id); // Вешаем кд на 48 часов

          // Обновляем сообщение с варном
          const msgEmbed = EmbedBuilder.from(i.message.embeds[0])
            .setColor("Green")
            .addFields({ name: "✅ СТАТУС", value: `Варн снят за ${WARN_CONFIG.REMOVE_COST} баллов.` });
          await i.message.edit({ embeds: [msgEmbed], components: [] });

          return i.reply({ content: `✅ Варн успешно снят! Списано ${WARN_CONFIG.REMOVE_COST} баллов. В следующий раз снять варн за баллы можно будет через 48 часов.`, ephemeral: true });
        }
      }
    }

    // Обработка кнопок взятки боту
    if (i.isButton() && i.customId.startsWith("bribe_bot_")) {
      const isPay = i.customId.includes("_pay_");
      const balance = getPoints(i.user.id);

      if (isPay) {
        if (balance >= WARN_CONFIG.BRIBE_COST) {
          addPoints(i.user.id, -WARN_CONFIG.BRIBE_COST);
          return i.update({ embeds: [new EmbedBuilder().setColor("Green").setDescription("😎 Отлично. Баллы списаны. Я нем как рыба. Гуляй.")], components: [] });
        } else {
          // Нажал заплатить, а денег нет
          client.users.fetch(CAPT_CONFIG.OWNER_ID).then(owner => {
            owner.send(`⚠️ **Kenzo, тут крыса!** Игрок ${i.user} (\`${i.user.tag}\`) пытался снять варн в обход кулдауна, хотел дать мне взятку, но оказался нищим (даже 10 баллов нет)! Разберись с ним!`).catch(()=>{});
          }).catch(()=>{});
          return i.update({ embeds: [new EmbedBuilder().setColor("Red").setDescription("🤬 ТЫ ХОТЕЛ МЕНЯ ОБМАНУТЬ СУКИН СЫН! Денег у тебя нет! Я уже написал Kenzo, жди беды.")], components: [] });
        }
      } else {
        // Нажал "Денег нет"
        client.users.fetch(CAPT_CONFIG.OWNER_ID).then(owner => {
          owner.send(`⚠️ **Kenzo, тут нарушитель!** Игрок ${i.user} (\`${i.user.tag}\`) пытался снять варн в обход кулдауна. Денег на взятку мне у него нет. Принимай меры.`).catch(()=>{});
        }).catch(()=>{});
        return i.update({ embeds: [new EmbedBuilder().setColor("DarkRed").setDescription("🤡 Ну всё, пиши пропало. Я сдал тебя Kenzo со всеми потрохами.")], components: [] });
      }
    }

    // Обработка модалок варна (Обжаловать / Док-ва)
    if (i.isModalSubmit() && (i.customId.startsWith("modal_w_task_") || i.customId.startsWith("modal_w_app_"))) {
      const isTask = i.customId.includes("_task_");
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      
      const emb = new EmbedBuilder()
        .setTitle(isTask ? "🛠 ЗАПРОС НА СНЯТИЕ ВАРНА (ЗАДАНИЕ)" : "⚖️ ОБЖАЛОВАНИЕ ВАРНА")
        .setColor(isTask ? "Blue" : "Orange")
        .addFields(
          { name: "👤 Игрок", value: `${i.user}` },
          { name: isTask ? "🔗 Док-ва" : "📝 Причина обжалования", value: isTask ? i.fields.getTextInputValue("proof") : i.fields.getTextInputValue("reason") },
          { name: "📊 Статус", value: "⏳ Ожидание проверки руководством" }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_warnrem_${i.user.id}`).setLabel("✅ Одобрить снятие").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );

      await log.send({ embeds: [emb], components: [row] });
      
      // Удаляем кнопки у оригинального сообщения с варном в канале отработки
      await i.message.edit({ components: [] }).catch(()=>{});
      return i.reply({ content: "✅ Ваш запрос отправлен руководству на рассмотрение!", ephemeral: true });
    }

    // ==========================================
    // СТАРЫЕ ВЗАИМОДЕЙСТВИЯ (Капты, Заявки и тд)
    // ==========================================
    
    // Капты: Удалить (Писюн маринованный)
    if (i.isButton() && i.customId === "capt_remove") {
      const hasPerm = CAPT_CONFIG.REMOVE_ROLES.some(r => i.member.roles.cache.has(r));
      if (!hasPerm) {
        client.users.fetch(CAPT_CONFIG.OWNER_ID).then(owner => {
          owner.send(`⚠️ **Стук-стук!** Игрок ${i.user} (\`${i.user.tag}\`) попытался нажать кнопку "Удалить с капта" без прав!`).catch(()=>{});
        }).catch(()=>{});
        return i.reply({ content: "АХ ТЫ ПИСЮН МАРИНОВАНЫЙ РЕШИЛ Удалить кавото я все Kenzo раскажу", ephemeral: true });
      }
      const modal = new ModalBuilder().setCustomId("modal_capt_remove").setTitle("Удалить с капта");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_id").setLabel("Discord ID пользователя").setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("reason").setLabel("Причина удаления").setStyle(TextInputStyle.Short).setRequired(true))
      );
      return i.showModal(modal);
    }

    if (i.isButton() && i.customId.startsWith("capt_")) {
      if (i.customId !== "capt_force" && !i.member.roles.cache.has(CONFIG.ROLE_ACCEPTED_ID)) return i.reply({ content: "❌ Вы не состоите в семье!", ephemeral: true });
      const userId = i.user.id;
      const removeFromCapt = (id) => {
        currentCapt.tier1 = currentCapt.tier1.filter(u => u !== id);
        currentCapt.tier2 = currentCapt.tier2.filter(u => u !== id);
        currentCapt.tier3 = currentCapt.tier3.filter(u => u !== id);
        currentCapt.subs = currentCapt.subs.filter(u => u !== id);
      };
      const getTier = (member) => {
        if (member.roles.cache.has(CAPT_CONFIG.TIERS["1"])) return "tier1";
        if (member.roles.cache.has(CAPT_CONFIG.TIERS["2"])) return "tier2";
        if (member.roles.cache.has(CAPT_CONFIG.TIERS["3"])) return "tier3";
        return "tier3"; 
      };

      if (i.customId === "capt_plus") { removeFromCapt(userId); currentCapt[getTier(i.member)].push(userId); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_sub") { removeFromCapt(userId); currentCapt.subs.push(userId); await i.update({ embeds: [buildCaptEmbed()] }); }
      if (i.customId === "capt_minus") { removeFromCapt(userId); await i.update({ embeds: [buildCaptEmbed()] }); }
      
      if (i.customId === "capt_force") {
        const hasMgmtRole = CAPT_CONFIG.MANAGEMENT_ROLES.some(r => i.member.roles.cache.has(r));
        if (!hasMgmtRole) return i.reply({ content: "❌ У вас нет прав для этой кнопки.", ephemeral: true });
        const modal = new ModalBuilder().setCustomId("modal_capt_force").setTitle("Вписать участника");
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("target_id").setLabel("Discord ID пользователя").setStyle(TextInputStyle.Short).setRequired(true)));
        return i.showModal(modal);
      }
    }

    if (i.isModalSubmit() && i.customId === "modal_capt_force") {
      const targetId = i.fields.getTextInputValue("target_id");
      try {
        const targetMember = await i.guild.members.fetch(targetId);
        currentCapt.tier1 = currentCapt.tier1.filter(u => u !== targetId);
        currentCapt.tier2 = currentCapt.tier2.filter(u => u !== targetId);
        currentCapt.tier3 = currentCapt.tier3.filter(u => u !== targetId);
        currentCapt.subs = currentCapt.subs.filter(u => u !== targetId);

        let tier = "tier3";
        if (targetMember.roles.cache.has(CAPT_CONFIG.TIERS["1"])) tier = "tier1";
        else if (targetMember.roles.cache.has(CAPT_CONFIG.TIERS["2"])) tier = "tier2";
        
        currentCapt[tier].push(targetId);
        await i.message.edit({ embeds: [buildCaptEmbed()] });
        return i.reply({ content: `✅ Пользователь ${targetMember.user.tag} успешно вписан!`, ephemeral: true });
      } catch (err) { return i.reply({ content: "❌ Пользователь не найден на сервере или указан неверный ID.", ephemeral: true }); }
    }

    if (i.isModalSubmit() && i.customId === "modal_capt_remove") {
      const targetId = i.fields.getTextInputValue("target_id");
      const reason = i.fields.getTextInputValue("reason");
      currentCapt.tier1 = currentCapt.tier1.filter(u => u !== targetId);
      currentCapt.tier2 = currentCapt.tier2.filter(u => u !== targetId);
      currentCapt.tier3 = currentCapt.tier3.filter(u => u !== targetId);
      currentCapt.subs = currentCapt.subs.filter(u => u !== targetId);
      await i.message.edit({ embeds: [buildCaptEmbed()] });
      return i.reply({ content: `🧹 Игрок <@${targetId}> удален из списков капта.\n**Причина:** ${reason}`, ephemeral: true });
    }

    // Заработок баллов
    if (i.isButton() && i.customId === "earn_btn") {
      const selectMenu = new StringSelectMenuBuilder().setCustomId("earn_select").setPlaceholder("Что ты сделал?");
      EARN_OPTIONS.forEach(opt => selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(opt.label).setValue(opt.value)));
      return i.reply({ content: "Выбери выполненную работу из списка:", components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
    }

    if (i.isStringSelectMenu() && i.customId === "earn_select") {
      const val = i.values[0];
      const modal = new ModalBuilder().setCustomId(`me_${val}`).setTitle("Отчет о работе");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e1").setLabel("Ник и статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("e2").setLabel("Ссылка на доказательства").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("me_")) {
      const taskKey = i.customId.replace("me_", "");
      const task = EARN_OPTIONS.find(o => o.value === taskKey);
      const points = taskKey.split("_")[1];
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      
      const emb = new EmbedBuilder().setTitle("💰 ОТЧЕТ НА БАЛЛЫ").setColor("Yellow")
        .addFields({ name: "👤 Игрок", value: `${i.user}` }, { name: "🛠 Работа", value: task.label }, { name: "📝 Инфо", value: i.fields.getTextInputValue("e1") }, { name: "🔗 Док-ва", value: i.fields.getTextInputValue("e2") }, { name: "📊 Статус", value: "⏳ Ожидание" }).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_pts_${i.user.id}_${points}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );

      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Ваш отчет успешно отправлен на проверку!", ephemeral: true });
    }

    // Заявка в фаму
    if (i.isButton() && i.customId === "apply_start") {
      const modal = new ModalBuilder().setCustomId("modal_apply").setTitle("Анкета в семью");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a1").setLabel("Ник / Имя / Возраст").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a2").setLabel("Суточный онлайн и уровень").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a3").setLabel("В каких семьях были?").setStyle(TextInputStyle.Paragraph)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a4").setLabel("Как узнал о семье?").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("a5").setLabel("Откат тяги / спешик").setStyle(TextInputStyle.Paragraph))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_apply") {
      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const embed = new EmbedBuilder().setTitle("📩 НОВАЯ ЗАЯВКА В СЕМЬЮ").setColor("#ff0000")
        .addFields({ name: "👤 Отправитель", value: `${i.user}` }, { name: "📝 Ник / Возраст", value: i.fields.getTextInputValue("a1") }, { name: "🕒 Онлайн/лвл", value: i.fields.getTextInputValue("a2") }, { name: "🏠 Прошлые семьи", value: i.fields.getTextInputValue("a3") }, { name: "🌍 Источник", value: i.fields.getTextInputValue("a4") }, { name: "🔫 Навыки", value: i.fields.getTextInputValue("a5") }, { name: "📊 Статус", value: "⏳ Ожидание" }).setTimestamp();
      
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_fam_${i.user.id}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );
      await log.send({ embeds: [embed], components: [row] });
      return i.reply({ content: "✅ Ваша заявка отправлена!", ephemeral: true });
    }

    // Запрос повышения
    if (i.isButton() && i.customId === "rankup_btn") {
      const modal = new ModalBuilder().setCustomId("modal_rankup").setTitle("Повышение");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r1").setLabel("Ник и статик").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r2").setLabel("Видео (Откат)").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("r3").setLabel("Ранг (3 или 4)").setStyle(TextInputStyle.Short))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_rankup") {
      const rank = i.fields.getTextInputValue("r3");
      const cost = RANK_COSTS[rank];
      if (!cost || getPoints(i.user.id) < cost) return i.reply({ content: `❌ Недостаточно баллов! Нужно: ${cost}`, ephemeral: true });

      const log = await i.guild.channels.fetch(CONFIG.MAIN_LOG_CHANNEL);
      const emb = new EmbedBuilder().setTitle("📈 ЗАПРОС ПОВЫШЕНИЯ").setColor("Green")
        .addFields({ name: "👤 Игрок", value: `${i.user}` }, { name: "🎖 Ранг", value: rank }, { name: "🎬 Видео", value: i.fields.getTextInputValue("r2") }, { name: "📊 Статус", value: "⏳ Ожидание" }).setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`adm_ok_rank_${i.user.id}_${rank}_${cost}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
      );

      await log.send({ embeds: [emb], components: [row] });
      return i.reply({ content: "Заявка на повышение отправлена!", ephemeral: true });
    }

    // АДМИН-КНОПКИ
    if (i.isButton() && i.customId.startsWith("adm_")) {
      const [ , action, type, uid, val1, val2] = i.customId.split("_");
      const target = await i.guild.members.fetch(uid).catch(() => null);
      const embed = EmbedBuilder.from(i.message.embeds[0]);

      if (action === "watch") {
        const fields = embed.data.fields.map(f => f.name === "📊 Статус" ? {name:"📊 Статус", value:`👀 Проверяет ${i.user.username}`} : f);
        embed.setColor("Blue").setFields(fields);
        if (target) target.send("👀 Твоя заявка взята на рассмотрение!").catch(()=>{});
        return i.update({ embeds: [embed] });
      }

      if (action === "ok") {
        if (type === "pts") {
          addPoints(uid, parseInt(val1));
          if (target) target.send(`✅ Отчет принят! +**${val1}** 💎`).catch(()=>{});
        } 
        else if (type === "rank") {
          addPoints(uid, -parseInt(val2));
          if (val1 === "3") await target?.roles.add(CONFIG.MEIN_ROLE_ID).catch(()=>{});
          if (val1 === "4") await target?.roles.add(CONFIG.MEIN_PLUS_ROLE_ID).catch(()=>{});
          if (target) target.send(`🎉 Поздравляем с повышением до **${val1}** ранга!`).catch(()=>{});
        }
        else if (type === "fam") {
          await target?.roles.add(CONFIG.ROLE_ACCEPTED_ID).catch(()=>{});
          if (target) target.send("🎉 Ты принят в семью!").catch(()=>{});
        }
        else if (type === "vac") {
          if (target) {
            const rs = target.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
            afkdb.roles[uid] = rs; saveAfk();
            for (const r of rs) await target.roles.remove(r).catch(() => {});
            await target.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
            target.send("🏖 Твой отпуск одобрен! Хорошего отдыха.").catch(()=>{});
          }
        }
        else if (type === "warnrem") {
           // Одобрено снятие варна через лог канал
           if (target) target.send("✅ Твой запрос на снятие/обжалование варна одобрен!").catch(()=>{});
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
      if (target) target.send(`❌ Твоя заявка отклонена. Причина: ${reason}`).catch(()=>{});
      return i.reply({ content: "Статус обновлен на: Отказано.", ephemeral: true });
    }

    if (i.isButton() && i.customId === "balance_btn") {
        return i.reply({ content: `💎 Ваш текущий баланс: **${getPoints(i.user.id)}** баллов.`, ephemeral: true });
    }
    
    // AFK и Отпуск
    if (i.isButton() && i.customId === "afk_vacation") {
      const modal = new ModalBuilder().setCustomId("modal_vacation").setTitle("Оформление отпуска");
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("v1").setLabel("Даты (с какого по какое)").setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("v2").setLabel("Причина отпуска").setStyle(TextInputStyle.Paragraph))
      );
      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId === "modal_vacation") {
      const dates = i.fields.getTextInputValue("v1");
      const reason = i.fields.getTextInputValue("v2");
      const log = await i.guild.channels.fetch(CONFIG.AFK_LOG_CHANNEL).catch(() => null);
      if (log) {
        const emb = new EmbedBuilder().setTitle("🏖 ЗАПРОС НА ОТПУСК").setColor("Orange")
          .addFields({ name: "👤 Игрок", value: `${i.user}` }, { name: "📅 Даты", value: dates }, { name: "📝 Причина", value: reason }, { name: "📊 Статус", value: "⏳ Ожидание" }).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`adm_watch_req_${i.user.id}`).setLabel("👀 Смотрю").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`adm_ok_vac_${i.user.id}`).setLabel("✅ Принять").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`adm_no_${i.user.id}`).setLabel("❌ Отклонить").setStyle(ButtonStyle.Danger)
        );
        await log.send({ embeds: [emb], components: [row] });
      }
      return i.reply({ content: "🏖 Заявка на отпуск отправлена руководству!", ephemeral: true });
    }

    if (i.isButton() && i.customId === "afk_on") {
        const rs = i.member.roles.cache.filter(r => r.id !== i.guild.id).map(r => r.id);
        afkdb.roles[i.user.id] = rs; saveAfk();
        for (const r of rs) await i.member.roles.remove(r).catch(() => {});
        await i.member.roles.add(CONFIG.VACATION_ROLE).catch(() => {});
        return i.reply({ content: "🌙 Режим AFK включен. Ваши роли сохранены.", ephemeral: true });
    }
    
    if (i.isButton() && i.customId === "afk_off") {
        const saved = afkdb.roles[i.user.id];
        if (!saved) return i.reply({ content: "❌ Вы не находились в режиме AFK или Отпуска.", ephemeral: true });
        for (const r of saved) await i.member.roles.add(r).catch(() => {});
        await i.member.roles.remove(CONFIG.VACATION_ROLE).catch(() => {});
        delete afkdb.roles[i.user.id]; saveAfk();
        return i.reply({ content: "✅ С возвращением! Ваши роли восстановлены.", ephemeral: true });
    }

  } catch (e) { console.error("Ошибка взаимодействия:", e); }
});

client.login(process.env.TOKEN);