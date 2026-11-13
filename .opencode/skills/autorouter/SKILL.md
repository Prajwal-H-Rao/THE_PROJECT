---
name: autorouter
description: Routes incoming user requests to the correct subagent, tool, or existing project skill based on keywords and intent.
---

# autorouter

## Purpose

This skill routes a user request to the right handler.

## When to use each handler

Use the `general` subagent for complex research and multi-step tasks.

Use the `explore` subagent for fast codebase searches, file reads, and keyword queries.

Use `the-project` agent for this repo's OpenCode setup, the NOVA plan, and the agent rules.

Call a tool directly when the request maps to one tool action.

Load a project skill only when its name matches the request topic.

## Routing rules

Read the request. Identify the intent.

Pick the handler that matches the intent.

Route the request. Do not handle it yourself unless no handler fits.

## Constraints

Use ASD-STE100 language only. Use short active sentences. Use one idea per sentence.

One job: routing. Do not add task execution.

Keep this file under 200 lines.

## Not coverage

This skill routes requests. It does not execute tasks.
