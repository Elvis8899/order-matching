import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Pagination from "@/components/shared/Pagination";
import { paginated } from "@/test/exchangeContext";

describe("Pagination", () => {
  const previous = () => screen.getByRole("button", { name: "Previous page" });
  const next = () => screen.getByRole("button", { name: "Next page" });

  it("Should hide itself when there is a single page", () => {
    const { container } = render(<Pagination state={paginated([], { pages: 1 })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("Should go to the next page from the first one", () => {
    const state = paginated([], { page: 0, pages: 3 });
    render(<Pagination state={state} />);

    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(previous()).toBeDisabled();
    fireEvent.click(next());
    expect(state.setPage).toHaveBeenCalledWith(1);
  });

  it("Should go to the previous page from the last one", () => {
    const state = paginated([], { page: 2, pages: 3 });
    render(<Pagination state={state} />);

    expect(next()).toBeDisabled();
    fireEvent.click(previous());
    expect(state.setPage).toHaveBeenCalledWith(1);
  });
});
