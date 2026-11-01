/**
 * Nova design system - Shell service.
 * Provides shell command execution.
 */

import { Injectable } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";

const exec = promisify(require("child_process").exec);

@Injectable()
export class ShellService {
  async execute(command: string): Promise<string> {
    const { stdout, stderr } = await exec(command);
    return stdout;
  }
}
