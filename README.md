<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/letta-ai/letta/refs/heads/main/assets/Letta-logo-RGB_GreyonTransparent_cropped_small.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/letta-ai/letta/refs/heads/main/assets/Letta-logo-RGB_OffBlackonTransparent_cropped_small.png">
    <img alt="Letta logo" src="https://raw.githubusercontent.com/letta-ai/letta/refs/heads/main/assets/Letta-logo-RGB_GreyonOffBlack_cropped_small.png" width="500">
  </picture>
</p>

<div align="center">
  <h1>Letta Discord Bot Template</h1>
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
> You must have a Letta server running to use this template. Follow this [quickstart guide](https://docs.letta.com/quickstart) to run your local Letta server.

## ✨ Features

- 🧠 [Letta](https://github.com/letta-ai/letta)

  - Formerly known as **MemGPT**, Letta is an open-source framework designed for building **stateful LLM applications**. Our chatbot webapp template showcases powerful core features of Letta.

- 👾 [Discord.js](https://discord.js.org/)

  - Discord.js is a Node.js library that allows you to interact with the [Discord API](https://discord.com/developers/docs/intro), making it easy to build bot applications.

## 📦 What's included

- [Letta TypeScript SDK](https://github.com/letta-ai/letta-node)

  - The Letta TypeScript library provides convenient access to the Letta API.

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

## 🚀 Running the app locally

#### 🔸 Set up your local Letta server

Follow the [quickstart guide](https://docs.letta.com/quickstart) to run your local Letta server.
You can run your own Letta server using [Letta Desktop](https://docs.letta.com/quickstart/desktop) or [Docker](https://docs.letta.com/quickstart/docker).
By default, the Letta server will run on `http://localhost:8283`.

#### 🔸 Create your Discord app

1️⃣ Create a new Discord application [here](https://discord.com/developers/applications).

[screenshots]

#### 🔸 Setup and run the app

1️⃣ Clone the repository and install dependencies:

```bash
# Clone the repository
git clone git@github.com:letta-ai/letta-discord-bot-template.git

# Navigate to the project directory
cd letta-discord-bot-template

# Install dependencies
npm install

# Set environment variables
cp .env.template .env
```

2️⃣ Update the `.env` file with your Letta and Discord variables

3️⃣ Run the app

```bash
npm start
```

#### 🔸 Setup and run the app

### Environment variables

Environment variables can be controlled by setting them in your `.env` file or by setting them in your deployment environment.

The following environment variables can be set in the `.env` file:

* `LETTA_TOKEN`: Your personal access token for the Letta API.
* `LETTA_BASE_URL`: The base URL of your Letta server. This is usually `http://localhost:8283`.
* `LETTA_AGENT_ID`: The ID of the Letta agent to use for the bot.

* `APP_ID`: The ID of your Discord application.
* `DISCORD_TOKEN`: The bot token for your Discord bot.
* `PUBLIC_KEY`: The public key for your Discord bot.

* `PORT`: The port to run the app on. This is usually `3001`.

#### 🔸 See the app in action

Once the app is running, open your web browser and navigate to [http://localhost:3001](http://localhost:3001).


