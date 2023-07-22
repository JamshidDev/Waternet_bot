
const { Bot, session, MemorySessionStorage, Keyboard, InlineKeyboard } = require("grammy");
const { Menu, MenuRange } = require("@grammyjs/menu");
const { freeStorage } = require("@grammyjs/storage-free");
require('dotenv').config()
const {
    conversations,
    createConversation,
} = require("@grammyjs/conversations");
const { phone } = require('phone');
const Service = require('./services/service.js')




const bot_token = process.env.BOT_TOKEN;
const bot = new Bot(bot_token);



bot.use(session({
    type: "multi",
    freeStorage_db: {
        initial: () => {
            return {
                client_id: null,
                is_register: false,
                phone_number: null,
                login: null,
                pasword: null,
            }
        },
        storage: freeStorage(bot_token)
    },
    conversation: {},
}));



bot.use(conversations());
bot.use(createConversation(user_registretion));


// register conversation
async function user_registretion(conversation, ctx) {
    await ctx.reply(" Salom, " + ctx.from.first_name + ".\nBotdan foydalanish uchun <b>waternet.uz</b> dan ro'yhatdan o'tgan <b>loginizni</b> kiriting"
        , {
            parse_mode: "HTML",
            reply_markup: { remove_keyboard: true }
        });

    let user_login = await conversation.wait();
    await ctx.reply(" 🔐 Parolingizni kiriting...");
    let user_pasword = await conversation.wait();

    await ctx.reply("⏰ Iltimos kuting...")
    conversation.session.freeStorage_db.login = user_login.message.text;
    conversation.session.freeStorage_db.password = user_pasword.message.text;
    let data = {
        login: user_login.message.text,
        password: user_pasword.message.text,
    }
    // user login 
    const [error, response] = await Service.login_user({ data })

    if (!error) {
        let client_id = response.id;
        conversation.session.freeStorage_db.client_id = response.id;
        console.log(response.id);

        await ctx.reply("✍️ To'liq Ism sharifingizni kiriting");
        let full_name = await conversation.wait();


        await ctx.reply("📞 Telefon raqamingizni kiriting \n Format: 977716004", {
            reply_markup: user_phone_menu
        });
        ctx = await conversation.wait();


        if (!validate_puhone_number(ctx, conversation)) {
            do {
                await ctx.reply("⚠️ Noto'g'ri formatdagi telefon raqam! \n Format: 977716004", {
                    reply_markup: user_phone_menu
                });
                ctx = await conversation.wait();
            } while (!validate_puhone_number(ctx, conversation));
        }
        await ctx.reply("✅ Ma'lumotlar qabul qilindi. Kuting...");
        //    user register
        let data = {
            fullname: full_name.message.text,
            phone: ctx.session.freeStorage_db.phone_number,
            chat_id: ctx.chat.id,
        }


        const [reg_err, reg_res] = await Service.register_user({ client_id, data });

        if (!reg_err) {
            conversation.session.freeStorage_db.is_register = true;
            await ctx.reply("<i>Siz bo'tdan to'liq foydalana olasiz!</i>\n <b>Asosiy menu</b>", {
                reply_markup: main_menu,
                parse_mode: "HTML",
            })
            return

        } else {
            const re_register = new InlineKeyboard().text("🔙 Qayta login qilish", "restart_login")
            await ctx.reply("⚠️ Ro'yhatga olish vaqtida kutilmagan xatolik yuz berdi...", {
                reply_markup: re_register
            })
            return
        }




    } else {
        // user login error
        const re_register = new InlineKeyboard().text("🔙 Qayta login qilish", "restart_login")
        ctx.reply("⚠️ Parol yoki login noto'g'ri", {
            reply_markup: re_register
        })
        return
    }


}








// validate phone number
function validate_puhone_number(ctx, conversation) {
    if (ctx?.message?.contact) {
        conversation.session.freeStorage_db.phone_number = ctx?.message.contact.phone_number;
        return true
    } else {
        let reg = new RegExp('^[012345789][0-9]{8}$')
        if (reg.test(ctx?.message.text)) {
            conversation.session.freeStorage_db.phone_number = ctx?.message.text;
        }
        return reg.test(ctx?.message.text)
    }
}








const pm = bot.chatType("private");

const main_menu = new Keyboard()
    .text("🛍 Mahsulotlar")
    .row()
    .text("ℹ️ Ma'lumotlarim")
    .text("📑 Buyurtmalarim")
    .row()
    .text("🔙 Profildan chiqish")
    .placeholder("Asosiy menu")


const user_phone_menu = new Keyboard()
    .requestContact("Telefon raqam")
    .resized()





pm.command("start", async (ctx) => {
    console.log(ctx.session.freeStorage_db.client_id);
    if (ctx.session.freeStorage_db.is_register) {
        await ctx.reply("<b>Asosiy menu</b>", {
            reply_markup: main_menu,
            parse_mode: "HTML",
        })
    } else {
        await ctx.conversation.enter("user_registretion");
    }

})

pm.on("callback_query:data", async (ctx) => {
    if (ctx.callbackQuery.data == 'restart_login') {
        await ctx.conversation.enter("user_registretion");
    }
    await ctx.answerCallbackQuery(); // remove loading animation
});





pm.hears("ℹ️ Ma'lumotlarim", async (ctx) => {
    let client_id = ctx.session.freeStorage_db.client_id;
    const [info_err, info_res] = await Service.user_info({ client_id })
    if (!info_err) {
        await ctx.reply("<b>Ism:</b> " + info_res.fullname + "\n<b>Balanc:</b> " + info_res.balance + "\n<b>Idish qarzlar:</b> " + info_res.container +
            "\n<b>Telefon raqam:</b> " + info_res.phone + "\n<b>Organizatssiya:</b> " + info_res.organization.name
            , {
                parse_mode: "HTML",
            })
    } else {
        ctx.reply("⚠️ Server xatosi")
    }


})



const my_order_menu = new Menu("dynamic");


pm.use(my_order_menu);
// bot.use(menu);


pm.hears("📑 Buyurtmalarim", async (ctx) => {
    let client_id = ctx.session.freeStorage_db.client_id;

    const [info_err, info_res] = await Service.orders({ client_id })

    if (!info_err) {
        my_order_menu.dynamic(() => {
            let range = new MenuRange();

            info_res.forEach(({ product }) => {
                range
                    .text(product.name + " | " + product.product_count + " | " + "20-09-2023", (ctx) => ctx.reply(`You chose 1`))
                    .row();
            });
            return range;

        })

        await ctx.reply("📑 Buyurtmalarim", {
            reply_markup: my_order_menu,
        });

    } else {
        ctx.reply("⚠️ Server xatosi")
    }

})



// Log out user
pm.hears('🔙 Profildan chiqish', async (ctx) => {
    ctx.session.freeStorage_db.client_id = null;
    ctx.session.freeStorage_db.is_register = false;
    ctx.reply("Log out!", {
        reply_markup: { remove_keyboard: true }
    })
    const re_register = new InlineKeyboard().text("🔙 Qayta login qilish", "restart_login")
    ctx.reply("⚠️ Profildan muvofaqiyatli ravishda chiqdingiz", {
        reply_markup: re_register,

    })
})






















bot.start();