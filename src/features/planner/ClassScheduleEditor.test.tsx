import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassScheduleEditor } from "./ClassScheduleEditor";

describe("ClassScheduleEditor", () => {
  it("copies a day's time to other checked days, leaving unchecked days alone", () => {
    render(
      <ClassScheduleEditor
        classId="class-1"
        className="Grade 6 ELA"
        color="amber"
        cycleLength={5}
        dayLabelScheme="numeric"
        hiddenInputName="slots"
        initialSlots={[]}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Day 1" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Day 2" }));

    const timeInputs = screen.getAllByDisplayValue("") as HTMLInputElement[];
    const [day1Start, day1End, day2Start, day2End] = timeInputs.filter(
      (input) => input.type === "time",
    );

    fireEvent.change(day1Start, { target: { value: "08:00" } });
    fireEvent.change(day1End, { target: { value: "08:50" } });

    expect(day2Start).toHaveValue("");
    expect(day2End).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Copy to other days" }));

    expect(day2Start).toHaveValue("08:00");
    expect(day2End).toHaveValue("08:50");
  });

  it("only shows the copy button once a day has both times set and another day is checked", () => {
    render(
      <ClassScheduleEditor
        classId="class-1"
        className="Grade 6 ELA"
        color="amber"
        cycleLength={5}
        dayLabelScheme="numeric"
        hiddenInputName="slots"
        initialSlots={[]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Copy to other days" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Day 1" }));

    expect(
      screen.queryByRole("button", { name: "Copy to other days" }),
    ).not.toBeInTheDocument();
  });
});
