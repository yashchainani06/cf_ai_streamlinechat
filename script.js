(function () {
     var chat = {
          messageToSend: '',
          init: function () {
               this.cacheDOM();
               this.bindEvents();
               this.render();
          },
          cacheDOM: function () {
               this.$chatHistory = $('.chat-history');
               this.$send = $('#send');
               this.$end = $('#end-chat');
               this.$logo = $('#logo');
               this.$textarea = $('#message-to-send');
               this.$title = $('title');
               this.$header = $('.chat-with');
               this.$chatHistoryList = this.$chatHistory.find('ol');
          },
          bindEvents: function () {
               this.$send.on('click', this.addMessage.bind(this));
               this.$end.on('click', this.endChat.bind(this));
               this.$textarea.on('keyup', this.addMessageEnter.bind(this));
          },
          render: function () {
               this.scrollToBottom();
               const storeid = (new URLSearchParams(window.location.search)).get("id");

               if (this.$chatHistoryList.find('li').length === 1) {
                    fetch('https://getdata.streamlinechat.com/', {
                         method: 'POST',
                         headers: {
                              'Content-Type': 'application/json'
                         },
                         body: JSON.stringify({ "store": storeid })
                    }).then((response) => {
                         return response.text();
                    }).then((text_response) => {
                         if (text_response === "null") {
                              this.$textarea.attr('placeholder', 'Store not found');
                         } else {
                              var storedata = JSON.parse(text_response);
                              this.$logo.attr('src', storedata.logo);
                              this.$title.text(storedata.name + " Support");
                              sessionStorage.setItem("chat", Math.floor((100000 + Math.random() * 900000)));
                              this.$header.html("<br> Chat with " + storedata.name);
                              var template = Handlebars.compile($("#message-response-template").html());
                              var context = {
                                   text: "Thank you for contacting " + storedata.name + "! Can we get your email address or phone number please? We will only use this information to contact you about your inquiry.",
                                   time: this.getCurrentTime(),
                              };
                              this.$chatHistoryList.append(template(context));
                              this.scrollToBottom();
                              this.$textarea.attr('placeholder', 'Enter your email');
                         }
                    });
               }

               if (this.$chatHistoryList.find('li').length == 2 && this.messageToSend.trim() !== '') {
                    var template = Handlebars.compile($("#message-template").html());
                    var context = {
                         text: this.messageToSend.trim(),
                         time: this.getCurrentTime(),
                    };

                    this.$chatHistoryList.append(template(context));
                    this.scrollToBottom();
                    this.$textarea.val('');

                    this.$textarea.attr('placeholder', 'Type your message here');

                    //response
                    var templateResponse = Handlebars.compile($("#message-response-template").html());
                    var contextResponse = {
                         text: "Great! How may we assist you? Please do not include sensitive information.",
                         time: this.getCurrentTime(),
                    };

                    setTimeout(function () {
                         this.$chatHistoryList.append(templateResponse(contextResponse));

                         this.scrollToBottom();
                    }.bind(this), 1000);

               } else if (this.messageToSend.trim() !== '' && this.$textarea.attr('placeholder') !== 'Chat ended') {
                    var template = Handlebars.compile($("#message-template").html());
                    var context = {
                         text: this.messageToSend.trim(),
                         time: this.getCurrentTime(),
                    };

                    this.$chatHistoryList.append(template(context));
                    this.scrollToBottom();
                    this.$textarea.val('');

                    const messages = [];

                    this.$chatHistoryList.find('li').each(function (index, element) {
                         // Access each item using the 'element' parameter
                         if ($(element).find('.message').hasClass('other-message')) {
                              messages.push({ "role": "user", "content": $(element).find('.message').text() });
                         } else if ($(element).find('.message').hasClass('my-message')) {
                              messages.push({ "role": "assistant", "content": $(element).find('.message').text() });
                         }
                    });

                    var chatid = sessionStorage.getItem("chat");

                    fetch('https://chatresponse.streamlinechat.com/', {
                         method: 'POST',
                         headers: {
                              'Content-Type': 'application/json'
                         },
                         body: JSON.stringify({ "messages": messages, "store": storeid, "done": false, "chat": chatid })
                    }).then((response) => {
                         // Check if the response is successful (status 200-299)
                         if (!response.ok) {
                              throw new Error('Network response was not ok');
                         }
                         return response.text();
                    }).then((textData) => {
                         // responses
                         var templateResponse = Handlebars.compile($("#message-response-template").html());
                         var contextResponse = {
                              text: JSON.parse(textData).message,
                              time: this.getCurrentTime(),
                         };

                         this.$chatHistoryList.append(templateResponse(contextResponse));

                         if (JSON.parse(textData).done) {
                              var templateDone = Handlebars.compile($("#message-response-template").html());
                              var contextDone = {
                                   text: "This chat has ended. We will get back to you within one business day. Please check your email/text messages, including the spam folder. If you have any other questions, please reload this page to open a new chat. Thank you!",
                                   time: this.getCurrentTime(),
                              };
                              this.$chatHistoryList.append(templateDone(contextDone));
                              this.$textarea.attr('placeholder', 'Chat ended');
                         }

                         this.scrollToBottom();
                         // Further processing, parsing, or displaying the text content
                    }).catch((error) => {
                         // Handle any errors that occurred during the fetch
                         console.error('Fetch Error:', error);
                    });



               }
          },

          addMessage: function () {
               this.messageToSend = this.$textarea.val();
               this.render();
          },
          endChat: function () {
               this.messageToSend = "End Chat";
               this.render();
          },
          addMessageEnter: function (event) {
               // enter was pressed
               if (event.keyCode === 13) {
                    this.addMessage();
               }
          },
          scrollToBottom: function () {
               this.$chatHistory.scrollTop(this.$chatHistory[0].scrollHeight);
          },
          getCurrentTime: function () {
               return new Date().toLocaleTimeString().
                    replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
          },
          getRandomItem: function (arr) {
               return arr[Math.floor(Math.random() * arr.length)];
          }

     };

     chat.init();
})();
