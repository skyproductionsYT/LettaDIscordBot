<a href="https://docs.letta.com/">
  <img alt="Stateful AI agent Discord chatbot template built with Letta" src="/assets/discord_chatbot_header_2x.png">
  <h1 align="center">Letta Discord Bot Example</h1>
</a>

<p align="center">
  Deploy your own AI chatbot using <a href="https://docs.letta.com/">Letta</a> to create agents that can learn over time.
</p>

<div align="center">
|
  <a href="#-features">Features</a> · 
  <a href="#-whats-included">What's included</a> · 
  <a href="#%EF%B8%8F-quickstart">Quickstart</a> · 
  <a href="#-running-the-app-locally">Running the app locally</a>
|
</div>

<div align="center">
<h3>One-click deploy with Railway</h3>
<a href="https://railway.com/template/C__ceE?referralCode=kdR8zc"><img src="https://railway.com/button.svg" alt="Deploy on Railway"/></a></div>
</div>

### 

> [!NOTE]
> You must have a Letta server running to use this app. Follow this [quickstart guide](https://docs.letta.com/quickstart) to run your local Letta server.

> [!NOTE]
> You must also have a Discord app to use this app. Follow these [instructions](#-create-your-discord-app-and-set-your-variables) to create your Discord app.

## ✨ Features

- 🧠 [Letta](https://github.com/letta-ai/letta)

  - Formerly known as **MemGPT**, Letta is an open-source framework designed for building **stateful LLM applications**. Our Discord bot example showcases powerful core features of Letta.

- Discord Bot

  - Interacts with your Discord server to send and receive messages.
    
    <img width="400" alt="image" src="https://github.com/user-attachments/assets/a09ce294-6cec-477f-ac60-f4b52493af67" />
  - Interacts with you through Direct Messages (DMs) and send and receive messages.
    
    <img width="400" alt="image" src="https://github.com/user-attachments/assets/0eabe8fa-556b-436f-9fbc-496f198ef482" />




## 📦 What's included

- [Letta TypeScript SDK](https://github.com/letta-ai/letta-node)

  - The Letta TypeScript library provides convenient access to the Letta API.

- [Discord.js](https://discord.js.org/)

  - Discord.js is a Node.js library that allows you to interact with the [Discord API](https://discord.com/developers/docs/intro), making it easy to build bot applications.

- [Express JS](https://expressjs.com)

  - Express JS is a minimal and flexible web framework for Node.js. We use Express to create a web server that accepts HTTP requests and interacts with the **Letta server** to generate responses. Express is also used to interact with the **Discord API**.

- [TypeScript](https://www.typescriptlang.org)

  - TypeScript enhances our codebase with **static typing, improved maintainability, and better developer tooling**, reducing potential runtime errors.


---

# ⚡️ Quickstart

### 📋 What you need before starting

- [Node.js](https://nodejs.org/en/download/)
- [npm](https://www.npmjs.com/get-npm)
- [Docker](https://docs.docker.com/get-docker/)
- [Discord App](https://discord.com/developers/applications)
- [LocalTunnel](https://github.com/localtunnel/localtunnel)

# 🚀 Running the app locally

## 💻 Set up your local Letta server

Follow the [quickstart guide](https://docs.letta.com/quickstart) to run your local Letta server.
You can run your own Letta server using [Letta Desktop](https://docs.letta.com/quickstart/desktop) or [Docker](https://docs.letta.com/quickstart/docker).
By default, the Letta server will run on `http://localhost:8283`.


## 👉 Set up app

1️⃣ Clone the repository and install dependencies:

```bash
# Clone the repository
git clone git@github.com:letta-ai/letta-discord-bot-example.git

# Navigate to the project directory
cd letta-discord-bot-example

# Install dependencies
npm install

# Set environment variables
cp .env.template .env
```

2️⃣ Update the `.env` file with your Letta variables


## 👾 Create your Discord app and set your variables

1️⃣ Create a new Discord application [here](https://discord.com/developers/applications).

<img width="475" alt="image" src="https://github.com/user-attachments/assets/b57ec05b-5381-43f4-afc4-824a84abdd55" />


2️⃣ Under `Settings` -> `General Information` of your Discord app, copy your Discord application's `Application ID` and `Public Key`, and paste them in your `.env` file.

<img width="1302" alt="image" src="https://github.com/user-attachments/assets/56e55a8e-6322-48a7-9b36-afbf538db359" />


3️⃣ Under `Settings` -> `Bot` of your Discord app, copy your Discord bot's `Token`, and paste it in your `.env` file.

<img width="1426" alt="image" src="https://github.com/user-attachments/assets/f3ba4098-c976-427c-8b3d-1811d93d2b71" />

4️⃣ Enable the Privileged Gateway Intents

<img width="1667" alt="image" src="https://github.com/user-attachments/assets/68978702-42d0-4630-9b83-56e3a7ce6e14" />

5️⃣ Under `Settings` -> `Installation`, under `Guild Install` set up `scopes` and `permissions`

<img width="1057" alt="image" src="https://github.com/user-attachments/assets/73921af7-7478-4b51-b388-ff30b9844d2f" />


6️⃣ Install Discord Bot on your server; copy and paste `Link` on your browser.

<img width="2130" alt="image" src="https://github.com/user-attachments/assets/c6e22db7-7bde-4d34-ab67-074ee5c048b0" />

### ⚙️ Environment variables

Environment variables can be controlled by setting them in your `.env` file or by setting them in your deployment environment.

The following environment variables can be set in the `.env` file:

* `LETTA_TOKEN`: The password of your Letta server (if you self-deployed a server). Not applicable if you are not using a password (see [docs](https://docs.letta.com/guides/server/docker#password-protection-advanced)).
* `LETTA_BASE_URL`: The base URL of your Letta server. This is usually `http://localhost:8283`.
* `LETTA_AGENT_ID`: The ID of the Letta agent to use for the bot.

* `APP_ID`: The ID of your Discord application.
* `DISCORD_TOKEN`: The bot token for your Discord bot.
* `PUBLIC_KEY`: The public key for your Discord bot.
* `DISCORD_CHANNEL_ID`: Set this if you want the bot to only respond to messages (listen) in a specific channel.

* `PORT`: The port to run the app on. Default is `3001`.

For more settings (including options to enable/disable DM interactions, reply to non-directed messages, etc.), view the [`.env.template`](/.env.template) file provided.

### 👾 Create your Letta agent

You can connect an existing agent to Discord (by using its `LETTA_AGENT_ID`), or you can create a brand new agent specifically to use as a Discord bot.

If you create a new agent, we'd recommend adding some information (e.g. inside of the `human` or `persona` memory block) that explains how to interact with Discord. For example, placing the following text in `human`:
```
I can use this space in my core memory to take notes on the users that I am interacting with.
So far, all I know that is that I am connected to a Discord server.
I can see messages that other users send on this server, as long as they are directed at me (with a mention or a reply).
I should also remember that if I want to "at" a user, I need to use the <@discord-id> format in my message response.
This will render the user tag in a dynamic way on Discord, vs any other reference to a user (eg their username) will just result in plaintext.
```

Additionally, if you would like to give your chatbot/agent the ability to "ignore" (not reply) to certain messages, you can add a custom tool like this to your agent (for information on how to add a custom tool, see [our docs](https://docs.letta.com/guides/agents/tools#custom-tools)):
```python
def ignore():
    """
    Not every message warrants a reply (especially if the message isn't directed at you). Call this tool to ignore the message.
    """
    return
```

The ability for an agent to "ignore" messages can be crucial if you connect your agent to an active Discord channel with many participants, especially if you set `RESPOND_TO_GENERIC` to `true` (in which case the agent will "see" every single message in a channel, even messages not directed at the agent itself).

## 🚀 Run app

```bash
npm start
```
