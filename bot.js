
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
                product_list: [],
                order_list: [],
            }
        },
        storage: freeStorage(bot_token)
    },
    session_db: {
        initial: () => {
            return {
                product_list: [],
                select_product: null,
                select_order: null,
                select_order_count: null,
                callback_data:null,
            }
        },
        storage: new MemorySessionStorage()
    },
    conversation: {},
}));



bot.use(conversations());
bot.use(createConversation(user_registretion));
bot.use(createConversation(edit_order_conversation));
bot.use(createConversation(create_order_count_conversation));
bot.use(createConversation(comment_conversation));



// register conversation
async function user_registretion(conversation, ctx) {
    await ctx.reply(" Salom ✋.  <b> " + ctx.from.first_name + "</b>.\nBotdan foydalanish uchun <b>waternet.uz</b> dan ro'yhatdan o'tgan <b>loginizni</b> kiriting"
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
            await ctx.reply("<i>Siz botdan to'liq foydalana olasiz!</i> 👏 \n <b>Asosiy menu</b>", {
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

// client order edit conversation 

async function edit_order_conversation(conversation, ctx) {
    ctx.reply("✍️ <b>Mahsulot miqdorini kiriting.</b> \n" +
        "Masalan: 1; 5; 20;  30;", {
            parse_mode:"HTML"
        }
    )

    ctx = await conversation.wait()
    if (validate_number(ctx, conversation)) {
        do {
            await ctx.reply("Noto'g'ri miqdor kiritildi....");
            ctx = await conversation.wait();
        } while (validate_number(ctx, conversation));
    }
    let select_product = await ctx.session.session_db.select_product;
    let client_id = await ctx.session.freeStorage_db.client_id;
    let product_count = +ctx.message.text;
    let data = {
        client_id: client_id,
        order_id: select_product.id,
        product_id: select_product.product.id,
        count: product_count
    }
    const [info_err, info_res] = await Service.edit_orders({ data })

    if (!info_err) {
        ctx.reply("🔄 Yangilandi...");
    } else {
        ctx.reply("⚠️ Server xatosi")
    }

}


async function create_order_count_conversation(conversation, ctx) {
    let select_order = ctx.session.session_db.select_order;
    ctx.reply("Tanlangan Mahsulot \n" +
        "Turi:" + select_order.name +
        "\n Narxi: " + select_order.price +
        `\n \n <i>Buyurtma miqdorini kiriting!
    Masalan 5, 10, 20, ... 1000
    </i>`, {
        parse_mode: "HTML"
    }
    );
    ctx = await conversation.wait()

    if (validate_number(ctx, conversation)) {
        do {
            await ctx.reply("Noto'g'ri miqdor kiritildi....");
            ctx = await conversation.wait();
        } while (validate_number(ctx, conversation));
    }
    conversation.session.session_db.select_order_count = ctx.message.text;
    let client_id = ctx.session.freeStorage_db.client_id;
    let data = {
        client_id: client_id,
        product_id: select_order.id,
        count: ctx.message.text,
        type: 'telegram',
        lat: 0,
        long: 0,
        chat_id:ctx.msg.from.id,
    }


    const change_user_location = new InlineKeyboard()
        .text("Xa", 'location_yes')
        .text("Yo'q", 'location_no')

    await ctx.reply("Lokatsiya kiritasizmi? ", {
        reply_markup: change_user_location
    })
    const response = await conversation.waitForCallbackQuery(["location_yes", "location_no"], {
        otherwise: (ctx) => ctx.reply("Tugmalardan bitasini tanlang!", { reply_markup: change_user_location }),
    });
    await response.answerCallbackQuery();


    if (response.callbackQuery.data == 'location_yes') {
        const get_location_menu = new Keyboard()
            .requestLocation("Lokatsiyani yuborish").resized();

        const over_location = new InlineKeyboard()
            .text("Kerak emas", "over_location")
        await ctx.reply("Lokatsiyani yuboring...", {
            reply_markup: get_location_menu
        })

        ctx = await conversation.wait();
        
        if (ctx.message?.location == undefined) {
            do {
                // await ctx.answerCallbackQuery();
                await ctx.reply("Iltimos lokatsiyani kiritng!", {
                    reply_markup: over_location
                });
                ctx = await conversation.wait();
            } while(checkLocation(ctx));
        }

        let location_cordinate = ctx?.message?.location
        data.lat = location_cordinate ? location_cordinate.latitude : 0;
        data.long = location_cordinate ? location_cordinate.longitude : 0;
        ctx.reply("Kuting...", {
            reply_markup: main_menu
        });
        request_create_order(data, ctx)

    } else {
        ctx.reply("Iltimos kuting...");
        request_create_order(data, ctx)


    }




};

// user comment conversation
async function comment_conversation(conversation, ctx){

    const comment_menu = new InlineKeyboard()
    .text("No comment", "no_comment");

   let comment_label = await ctx.reply(" 💬 Izoh yozing", {
        reply_markup: comment_menu
    });

    const msg = await conversation.wait();
    bot.api.deleteMessage(comment_label.chat.id, comment_label.message_id)
    // await msg.answerCallbackQuery();
    let client_id = ctx.session.freeStorage_db.client_id;
    let comment = msg?.message?.text || "No comment";
    let callback = ctx.session.session_db.callback_data
    let payload = {
        client_id,
        data:{
            comment, 
            callback,
        }
    }
    request_comment(msg, payload)
    return
}

async function request_comment(ctx, payload){

        const [info_err, info_res] = await Service.edit_rate(payload)
        if(!info_err){
            console.log(info_res.message);
            ctx.reply(info_res.message)
        }else{
            console.log(info_err);
            ctx.reply("⚠️ Server xatosi") 
        }

}

async function request_create_order(data, ctx) {
    const [info_err, order_list] = await Service.create_order({ data });

    if (!info_err) {
        ctx.reply("✅ Buyurtma qabul qilindi!")
    } else {
        ctx.reply("⚠️ " + info_err.response.data.message)
    }
}


 function checkLocation(ctx) {
    if (ctx.update.callback_query?.data == 'over_location') {
        ctx.answerCallbackQuery()
        return false
    } else {
        let loc =ctx.message?.location == undefined;
        return loc
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

function validate_number(ctx, conversation) {
    return isNaN(+ctx.message.text)
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
    .resized()



const user_phone_menu = new Keyboard()
    .requestContact("Telefon raqam")
    .resized();






const user_location_menu = new Menu("user_location_menu")
    .text("Xa", (ctx) => ctx.reply("Selected Xa"))
    .text("Yo'q", (ctx) => ctx.reply("Selected Yo'q"));
pm.use(user_location_menu);




pm.command("start", async (ctx) => {
    if (ctx.session.freeStorage_db.is_register) {
        await ctx.reply("<b>Asosiy menu</b>", {
            reply_markup: main_menu,
            parse_mode: "HTML",
        })
    } else {
        await ctx.conversation.enter("user_registretion");
    }
})





pm.hears("ℹ️ Ma'lumotlarim", async (ctx) => {
    let client_id = ctx.session.freeStorage_db.client_id;
    const [info_err, info_res] = await Service.user_info({ client_id })
    if (!info_err) {
        await ctx.reply("<b>Ism:</b> " + info_res.fullname + "\n<b>Hisob:</b> " + info_res.balance + " UZS" + "\n<b>Idish qarzlar:</b> " + info_res.container +
            "\n<b>Telefon raqam:</b> " + info_res.phone + "\n<b>Toza suv tashkiloti:</b> " + info_res.organization.name
            , {
                parse_mode: "HTML",
            })
    } else {
        ctx.reply("⚠️ Server xatosi")
    }


})





//clien order action menu
const my_order_details_menu = new Menu("my_order_details_menu");
pm.use(my_order_details_menu);
my_order_details_menu.dynamic(async (ctx, range) => {
    range
        .text("✏️ Tahrirlash", async (ctx) => {
            ctx.deleteMessage();
            await ctx.conversation.enter("edit_order_conversation");
        })
        .row()
        .text("🗑 O'chirish", async (ctx) => {
            ctx.deleteMessage();
            let order_id = ctx.session.session_db.select_product.id;
            const [info_err, info_res] = await Service.delete_orders({ order_id });
            if (!info_err) {
                ctx.reply("🗑 Muvofaqiyatli o'chirildi...");
            } else {
                ctx.reply("⚠️ Server xatosi")
            }
        })
        .row()
});


// client orders menu
const my_order_menu = new Menu("my_order_menu");
my_order_menu.dynamic(async (ctx, range) => {
    let products = await ctx.session.session_db.product_list
    products.forEach((item) => {
        range
            .text(item.product.name + " | " + item.product_count + " | " + "20-09-2023", (ctx) => {
                ctx.session.session_db.select_product = item;
                ctx.deleteMessage();

                ctx.reply("<b>Buyurtma</b>: \n"
                    + "<b>Turi</b>: " + item.product.name
                    + "\n<b>Soni</b>: " + item.product_count + " ta"
                    + "\n<b>Narxi</b>: " + item.price, {
                    reply_markup: my_order_details_menu,
                    parse_mode:"HTML"
                })


            })
            .row();
    });
});
pm.use(my_order_menu);




pm.hears("📑 Buyurtmalarim", async (ctx) => {
    let client_id = ctx.session.freeStorage_db.client_id;

    const [info_err, product_list] = await Service.orders({ client_id })
    if (!info_err) {
        ctx.session.session_db.product_list = product_list;
        await ctx.reply("📑 Buyurtmalarim", {
            reply_markup: my_order_menu
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
    ctx.reply("🚪 Profildan muvofaqiyatli ravishda chiqdingiz", {
        reply_markup: re_register,

    })
})






// client orders menu
const order_menu = new Menu("order_menu");
order_menu.dynamic(async (ctx, range) => {
    let orders_list = await ctx.session.freeStorage_db.order_list;
    orders_list.forEach((item) => {
        range
            .text(item.name + " | " + item.price + " UZB", (ctx) => {
                // ctx.deleteMessage();
                ctx.session.session_db.select_order = item;
                ctx.conversation.enter("create_order_count_conversation");
                ctx.answerCallbackQuery()
            })
            .row();
    });
});
pm.use(order_menu);









pm.hears('🛍 Mahsulotlar', async (ctx) => {
    let client_id = ctx.session.freeStorage_db.client_id;

    const [info_err, order_list] = await Service.client_products({ client_id })

    if (!info_err) {
        ctx.session.freeStorage_db.order_list = order_list;
        await ctx.reply("📑 Mahsulotlar", {
            reply_markup: order_menu
        });
    } else {

    }


})





// client order conversation










function check_callback(data){
    let key = data.split("_");
    if(key[0]=='water'){
        return true
    }else{
        false
    }
}

pm.command("test", (ctx)=>{
    ctx.reply("You call test");

    let string = 'water_rete_23';
    console.log(check_callback(string));

})







pm.on("callback_query:data", async (ctx) => {
   
    let data = ctx.callbackQuery.data;
    if (data== 'restart_login') {
        await ctx.conversation.enter("user_registretion");
        await ctx.answerCallbackQuery();
    }else if(check_callback(data)){
        console.log('request to server');
        await ctx.deleteMessage();
        ctx.session.session_db.callback_data = data;
        await ctx.conversation.enter("comment_conversation");
        await ctx.answerCallbackQuery();
    }
    
});


























bot.start();