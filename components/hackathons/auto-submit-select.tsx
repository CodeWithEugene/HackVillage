"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * A <select> that submits its form as soon as the choice changes. Without
 * JavaScript it is a plain select and the form's search button submits it.
 */
export function AutoSubmitSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
