import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SelectField, TextAreaField, TextField } from "./ui";

afterEach(() => {
  cleanup();
});

describe("form fields", () => {
  it("links text field errors to the control", () => {
    render(<TextField error="Required" label="Email" />);

    const field = screen.getByLabelText("Email");
    const error = screen.getByText("Required");

    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAttribute("aria-describedby", error.id);
  });

  it("links textarea and select errors to their controls", () => {
    render(
      <>
        <TextAreaField error="Too short" label="Comment" />
        <SelectField error="Pick one" label="Status">
          <option value="">Select</option>
        </SelectField>
      </>
    );

    const textarea = screen.getByLabelText("Comment");
    const textareaError = screen.getByText("Too short");
    const select = screen.getByLabelText("Status");
    const selectError = screen.getByText("Pick one");

    expect(textarea).toHaveAttribute("aria-describedby", textareaError.id);
    expect(select).toHaveAttribute("aria-describedby", selectError.id);
  });
});
