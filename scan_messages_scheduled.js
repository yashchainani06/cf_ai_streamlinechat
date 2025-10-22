export default {
     async scheduled(event, env, ctx) {
          ctx.waitUntil(checkMessages(env));
     },
};

async function checkMessages(env) {
     const chatids = await env.messages.list();
     const curtime = Math.round((new Date()).getTime() / (1000 * 60));
     for (const chatid of chatids.keys) {
          const cur_messages = await env.messages.get(chatid.name);
          const json_messages = await JSON.parse(cur_messages);

          if (curtime - json_messages.time >= 10) {
               await env.messages.delete(chatid.name);
               await env.storeusage.put(json_messages.cust, 1 + parseInt(await (env.storeusage.get(json_messages.cust))));
               const storedata = await JSON.parse(await env.storedata.get(json_messages.cust));

               const all_messages = {
                    model: "gpt-4.1",
                    messages: json_messages.messages,
                    temperature: 0.6,
               };

               const summary = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                         'Authorization': await env.storeapis.get(json_messages.cust),
                         'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(all_messages)
               });

               var store_email_message = "IMPORTANT: Create a new email thread to the customer with the email provided below. Do not reply to this thread.\n" + json_messages.messages[2].content.trim() + "\n\nSummary:\n" + (await summary.json()).choices[0].message.content.trim() + "\n\nRaw Conversation:\n";
               for (const element of json_messages.messages) { if (element.role !== 'system') { store_email_message += element.role.trim() + ": " + element.content.trim() + "\n" } }
               await env.storeusage.put(chatid.name, store_email_message);

               // Send Email
               const response2 = await fetch("https://api.brevo.com/v3/smtp/email", {
                    method: "POST",
                    headers: {
                         "Content-Type": "application/json",
                         "Accept": "application/json",
                         "api-key": "<Insert Brevo API Key>"
                    },
                    body: JSON.stringify({
                         sender: {
                              name: "Streamline Chat",
                              email: "noreply@streamlinechat.com"
                         },
                         to: [
                              {
                                   email: await env.storeemails.get(json_messages.cust)
                              }
                         ],
                         subject: storedata.name + " Support Request #" + chatid.name,
                         textContent: store_email_message
                    })
               });
          }
     }
}