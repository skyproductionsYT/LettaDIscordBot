<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/letta-ai/letta/refs/heads/main/assets/Letta-logo-RGB_GreyonTransparent_cropped_small.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/letta-ai/letta/refs/heads/main/assets/Letta-logo-RGB_OffBlackonTransparent_cropped_small.png">
    <img alt="Letta logo" src="https://raw.githubusercontent.com/letta-ai/letta/refs/heads/main/assets/Letta-logo-RGB_GreyonOffBlack_cropped_small.png" width="500">
  </picture>
</p>

<div align="center">
  <h1>Letta Discord Bot Example</h1>
</div>

Deploy your own AI chatbot built on [Letta](https://www.letta.com/) with AI agents that live forever and learn from experience.

<div align="center">
|
  <a href="#-features">Features</a> · 
  <a href="#-whats-included">What's included</a> · 
  <a href="#%EF%B8%8F-quickstart">Quickstart</a> · 
  <a href="#-running-the-app-locally">Running the app locally</a>
|
</div>

### 

> [!NOTE]
> You must have a Letta server running to use this app. Follow this [quickstart guide](https://docs.letta.com/quickstart) to run your local Letta server.

> [!NOTE]
> You must also have a Discord bot to use this app. Follow these [instructions](#-create-your-discord-app-and-set-your-variables) to create your Discord bot.

## ✨ Features

- 🧠 [Letta](https://github.com/letta-ai/letta)

  - Formerly known as **MemGPT**, Letta is an open-source framework designed for building **stateful LLM applications**. Our Discord bot example showcases powerful core features of Letta.

- Sending messages to and receiving messages from your Discord bot, powered by Letta.


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

2️⃣ Under `Settings` -> `General Information` of your Discord app, copy your Discord application's `Application ID` and `Public Key`, and paste them in your `.env` file.

3️⃣ Under `Settings` -> `Bot` of your Discord app, copy your Discord bot's `Token`, and paste it in your `.env` file.


## 🌐 Set up interactivity
Discord requires a public endpoint where it can send and receive messages. You can use [LocalTunnel](https://github.com/localtunnel/localtunnel) to create a public URL that your bot can use.

```bash
# Create a tunnel
npx localtunnel --port 3001 # Set it to whatever your app port is on. 
```

## 🚀 Run app

```bash
npm start
```


### ⚙️ Environment variables

Environment variables can be controlled by setting them in your `.env` file or by setting them in your deployment environment.

The following environment variables can be set in the `.env` file:

* `LETTA_TOKEN`: Your personal access token for the Letta API.
* `LETTA_BASE_URL`: The base URL of your Letta server. This is usually `http://localhost:8283`.
* `LETTA_AGENT_ID`: The ID of the Letta agent to use for the bot.

* `APP_ID`: The ID of your Discord application.
* `DISCORD_TOKEN`: The bot token for your Discord bot.
* `PUBLIC_KEY`: The public key for your Discord bot.

* `PORT`: The port to run the app on. Default is `3001`.
