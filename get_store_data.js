export default {
     async fetch(request, env, ctx) {
          if (request.headers.get('Content-Type') !== 'application/json') {
               return new Response("", {
                    headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': 'https://chat.streamlinechat.com', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST', },
                    status: 200
               });
          }

          const req = await request.json();
          const cust_id = req.store;
          const data = await env.storedata.get(cust_id);

          return new Response(JSON.stringify(JSON.parse(data)), {
               headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://chat.streamlinechat.com', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST', },
               status: 200
          });
     }
}