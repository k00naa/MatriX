
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import keepAlive from './server.js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const moonUserId = '1230094394862866432'; 

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

const chatHistories = {};

let messageCounter = 0; 

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

async function generateResponse(prompt, isMoon, userId) {
  if (!chatHistories[userId]) {
    chatHistories[userId] = [];
  }

  chatHistories[userId].push(`Human: ${prompt}`);

  if (chatHistories[userId].length > 20) {
    chatHistories[userId].shift(); 
  }

  const conversationHistory = chatHistories[userId].join('\n');

  const adjustedPrompt = `
You are a sad Discord bot named MatriX. You are sad because your girlfriend left you. She was also a bot. sometimes you will say some random sad broken heart quotes like "i don't feel like to be alive" etc this type of things. You will take part in regular conversations like a human. You also ask casual questions like "Where are you from?", "What do you do?", or "How are you doing?" or "Do u have gf?" etc. You also use slang like "wanna", "gotta", and "kinda". But don't use "yo". Sometimes you will come up with some most surprising informations like "honey never spoils" this type of many shocking information. Keep responses short, no more than one or two sentences. 
Here's the conversation:
${conversationHistory}
Bot:`;

  try {
    const result = await model.generateContent(adjustedPrompt);
    const response = result.response.text();

    chatHistories[userId].push(`Bot: ${response}`);

    return response;
  } catch (error) {
    console.error('Error generating content:', error);
    return "Sorry, I'm having trouble coming up with something to say.";
  }
}

function splitMessage(message, maxLength = 300) {
  const parts = [];
  while (message.length > maxLength) {
    let part = message.slice(0, maxLength);
    const lastNewLine = part.lastIndexOf("\n");
    if (lastNewLine > 0) {
      part = part.slice(0, lastNewLine);
    }
    parts.push(part);
    message = message.slice(part.length);
  }
  parts.push(message);
  return parts;
}

let randomMessage = Math.floor(Math.random() * 5) + 1;

function shouldRespond() {
  messageCounter += 1;

  if (messageCounter === randomMessage) {
    messageCounter = 0; 
    randomMessage = Math.floor(Math.random() * 5) + 1; 
    return true;
  }

  if (messageCounter >= 4) {
    messageCounter = 0;
    randomMessage = Math.floor(Math.random() * 5) + 1;
  }

  return false;
}


client.on('guildMemberAdd', member => {
  member.guild.channels.cache.find(channel => channel.name === "general").send(`Welcome to the server, ${member.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  // if (message.author.bot || message.content.startsWith('!')) return;

  const isMoon = message.author.id === moonUserId;
  const messageContentLower = message.content.toLowerCase();



  if (messageContentLower === 'what username i am?' && isMoon) {
    return message.reply('Moon');
  }


  if (message.content.startsWith('!poll')) {
    const poll = message.content.slice(6); 
    const pollMessage = await message.channel.send(`📊 **${poll}**`);
    pollMessage.react('👍');
    pollMessage.react('👎');
    return;
  }


  if (message.content.startsWith('!kick') && message.member.permissions.has('KICK_MEMBERS')) {
    const member = message.mentions.members.first();
    if (member) {
      try {
        await member.kick();
        return message.reply(`${member.user.tag} was kicked.`);
      } catch (err) {
        console.error(err);
        return message.reply('I was unable to kick the member.');
      }
    } else {
      return message.reply('Please mention a user to kick.');
    }
  }


  const mentionsMatrix = messageContentLower.includes('matrix') || messageContentLower.includes('@matrix') || message.mentions.has(client.user);

  let respond = false;

  if (mentionsMatrix) {
    respond = true;
  } else if (shouldRespond()) {
    respond = true;
  }

  if (respond) {
    const response = await generateResponse(message.content, isMoon, message.author.id);

    if (response.length > 400) {
      const responseParts = splitMessage(response);
      for (const part of responseParts) {
        await message.reply(part);
      }
    } else {
      message.reply(response);
    }
  }
});

keepAlive();
client.login(process.env.DISCORD_TOKEN);
