let chatbotPanel=null;
function openChatbotPanel(){if(currentPerson!=='Dueña')return;page='chatbot';selectedRepair=null;selectedGuide=null;render();scrollAppTop()}
function chatbotShortcut(){return `<section class="chatbot-shortcut"><span>${icon('help')}</span><div><strong>Chatbot de WhatsApp</strong><p>Configura las respuestas y la conexión del bot.</p></div>${button('Configurar chatbot','openChatbotPanel()',true,'orders')}</section>`}
function chatbotPage(){return `<button class="back-link" onclick="ownerNavigate('members')">← Equipo</button><div class="greeting"><h1>Chatbot de WhatsApp</h1><p class="sub">Configura las respuestas y la atención por WhatsApp.</p></div><div id="chatbot-slot"></div>`}
function mountChatbotPanel(){if(currentPerson!=='Dueña')return;chatbotPanel??=window.createRapicosturaChatbotPanel();document.getElementById('chatbot-slot').append(chatbotPanel.element);chatbotPanel.resume()}
function pauseChatbotPanel(lock=false){if(!chatbotPanel)return;if(lock)chatbotPanel.lock();else chatbotPanel.pause()}
