export default {
     async fetch(request, env, ctx) {
          if (request.headers.get('Content-Type') !== 'application/json') {
               return new Response("", {
                    headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': 'https://chat.streamlinechat.com', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST', },
                    status: 200
               });
          }

          const cur_messages = await request.json();
          const cust_id = cur_messages.store;
          const api_key = await env.storeapis.get(cust_id);
          const storedata = await JSON.parse(await env.storedata.get(cust_id));

          const system_prompt = "You are a customer service bot for a business called " + storedata.name + ". If the customer has not yet provided a valid email or phone number, prompt them to provide one so they can be contacted by the business. Here is a description of the business so you have some background info to use when helping the customer: " + storedata.description + " (End of business description; next part is your instructions) Prompt the customer for details about what they need help with. You should only respond to the customer's question if you are fully certain of the answer based on the context provided about the store. You are getting details in order to summarize the customer's request, and a human support agent will later use the summary to help the customer via email. When the customer is done sharing, let them know that they can press the End Chat button when they are done and the business will contact them. Make sure to be polite and not end the conversation abruptly. Also, ask enough questions to get good details but don't ask unnecessary questions. It should be a normal conversation. We don't have any context about the customer, so make sure you get information like phone number if the customer says to call/text. You should be speaking as if you are part of the store: do not say things like based on the context provided about the store. DO NOT HALLUCINATE. DO NOT MAKE UP FACTUAL INFO";
          // Define your request payload
          const orig_messages = {
               model: "gpt-4.1",
               // Add other parameters specific to your use case
               messages: [{ "role": "system", "content": system_prompt }, ...(cur_messages.messages)],
               temperature: 0.6,
          };

          // Make a request to the OpenAI API
          const openai_chat_response = await fetch('https://api.openai.com/v1/chat/completions', {
               method: 'POST',
               headers: {
                    'Authorization': api_key,
                    'Content-Type': 'application/json'
               },
               body: JSON.stringify(orig_messages)
          });

          // Process the OpenAI API response
          const chat_response = await openai_chat_response.json();

          const backup_messages = {
               messages: [{ "role": "system", "content": "Write a detailed summary of the customer's request, and all the information they have provided. This summary will be sent to and used by a human customer support agent at the store to assist the customer. You should not include pleasantries in your summary; just the details regarding the customer" }, ...(cur_messages.messages), { "role": "assistant", "content": chat_response.choices[0].message.content }],
               time: Math.round((new Date()).getTime() / (1000 * 60)),
               cust: cust_id,
               email: await env.storeemails.get(cust_id),
          }

          await env.messages.put(cur_messages.chat, JSON.stringify(backup_messages));

          const done_response = (cur_messages.messages[cur_messages.messages.length - 1].content.trim() === 'End Chat');
          if (done_response || cur_messages.done) {
               await env.storeusage.put(cust_id, 1 + parseInt(await (env.storeusage.get(cust_id))));
               await env.messages.delete(cur_messages.chat);

               const all_messages = {
                    model: "gpt-4.1",
                    // Add other parameters specific to your use case
                    messages: [{ "role": "system", "content": "Write a detailed summary of the customer's request, and all the information they have provided. This summary will be sent to and used by a human customer support agent at the store to assist the customer. You should not include pleasantries in your summary; just the details regarding the customer" }, ...(cur_messages.messages), { "role": "assistant", "content": chat_response.choices[0].message.content }],
                    temperature: 0.6,
               };

               const summary = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                         'Authorization': api_key,
                         'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(all_messages)
               });

               var store_email_message = "IMPORTANT: Create a new email thread to the customer with the email provided below. Do not reply to this thread.\n" + cur_messages.messages[1].content.trim() + "\n\nSummary:\n" + (await summary.json()).choices[0].message.content.trim() + "\n\nRaw Conversation:\n";

               for (const element of cur_messages.messages) { store_email_message += element.role.trim() + ": " + element.content.trim() + "\n" }
               store_email_message += "assistant: " + chat_response.choices[0].message.content.trim();

               await env.storeusage.put(cur_messages.chat, store_email_message);

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
                                   email: await env.storeemails.get(cust_id)
                              }
                         ],
                         subject: storedata.name + " Support Request #" + cur_messages.chat,
                         textContent: store_email_message,
                    })
               });
          }

          // Return the response
          return new Response(JSON.stringify({ "done": (done_response || cur_messages.done), "message": chat_response.choices[0].message.content, }), {
               headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://chat.streamlinechat.com', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST', },
               status: 200
          });
     }
}