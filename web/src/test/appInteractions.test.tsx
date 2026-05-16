// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App, runtimeAPIKeyStatusLabel } from "../embedded/chat/App";

afterEach(() => cleanup());

function expectDisabled(control: HTMLElement) {
  expect(control).toBeInstanceOf(HTMLButtonElement);
  expect((control as HTMLButtonElement).disabled).toBe(true);
}

async function completeDemoSetup() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "First Run Setup" });
  await user.click(screen.getByRole("button", { name: "Enable Demo Mode" }));
  await user.click(screen.getByRole("button", { name: /complete setup/i }));
  await screen.findByRole("heading", { name: "Project Command Center" });
  return user;
}

describe("DeepSeek Agent app interactions", () => {
  it("shows configured API key status for authenticated real runtime", () => {
    expect(runtimeAPIKeyStatusLabel({ mode: "real", authRequired: true, runtimeVersion: "0.8.37", appVersion: "0.1.0", capabilities: [] }, true)).toBe("Configured");
    expect(runtimeAPIKeyStatusLabel({ mode: "real", authRequired: true, runtimeVersion: "0.8.37", appVersion: "0.1.0", capabilities: [] }, false)).toBe("Required");
  });

  it("starts first-run setup in real mode and requires an API key before completion", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "First Run Setup" });

    expect(screen.getByRole("button", { name: "Enable Demo Mode" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByLabelText("DeepSeek API key")).toHaveProperty("placeholder", "Paste API key");
    expect(Array.from((screen.getByLabelText("Setup model") as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
    ]);
    expectDisabled(screen.getByRole("button", { name: /complete setup/i }));
  });

  it("does not render fake macOS traffic lights inside the WebView shell", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "First Run Setup" });

    expect(document.querySelector(".traffic-lights")).toBeNull();
  });

  it("starts demo mode without an API key and shows a real new-chat starter state", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getAllByRole("button", { name: /new thread/i })[0]);
    expect((await screen.findAllByRole("heading", { name: "New chat" })).length).toBeGreaterThan(0);

    expect(screen.getByText("Explain this project")).toBeTruthy();
    expect(screen.getByText("Find risky changes")).toBeTruthy();
    expectDisabled(screen.getByRole("button", { name: /send prompt/i }));
    expect(screen.queryByRole("heading", { name: "Terminal" })).toBeNull();
    expect(screen.queryByText(/Inspect this workspace and show how setup/i)).toBeNull();
  });

  it("opens settings controls for diagnostics and API key rotation", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Settings & Usage" });
    expect(Array.from((screen.getByLabelText("Settings model") as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
    ]);
    await user.selectOptions(screen.getByLabelText("Settings model"), "deepseek-v4-pro");
    expect(screen.getByLabelText("Settings model")).toHaveProperty("value", "deepseek-v4-pro");
    await user.click(screen.getByRole("button", { name: "Code suggestions" }));
    expect(screen.getByRole("button", { name: "Code suggestions" }).getAttribute("aria-pressed")).toBe("false");
    await user.click(screen.getByRole("button", { name: /run diagnostics/i }));
    expect(await screen.findByText(/Diagnostics: ok/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /rotate key/i }));
    expect(await screen.findByRole("dialog", { name: /rotate api key/i })).toBeTruthy();
  });

  it("opens Automations and Skills skeleton pages with disabled future actions", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getByRole("button", { name: "Automations" }));
    expect(await screen.findByRole("heading", { name: "Automations" })).toBeTruthy();
    expect(screen.getByText(/Automations are not configured yet/i)).toBeTruthy();
    expectDisabled(screen.getByRole("button", { name: /new automation/i }));

    await user.click(screen.getByRole("button", { name: "Skills" }));
    expect(await screen.findByRole("heading", { name: "Skills" })).toBeTruthy();
    expect(screen.getByText(/No skills installed yet/i)).toBeTruthy();
    expectDisabled(screen.getByRole("button", { name: /import skill/i }));
  });

  it("shows a no-change review state for a fresh thread and disables zero-file actions", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getAllByRole("button", { name: /new thread/i })[0]);
    expect((await screen.findAllByRole("heading", { name: "New chat" })).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /review changes/i }));

    expect((await screen.findAllByText("No changes yet")).length).toBeGreaterThan(0);
    screen.getAllByRole("button", { name: /open in editor/i }).forEach(expectDisabled);
    screen.getAllByRole("button", { name: /apply selected/i }).forEach(expectDisabled);
    screen.getAllByRole("button", { name: /reject selected/i }).forEach(expectDisabled);
    screen.getAllByRole("button", { name: /commit 0 files/i }).forEach(expectDisabled);

    await waitFor(() => expect(screen.getAllByText(/Start an agent turn/i).length).toBeGreaterThan(0));
  });

  it("streams a demo turn and resolves the approval card from a fresh thread", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getAllByRole("button", { name: /new thread/i })[0]);
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));

    expect(await screen.findByText("Run local verification")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /allow/i }));

    expect(await screen.findByText(/Approval granted/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^deny$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /stop task/i })).toBeNull();
    expect(screen.getByText("Approved")).toBeTruthy();
  });

  it("can deny or stop a pending approval without leaving approval buttons behind", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getAllByRole("button", { name: /new thread/i })[0]);
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));
    expect(await screen.findByText("Run local verification")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^deny$/i }));

    expect(await screen.findByText(/Approval denied/i)).toBeTruthy();
    expect(screen.getByText("Denied")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^deny$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /stop task/i })).toBeNull();

    await user.click(screen.getAllByRole("button", { name: /new thread/i })[0]);
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));
    await user.click(await screen.findByRole("button", { name: /stop task/i }));

    expect(await screen.findByText("Stopped")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^deny$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /stop task/i })).toBeNull();
  });

  it("turns a demo response into reviewable files with apply, reject, and commit state", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getAllByRole("button", { name: /new thread/i })[0]);
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));
    await user.click(await screen.findByRole("button", { name: /allow once/i }));
    await user.click(screen.getByRole("button", { name: /review changes/i }));

    expect((await screen.findAllByText("web/src/embedded/chat/App.tsx")).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /select web\/src\/embedded\/chat\/App.tsx/i }));
    await user.click(screen.getAllByRole("button", { name: /apply selected/i })[0]);

    expect((await screen.findAllByText(/Accepted 1 file/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /commit 1 file/i }).some((button) => !(button as HTMLButtonElement).disabled)).toBe(true);

    await user.click(screen.getByRole("button", { name: /select web\/src\/bridge\/FakeAgentBridge.ts/i }));
    await user.click(screen.getAllByRole("button", { name: /reject selected/i })[0]);
    expect((await screen.findAllByText(/Rejected 1 file/i)).length).toBeGreaterThan(0);
  });
});
