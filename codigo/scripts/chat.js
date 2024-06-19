const URL = "http://localhost:3000/usuarios";

function getLoggedInUserId() {
    const userId = localStorage.getItem('loggedInUserId');
    console.log(userId);
    return userId ? userId : null;
}

async function getLoggedInUser() {
    const loggedInUserId = getLoggedInUserId();
    if (!loggedInUserId) return null;
    try {
        const response = await fetch(URL);
        if (!response.ok) {
            throw new Error('Erro na rede');
        }
        const data = await response.json();
        const loggedInUser = data.find(user => user.id === loggedInUserId);
        return loggedInUser;
    } catch (error) {
        console.error('Erro ao buscar usuário logado:', error);
        return null;
    }
}

async function fetchAndDisplayUsers() {
    try {
        const response = await fetch(URL);
        if (!response.ok) {
            throw new Error('Erro na rede');
        }
        const data = await response.json();

        if (!data || !Array.isArray(data)) {
            throw new Error('Data is undefined or not an array.');
        }

        const contactsContainer = document.getElementById('chat-contacts');
        contactsContainer.innerHTML = '';

        const loggedInUser = await getLoggedInUser();
        if (!loggedInUser) {
            throw new Error('Erro ao identificar usuário logado.');
        }

        const usuarios = data.filter(user => user.id !== loggedInUser.id);
        const sortedUsuarios = usuarios.sort((a, b) => {
            const aMessages = JSON.parse(localStorage.getItem(a.nome)) || [];
            const bMessages = JSON.parse(localStorage.getItem(b.nome)) || [];
            const aLastMessage = aMessages[aMessages.length - 1];
            const bLastMessage = bMessages[bMessages.length - 1];

            if (aMessages.some(m => m.sender === a.nome && !m.read)) return -1;
            if (bMessages.some(m => m.sender === b.nome && !m.read)) return 1;
            if (aLastMessage && bLastMessage) {
                return new Date(bLastMessage.timestamp) - new Date(aLastMessage.timestamp);
            }
            return 0;
        });

        sortedUsuarios.forEach(usuario => {
            const userDiv = document.createElement('div');
            userDiv.classList.add('chat-sidebar-user');
            userDiv.innerHTML = `
                <img src="${usuario.foto}" alt="${usuario.nome}" class="chat-sidebar-user-photo">
                <span class="chat-sidebar-user-name">${usuario.nome}</span>
                <i class="fas fa-circle new-message-indicator"></i>
            `;
            contactsContainer.appendChild(userDiv);

            const userMessages = JSON.parse(localStorage.getItem(usuario.nome)) || [];
            const hasUnreadMessages = userMessages.some(m => m.sender === usuario.nome && !m.read);
            const newMessageIndicator = userDiv.querySelector('.new-message-indicator');
            newMessageIndicator.style.marginLeft = '0.2rem';
            if (hasUnreadMessages) {
                newMessageIndicator.style.color = 'red';
                newMessageIndicator.style.display = 'inline';
            } else {
                newMessageIndicator.style.display = 'none';
            }

            userDiv.addEventListener('click', () => {
                showChatMainContent();
                updateChatHeader(usuario.nome, usuario.foto);
                displayMessages(usuario.nome);

                userMessages.forEach(m => {
                    if (m.sender === usuario.nome) {
                        m.read = true;
                    }
                });
                localStorage.setItem(usuario.nome, JSON.stringify(userMessages));
                newMessageIndicator.style.display = 'none';
            });
        });

    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
    }
}

function updateChatHeader(nome, foto) {
    const chatUserPhoto = document.getElementById('chat-user-photo');
    const chatUserName = document.getElementById('chat-user-name');

    chatUserPhoto.src = foto;
    chatUserName.textContent = nome;
}

function showChatMainContent() {
    const initialMessage = document.getElementById('initial-message');
    const chatMainContent = document.querySelector('.chat-main-content');

    initialMessage.style.display = 'none';
    chatMainContent.style.display = 'flex';
}

function showInitialMessage() {
    const initialMessage = document.getElementById('initial-message');
    const chatMainContent = document.querySelector('.chat-main-content');

    initialMessage.style.display = 'flex';
    chatMainContent.style.display = 'none';
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        showInitialMessage();
    }
});

window.addEventListener('load', fetchAndDisplayUsers);

async function sendMessage() {
    const messageInput = document.getElementById('chat-message-input');
    const messageContent = messageInput.value.trim();

    if (messageContent === '') {
        alert('Por favor, digite uma mensagem.');
        return;
    }

    const loggedInUser = await getLoggedInUser();
    const recipientUser = document.getElementById('chat-user-name').textContent;

    if (!loggedInUser || !recipientUser || recipientUser === loggedInUser.nome) {
        alert('Erro ao identificar usuários.');
        return;
    }

    const message = {
        sender: loggedInUser.nome,
        recipient: recipientUser,
        content: messageContent,
        timestamp: new Date().toISOString(),
        read: false
    };

    let recipientMessages = JSON.parse(localStorage.getItem(recipientUser)) || [];
    recipientMessages.push(message);
    localStorage.setItem(recipientUser, JSON.stringify(recipientMessages));

    let senderMessages = JSON.parse(localStorage.getItem(loggedInUser.nome)) || [];
    senderMessages.push(message);
    localStorage.setItem(loggedInUser.nome, JSON.stringify(senderMessages));

    appendMessage(message, loggedInUser.nome);

    messageInput.value = '';

    const chatMessages = document.getElementById('chat-messages');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    fetchAndDisplayUsers();
}

function appendMessage(message, currentUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');

    if (message.sender === currentUser) {
        messageElement.classList.add('me');
    } else {
        messageElement.classList.add('received');
    }

    messageElement.id = message.timestamp;

    messageElement.textContent = message.content;

    const chatMessages = document.getElementById('chat-messages');

    if (!document.getElementById(message.timestamp)) {
        chatMessages.appendChild(messageElement);
    }
}

async function displayMessages(selectedUser) {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';

    const loggedInUser = await getLoggedInUser();
    if (!loggedInUser) {
        alert('Erro ao identificar usuário logado.');
        return;
    }

    const loggedInUserMessages = JSON.parse(localStorage.getItem(loggedInUser.nome)) || [];
    const selectedUserMessages = JSON.parse(localStorage.getItem(selectedUser)) || [];

    const allMessages = loggedInUserMessages.concat(selectedUserMessages).filter(message =>
        (message.sender === loggedInUser.nome && message.recipient === selectedUser) ||
        (message.sender === selectedUser && message.recipient === loggedInUser.nome)
    );

    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    allMessages.forEach(message => {
        appendMessage(message, loggedInUser.nome);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

const sendButton = document.getElementById('chat-send-button');
sendButton.addEventListener('click', sendMessage);

const messageInput = document.getElementById('chat-message-input');
messageInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

function setupMobileChatInteraction() {
    const chatSidebar = document.querySelector('.chat-sidebar');
    const chatMainContent = document.querySelector('.chat-main-content');
    const chatSidebarUsers = document.querySelectorAll('.chat-sidebar-user');

    function showSelectedChatContent() {
        chatSidebar.style.display = 'none';
        chatMainContent.style.display = 'block';
    }

    function showChatSidebar() {
        chatSidebar.style.display = 'block';
        chatMainContent.style.display = 'none';
    }

    chatSidebarUsers.forEach(user => {
        user.addEventListener('click', () => {
            if (window.innerWidth <= 663) {
                showSelectedChatContent();
            }
        });
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (window.innerWidth <= 663) {
                showChatSidebar();
            }
        }
    });
}

setupMobileChatInteraction();
