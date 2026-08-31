import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoTip } from "./InfoTip";

describe("InfoTip", () => {
  it("keeps the note hidden until the (i) button is activated", () => {
    render(<InfoTip label="the lesson bank">Sort by unit to plan a sequence.</InfoTip>);

    expect(screen.queryByText(/Sort by unit/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More about the lesson bank" }));

    expect(screen.getByText(/Sort by unit/)).toBeInTheDocument();
  });

  it("exposes its open/closed state and the note itself to assistive tech", () => {
    render(<InfoTip label="pacing">Overloaded units have more lessons than class days.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "More about pacing" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("aria-describedby");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger.getAttribute("aria-describedby")).toBe(screen.getByRole("note").id);
  });

  it("is a real button, so it is reachable by keyboard rather than hover-only", () => {
    render(<InfoTip label="colors">Units take a shade of their class colour.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "More about colors" });
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(trigger);
    expect(screen.getByRole("note")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the (i) button", () => {
    render(<InfoTip label="colors">Units take a shade of their class colour.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "More about colors" });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes again when the (i) button is clicked a second time", () => {
    render(<InfoTip label="colors">Units take a shade of their class colour.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "More about colors" });
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
