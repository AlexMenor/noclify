#! /usr/bin/env node
import { spawnSync } from "node:child_process";

import { notifyTelegram } from "./telegram";

import { Command } from "commander";
import Conf from "conf";
import enquirer from "enquirer";

import packageJson from "./package.json";

const config = new Conf();
const CONFIG_KEY_NAME = "telegram-key-name";

const NOTIFY_THRESHOLD_MS = 4000;

function getConfigKey(): string | null {
  const configKey = config.get(CONFIG_KEY_NAME) as string;

  return configKey ?? null;
}

async function promptConfigKey(): Promise<string> {
  const response = await enquirer.prompt<{ configKey: string }>({
    type: "input",
    name: "configKey",
    message: "You haven't set your config key yet, please paste it here",
  });
  const { configKey } = response;
  config.set(CONFIG_KEY_NAME, configKey);

  return configKey;
}

const program = new Command();

program
  .name(packageJson.name)
  .description(
    "Get notified in telegram when a task has finished in your terminal"
  )
  .argument("<actual_command...>", "The command you want to execute")
  .passThroughOptions(true)
  .action(async (commandArr) => {
    const configKey = getConfigKey() ?? (await promptConfigKey());

    const actualCommand = commandArr.join(" ");
    const startTime = new Date();
    const result = spawnSync(actualCommand, { shell: true, stdio: "inherit" });
    const endTime = new Date();

    const durationInMs = endTime.valueOf() - startTime.valueOf();

    if (durationInMs < NOTIFY_THRESHOLD_MS) {
      console.log(
        `${actualCommand} executed in less than ${
          NOTIFY_THRESHOLD_MS / 1000
        }s, Telegram won't be notified`
      );
    } else {
      const error = !!result.status;

      await notifyTelegram(configKey, {
        error,
        command: actualCommand,
        durationInMs,
      });
    }
  });

program.parse();
