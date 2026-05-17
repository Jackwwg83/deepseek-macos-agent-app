// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App, runtimeAPIKeyStatusLabel } from "../embedded/chat/App";

function resetPreferences() {
  for (const key of ["deepseek-agent.autoAllowRules", "deepseek-agent.approvalPolicy", "deepseek-agent.tuiMode"]) {
    try {
      if (typeof window.localStorage.removeItem === "function") {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, "");
      }
    } catch {
      // Some test storage shims only implement part of the Web Storage API.
    }
  }
}

beforeEach(resetPreferences);

afterEach(() => {
  cleanup();
  resetPreferences();
});

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
  await screen.findByRole("heading", { name: "Thread Workbench" });
  return user;
}

describe("DeepSeek Agent TUI-aligned app interactions", () => {
  it("shows configured API key status for authenticated real runtime", () => {
    expect(runtimeAPIKeyStatusLabel({ mode: "real", authRequired: true, runtimeVersion: "0.8.37", appVersion: "0.1.0", capabilities: [] }, true)).toBe("Configured");
    expect(runtimeAPIKeyStatusLabel({ mode: "real", authRequired: true, runtimeVersion: "0.8.37", appVersion: "0.1.0", capabilities: [] }, false)).toBe("Required");
  });

  it("starts first-run setup in real mode and requires an API key before completion", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "First Run Setup" });

    expect(screen.getByRole("button", { name: "Enable Demo Mode" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByLabelText("DeepSeek API key")).toHaveProperty("placeholder", "Paste API key");
    expect(screen.queryByRole("button", { name: /need help/i })).toBeNull();
    expect(Array.from((screen.getByLabelText("Setup model") as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
    ]);
    expectDisabled(screen.getByRole("button", { name: /complete setup/i }));

    await user.clear(screen.getByLabelText("DeepSeek URL"));
    await user.type(screen.getByLabelText("DeepSeek URL"), "http://self-hosted.example:8000/v1");
    expect(screen.getByText(/HTTP endpoint is not encrypted/i)).toBeTruthy();
  });

  it("lets Browse choose a workspace folder during setup", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "First Run Setup" });

    expect(screen.getByLabelText("Workspace folder")).toHaveProperty("value", "~/DeepSeekAgent");
    await user.click(screen.getByRole("button", { name: "Browse" }));

    expect(await screen.findByDisplayValue("/Users/tester/DeepSeekAgent")).toBeTruthy();
  });

  it("lands on a thread-first workbench and removes old product workflow entries", async () => {
    await completeDemoSetup();

    expect(screen.getByRole("heading", { name: "Thread Workbench" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Project Command Center" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Review changes" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Automations" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Skills" })).toBeNull();
    expect(screen.queryByRole("button", { name: /commit/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /apply selected/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /demo workspace/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /close inspector/i })).toBeNull();
  });

  it("shows TUI mode, approval policy, workspace boundary, and runtime status", async () => {
    const user = await completeDemoSetup();

    expect(screen.getAllByText("Agent").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tool use with approvals/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approval policy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/suggest/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/workspace-write/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Runtime Settings" });
    await user.selectOptions(screen.getByLabelText("TUI mode"), "Plan");
    expect(screen.getAllByText(/Read-only investigation/i).length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText("Approval policy"), "never");
    expect(screen.getAllByText(/Blocks tools that are not safe/i).length).toBeGreaterThan(0);
  });

  it("streams a demo TUI tool flow and resolves allow once", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getByRole("button", { name: /new thread/i }));
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));

    expect(await screen.findByText("exec_shell")).toBeTruthy();
    expect(await screen.findByText("Run local verification")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /allow once/i }));

    expect(await screen.findByText(/Approval granted/i)).toBeTruthy();
    expect(await screen.findByText(/Tool result/i)).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /always allow/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^deny$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^stop$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /review changes/i })).toBeNull();
  });

  it("records a scoped always-allow rule in Demo Mode", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getByRole("button", { name: /new thread/i }));
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));
    expect(await screen.findByText("Run local verification")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /always allow in this workspace/i }));

    expect(await screen.findByText(/Always allow rule saved/i)).toBeTruthy();
    expect(screen.getByText(/exec_shell: bash scripts\/dev\/check.sh/i)).toBeTruthy();
    expect(screen.getByText("Approved")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /new thread/i }));
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));

    expect(await screen.findByText(/Auto-approved by saved workspace rule/i)).toBeTruthy();
    expect(await screen.findByText(/Approval granted/i)).toBeTruthy();
    expect(await screen.findByText(/Tool result/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
  });

  it("can deny or stop a pending approval without leaving approval buttons behind", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getByRole("button", { name: /new thread/i }));
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));
    expect(await screen.findByText("Run local verification")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^deny$/i }));

    expect(await screen.findByText(/Approval denied/i)).toBeTruthy();
    expect(screen.getByText("Denied")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /always allow/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^deny$/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: /new thread/i }));
    await user.click(await screen.findByRole("button", { name: /explain this project/i }));
    await user.click(screen.getByRole("button", { name: /send prompt/i }));
    await user.click(await screen.findByRole("button", { name: /^stop$/i }));

    expect(await screen.findByText("Stopped")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /allow once/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /always allow/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^deny$/i })).toBeNull();
  });

  it("opens runtime settings controls for endpoint, model, diagnostics, and key rotation", async () => {
    const user = await completeDemoSetup();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await screen.findByRole("heading", { name: "Runtime Settings" });
    expect(Array.from((screen.getByLabelText("Settings model") as HTMLSelectElement).options).map((option) => option.value)).toEqual([
      "deepseek-v4-flash",
      "deepseek-v4-pro",
    ]);
    await user.selectOptions(screen.getByLabelText("Settings model"), "deepseek-v4-pro");
    expect(screen.getByLabelText("Settings model")).toHaveProperty("value", "deepseek-v4-pro");
    await user.click(screen.getByRole("button", { name: /run diagnostics/i }));
    expect(await screen.findByText(/Diagnostics: ok/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /manage account/i })).toBeNull();
    await user.click(screen.getByRole("button", { name: /rotate key/i }));
    expect(await screen.findByRole("dialog", { name: /rotate api key/i })).toBeTruthy();
  });

  it("does not render fake macOS traffic lights inside the WebView shell", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "First Run Setup" });
    expect(document.querySelector(".traffic-lights")).toBeNull();
  });
});
